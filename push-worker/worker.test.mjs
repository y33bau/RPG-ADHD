import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { encrypt, due, runSchedule, getVapid } from './worker.js';

const kv = () => { const m = new Map(); return { m, get: async (k, t) => m.has(k) ? (t === 'json' ? JSON.parse(m.get(k)) : m.get(k)) : null, put: async (k, v) => m.set(k, v), delete: async k => m.delete(k), list: async ({ prefix }) => ({ keys: [...m.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }) }; };
const env = () => ({ KV: kv(), API_TOKEN: 'x'.repeat(30), VAPID_SUBJECT: 'mailto:a@b.pl' });
const b64u = b => Buffer.from(b).toString('base64url');
const schedule = { enabled: true, water: true, work: true, start: 9, end: 19, waterEvery: 60, workEvery: 180, weekdays: false, zone: 'Europe/Warsaw' };

test('encrypted payload can be decrypted by the receiver (RFC 8291)', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)), auth = crypto.getRandomValues(new Uint8Array(16));
  const body = await encrypt('Cześć świecie', { p256dh: b64u(uaPublic), auth: b64u(auth) });
  const salt = body.slice(0, 16), asPublic = body.slice(21, 86), cipher = body.slice(86);
  const hk = async (s, ikm, info, n) => new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8));
  const te = new TextEncoder();
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []) }, pair.privateKey, 256));
  const cat = (...a) => Uint8Array.from(a.flatMap(x => [...x]));
  const prk = await hk(auth, secret, cat(te.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const cek = await hk(salt, prk, te.encode('Content-Encoding: aes128gcm\0'), 16), nonce = await hk(salt, prk, te.encode('Content-Encoding: nonce\0'), 12);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']), cipher));
  assert.equal(new TextDecoder().decode(plain.slice(0, -1)), 'Cześć świecie');
  assert.equal(plain.at(-1), 2);
});

test('schedule fires once per window and respects hydration', () => {
  const at = new Date('2026-11-18T10:02:00+01:00').getTime();
  assert.deepEqual(due(schedule, {}, at, null).map(x => x.kind), ['water']);
  assert.deepEqual(due(schedule, {}, at, '2026-11-18'), []);
  assert.deepEqual(due(schedule, { '2026-11-18:water:600': true }, at, null), []);
  assert.deepEqual(due({ ...schedule, weekdays: true }, {}, new Date('2026-11-21T10:02:00+01:00').getTime(), null), []);
});

test('API needs the token, stores a subscription and cron sends once', async () => {
  const e = env(), call = (path, body, token = e.API_TOKEN) => worker.fetch(new Request('https://w.test' + path, { method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + token, Origin: 'https://y33bau.github.io' }, body: body && JSON.stringify(body) }), e);
  assert.equal((await call('/vapid-public-key', null, 'zly')).status, 401);
  const key = await (await call('/vapid-public-key')).json();
  assert.equal(unb(key.publicKey).length, 65);
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const sub = { endpoint: 'https://push.example/abc', keys: { p256dh: b64u(await crypto.subtle.exportKey('raw', pair.publicKey)), auth: b64u(crypto.getRandomValues(new Uint8Array(16))) } };
  assert.equal((await call('/subscribe', { deviceId: 'device-12345', app: 'adhd', subscription: sub, schedule })).status, 200);
  assert.equal((await call('/subscribe', { deviceId: 'device-12345', subscription: sub, schedule: { ...schedule, start: 20 } })).status, 400);
  const calls = []; globalThis.fetch = async (u, o) => { calls.push([u, o]); return new Response(null, { status: 201 }); };
  const now = new Date('2026-11-18T10:01:00+01:00').getTime();
  assert.equal(await runSchedule(e, now), 1);
  assert.equal(await runSchedule(e, now + 60000), 0);
  assert.match(calls[0][1].headers.Authorization, /^vapid t=.+, k=/);
  await getVapid(e);
});
const unb = s => Buffer.from(s, 'base64url');
