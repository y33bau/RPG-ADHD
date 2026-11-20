import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import worker, { encrypt, vapidHeader, runSchedule } from './worker.js';

const b64u = b => Buffer.from(b).toString('base64url');
const kv = () => { const m = new Map(); return { m, get: async (k, t) => m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null, put: async (k, v) => m.set(k, v), delete: async k => m.delete(k), list: async ({ prefix }) => ({ keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) }; };
function env() {
  const ecdh = nodeCrypto.createECDH('prime256v1'); ecdh.generateKeys(); // same raw key format web-push produces
  return { SUBSCRIPTIONS: kv(), PUSH_ACCESS_TOKEN: 'x'.repeat(30), ALLOWED_ORIGIN: 'https://y33bau.github.io', VAPID_PUBLIC_KEY: ecdh.getPublicKey('base64url'), VAPID_PRIVATE_KEY: ecdh.getPrivateKey('base64url'), VAPID_SUBJECT: 'https://y33bau.github.io/RPG-ADHD/' };
}
const schedule = { enabled: true, water: true, work: true, start: 9, end: 19, waterEvery: 60, workEvery: 180, weekdays: false, zone: 'Europe/Warsaw', push: true };

test('encrypted payload can be decrypted by the receiver (RFC 8291)', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)), auth = crypto.getRandomValues(new Uint8Array(16));
  const body = await encrypt('Cześć świecie', { p256dh: b64u(uaPublic), auth: b64u(auth) });
  const salt = body.slice(0, 16), asPublic = body.slice(21, 86), cipher = body.slice(86);
  const hk = async (s, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const te = new TextEncoder(), cat = (...a) => Uint8Array.from(a.flatMap(x => [...x]));
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []) }, pair.privateKey, 256));
  const prk = await hk(auth, secret, cat(te.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hk(salt, prk, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hk(salt, prk, te.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cipher));
  assert.equal(new TextDecoder().decode(plain.slice(0, -1)), 'Cześć świecie');
});

test('VAPID JWT made from raw secret keys verifies with the public key', async () => {
  const e = env(), header = await vapidHeader(e, 'https://web.push.apple.com/x');
  const [h, c, s] = header.split(',')[0].replace('vapid t=', '').split('.');
  const pub = Buffer.from(e.VAPID_PUBLIC_KEY, 'base64url');
  const key = nodeCrypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33)) }, format: 'jwk' });
  assert.ok(nodeCrypto.verify('sha256', Buffer.from(h + '.' + c), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url')));
  assert.equal(JSON.parse(Buffer.from(c, 'base64url')).aud, 'https://web.push.apple.com');
});

test('API needs origin and token, stores a subscription, tests it and cron sends once', async () => {
  const e = env(), call = (path, body, token = e.PUSH_ACCESS_TOKEN, origin = 'https://y33bau.github.io') => worker.fetch(new Request('https://w.test' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, Origin: origin }, body: body && JSON.stringify(body) }), e);
  assert.equal((await call('/vapid-public-key', null, e.PUSH_ACCESS_TOKEN, 'https://evil.test')).status, 403);
  assert.equal((await call('/vapid-public-key', null, 'zly-klucz-zly-klucz-zly-klucz')).status, 401);
  assert.equal((await (await call('/vapid-public-key')).json()).publicKey, e.VAPID_PUBLIC_KEY);
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const sub = { endpoint: 'https://web.push.apple.com/abc', keys: { p256dh: b64u(await crypto.subtle.exportKey('raw', pair.publicKey)), auth: b64u(crypto.getRandomValues(new Uint8Array(16))) } };
  const deviceId = '0f0e0d0c-0b0a-4908-8706-050403020100';
  assert.equal((await call('/subscribe', { deviceId, app: 'adhd', subscription: sub, schedule })).status, 200);
  const calls = []; globalThis.fetch = async (u, o) => { calls.push([u, o]); assert.equal(o.redirect, 'manual'); return new Response(null, { status: 201 }); };
  assert.equal((await call('/test', { deviceId })).status, 200);
  const now = new Date('2026-11-18T10:01:00+01:00').getTime();
  assert.equal(await runSchedule(e, now), 1);
  assert.equal(await runSchedule(e, now + 60000), 0);
  assert.match(calls[0][1].headers.Authorization, /^vapid t=.+, k=/);
  globalThis.fetch = async () => new Response(null, { status: 410 });
  assert.equal((await call('/test', { deviceId })).status, 410);
  assert.equal(e.SUBSCRIPTIONS.m.size, 0);
});
