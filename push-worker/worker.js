// SYNAPSE push service (Cloudflare Worker "agent-synapse-push").
// This is the version deployed on 2026-11-20. It uses only WebCrypto: VAPID (RFC 8292) and
// payload encryption (RFC 8291, aes128gcm). The earlier build bundled the Node "web-push" library
// and passed redirect: "error" to fetch, which Workers reject, so no notification was ever sent.
// Stores only: device id, push subscription and reminder schedule (no tasks, no contacts).
import { localClock, dueReminders, validateReminders, reminderMessage } from '../notification-core.js';

export const APPS = { adhd: '/RPG-ADHD/', agent: '/agent/' };
const te = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const concat = (...a) => { const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };

async function hkdf(salt, ikm, info, bytes) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bytes * 8));
}

/** VAPID JWT signed with the raw base64url keys stored as secrets (same format web-push generates). */
export async function vapidHeader(env, endpoint, now = Date.now()) {
  const pub = unb64u(env.VAPID_PUBLIC_KEY);
  const jwk = { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE_KEY.replace(/=+$/, ''), x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1e3) + 12 * 3600, sub: env.VAPID_SUBJECT })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(head + '.' + claims));
  return 'vapid t=' + head + '.' + claims + '.' + b64u(sig) + ', k=' + env.VAPID_PUBLIC_KEY.replace(/=+$/, '');
}

export async function encrypt(text, keys) {
  const uaPublic = unb64u(keys.p256dh), authSecret = unb64u(keys.auth);
  const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, pair.privateKey, 256));
  const prk = await hkdf(authSecret, secret, concat(te.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, prk, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, prk, te.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(te.encode(text), new Uint8Array([2]))));
  return concat(salt, new Uint8Array([0, 0, 16, 0, asPublic.length]), asPublic, cipher);
}

export async function send(env, entry, message) {
  const endpoint = entry.subscription.endpoint;
  const body = await encrypt(JSON.stringify({ ...message, url: 'https://y33bau.github.io' + APPS[entry.app] }), entry.subscription.keys);
  // Workers only accept redirect "follow" or "manual".
  const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: await vapidHeader(env, endpoint), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '300', Urgency: 'normal' }, body, redirect: 'manual' });
  if ([404, 410].includes(response.status)) return 'expired';
  if (!response.ok) throw Error('Push delivery failed (' + response.status + ') ' + (await response.text()).slice(0, 80));
  return 'sent';
}

async function digest(value) { return new Uint8Array(await crypto.subtle.digest('SHA-256', te.encode(value))); }
async function authorized(request, env) {
  const expected = env.PUSH_ACCESS_TOKEN || '';
  if (expected.length < 24) return false;
  const a = await digest((request.headers.get('Authorization') || '').replace(/^Bearer /, '')), b = await digest(expected);
  let mismatch = 0; for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}
function validEndpoint(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || (u.port && u.port !== '443') || u.username || u.password) return false;
    return ['fcm.googleapis.com', 'push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com'].some(d => u.hostname === d || u.hostname.endsWith('.' + d));
  } catch { return false; }
}
const validSubscription = sub => sub && validEndpoint(sub.endpoint) && /^[A-Za-z0-9_-]{80,100}$/.test(sub.keys?.p256dh || '') && /^[A-Za-z0-9_-]{20,30}$/.test(sub.keys?.auth || '');
function key(id) {
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw Error('Bad device id');
  return 'subscription:' + id;
}
const headers = origin => ({ 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Cache-Control': 'no-store', Vary: 'Origin' });
const json = (data, status, origin) => Response.json(data, { status, headers: headers(origin) });
const TTL = 60 * 60 * 24 * 180;

export async function runSchedule(env, now) {
  let cursor, sent = 0;
  do {
    const page = await env.SUBSCRIPTIONS.list({ prefix: 'subscription:', limit: 100, cursor });
    for (const item of page.keys) {
      try {
        const entry = await env.SUBSCRIPTIONS.get(item.name, 'json');
        if (!entry) continue;
        const clock = localClock(now, entry.schedule.zone);
        entry.schedule.last = Object.fromEntries(Object.entries(entry.schedule.last || {}).filter(([k]) => k.startsWith(clock.day)));
        const due = dueReminders(entry.schedule, now, entry.hydratedDay === clock.day);
        let expired = false;
        for (const reminder of due) {
          if (await send(env, entry, reminderMessage(entry.app, reminder.kind)) === 'expired') { await env.SUBSCRIPTIONS.delete(item.name); expired = true; break; }
          entry.schedule.last[reminder.key] = true; sent++;
        }
        if (!expired && due.length) await env.SUBSCRIPTIONS.put(item.name, JSON.stringify(entry), { expirationTtl: TTL });
      } catch { /* one broken entry must not stop the others */ }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return sent;
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || 'https://y33bau.github.io';
    if (request.headers.get('Origin') !== origin) return json({ error: 'Origin denied' }, 403, origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
    if (!await authorized(request, env)) return json({ error: 'Unauthorized' }, 401, origin);
    if (!env.SUBSCRIPTIONS || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return json({ error: 'Service is not configured' }, 503, origin);
    try {
      const path = new URL(request.url).pathname;
      if (path === '/vapid-public-key' && request.method === 'GET') return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, origin);
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
      const raw = await request.text();
      if (raw.length > 16e3) return json({ error: 'Too large' }, 413, origin);
      const body = JSON.parse(raw), id = key(body.deviceId);
      if (path === '/unsubscribe') { await env.SUBSCRIPTIONS.delete(id); return json({ ok: true }, 200, origin); }
      if (path === '/subscribe') {
        if (!Object.hasOwn(APPS, body.app) || !validSubscription(body.subscription)) return json({ error: 'Invalid subscription' }, 400, origin);
        const schedule = validateReminders({ ...body.schedule, last: {} }, body.app);
        const old = await env.SUBSCRIPTIONS.get(id, 'json');
        const last = old?.app === body.app ? old.schedule.last : {};
        const { enabled, water, work, start, end, waterEvery, workEvery, weekdays, times, zone } = schedule;
        const entry = { app: body.app, subscription: body.subscription, schedule: { enabled, water, work, start, end, waterEvery, workEvery, weekdays, times, zone, last }, hydratedDay: /^\d{4}-\d{2}-\d{2}$/.test(body.hydratedDay || '') ? body.hydratedDay : null, updatedAt: Date.now() };
        await env.SUBSCRIPTIONS.put(id, JSON.stringify(entry), { expirationTtl: TTL });
        return json({ ok: true }, 200, origin);
      }
      if (path === '/test') {
        const entry = await env.SUBSCRIPTIONS.get(id, 'json');
        if (!entry) return json({ error: 'Subscription missing' }, 404, origin);
        if (await send(env, entry, { ...reminderMessage(entry.app, 'work'), body: 'Test push działa. Możesz wrócić do swojego dnia.' }) === 'expired') { await env.SUBSCRIPTIONS.delete(id); return json({ error: 'Subscription expired' }, 410, origin); }
        return json({ ok: true }, 200, origin);
      }
      return json({ error: 'Not found' }, 404, origin);
    } catch (e) {
      return json({ error: 'Invalid request or delivery failure', detail: String(e?.message || '').slice(0, 160) }, 400, origin);
    }
  },
  async scheduled(event, env, ctx) {
    if (env.SUBSCRIPTIONS && env.VAPID_PRIVATE_KEY) ctx.waitUntil(runSchedule(env, event.scheduledTime));
  },
};
