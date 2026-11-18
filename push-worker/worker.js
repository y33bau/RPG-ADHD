// SYNAPSE push service for Cloudflare Workers.
// Stores only: device id, push subscription and reminder schedule (no tasks, no contacts).
// Needs: KV binding "KV", secret API_TOKEN (min. 24 chars). VAPID keys are created on first use.

const te = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
const concat = (...a) => { const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.length; } return out; };

/* ── reminder schedule (same rules as the app's notification-core.js) ── */
const EVERY = [30, 60, 90, 120, 180, 240];
export function localClock(now, zone = 'Europe/Warsaw') {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(new Date(now)).map(x => [x.type, x.value]));
  return { day: p.year + '-' + p.month + '-' + p.day, minute: Number(p.hour) * 60 + Number(p.minute), weekend: ['Sat', 'Sun'].includes(p.weekday) };
}
export function due(schedule, last, now, hydratedDay) {
  const c = localClock(now, schedule.zone);
  if (!schedule.enabled || (schedule.weekdays && c.weekend)) return [];
  const out = [];
  for (const kind of ['water', 'work']) {
    if (!schedule[kind] || (kind === 'water' && hydratedDay === c.day)) continue;
    const every = kind === 'water' ? schedule.waterEvery : schedule.workEvery;
    if (!EVERY.includes(every)) continue;
    for (let m = schedule.start * 60; m < schedule.end * 60; m += every) {
      const key = c.day + ':' + kind + ':' + m;
      if (c.minute >= m && c.minute < m + 5 && !last[key]) out.push({ kind, key });
    }
  }
  return out;
}
export function message(app, kind) {
  if (kind === 'water') return { title: 'SYNAPSE · porcja wody', body: 'Czas na 200 ml. Jeden mały rytuał w stronę celu 2 l.', tag: 'synapse-water' };
  return app === 'agent'
    ? { title: 'AGENT EMPIRE · następny ruch', body: 'Jeden kontakt. Jeden konkretny następny krok. Wracamy do gry?', tag: 'agent-work' }
    : { title: 'SYNAPSE · mały krok', body: 'Wybierz jedną rzecz. Spróbuj przez 5 minut — reszta może poczekać.', tag: 'synapse-work' };
}

/* ── VAPID (RFC 8292) and payload encryption (RFC 8291, aes128gcm) ── */
export async function getVapid(env) {
  let v = await env.KV.get('vapid', 'json');
  if (v) return v;
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  v = { publicKey: b64u(await crypto.subtle.exportKey('raw', pair.publicKey)), privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey) };
  await env.KV.put('vapid', JSON.stringify(v));
  return v;
}

async function vapidHeader(endpoint, vapid, subject) {
  const head = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u(te.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })));
  const key = await crypto.subtle.importKey('jwk', vapid.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, te.encode(head + '.' + body));
  return 'vapid t=' + head + '.' + body + '.' + b64u(sig) + ', k=' + vapid.publicKey;
}

async function hkdf(salt, ikm, info, bytes) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
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

async function send(env, sub, payload) {
  const vapid = await getVapid(env), endpoint = sub.subscription.endpoint;
  return fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: await vapidHeader(endpoint, vapid, env.VAPID_SUBJECT || 'mailto:admin@example.com'), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '3600', Urgency: 'normal' },
    body: await encrypt(JSON.stringify(payload), sub.subscription.keys),
  });
}

/* ── HTTP API used by the app (Ustawienia → Powiadomienia → Push) ── */
const json = (data, status, cors) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || 'https://y33bau.github.io').split(',').map(s => s.trim());
  const origin = request.headers.get('Origin');
  return origin && allowed.includes(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' } : { Vary: 'Origin' };
}

function sameToken(a, b) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function validSchedule(s) {
  return s && typeof s.enabled === 'boolean' && typeof s.water === 'boolean' && typeof s.work === 'boolean' && typeof s.weekdays === 'boolean' &&
    Number.isInteger(s.start) && Number.isInteger(s.end) && s.start >= 0 && s.end <= 24 && s.start < s.end &&
    EVERY.includes(s.waterEvery) && EVERY.includes(s.workEvery) && typeof s.zone === 'string' && (() => { try { localClock(Date.now(), s.zone); return true; } catch { return false; } })();
}

async function handle(request, env) {
  const cors = corsHeaders(request, env), url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (!env.API_TOKEN || env.API_TOKEN.length < 24) return json({ error: 'API_TOKEN is not configured' }, 503, cors);
  const auth = request.headers.get('Authorization') || '';
  if (!sameToken(auth, 'Bearer ' + env.API_TOKEN)) return json({ error: 'unauthorized' }, 401, cors);

  if (url.pathname === '/vapid-public-key' && request.method === 'GET') return json({ publicKey: (await getVapid(env)).publicKey }, 200, cors);
  if (request.method !== 'POST') return json({ error: 'not found' }, 404, cors);
  let body; try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400, cors); }
  const id = typeof body.deviceId === 'string' && /^[\w-]{8,64}$/.test(body.deviceId) ? body.deviceId : null;
  if (!id) return json({ error: 'bad deviceId' }, 400, cors);

  if (url.pathname === '/subscribe') {
    const s = body.subscription;
    let ok = false; try { ok = new URL(s.endpoint).protocol === 'https:' && typeof s.keys.p256dh === 'string' && typeof s.keys.auth === 'string'; } catch { /* invalid */ }
    if (!ok || !validSchedule(body.schedule)) return json({ error: 'bad subscription' }, 400, cors);
    const existing = await env.KV.get('sub:' + id, 'json');
    if (!existing && (await env.KV.list({ prefix: 'sub:', limit: 50 })).keys.length >= 50) return json({ error: 'too many devices' }, 429, cors);
    await env.KV.put('sub:' + id, JSON.stringify({ app: body.app === 'agent' ? 'agent' : 'adhd', subscription: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, schedule: body.schedule, hydratedDay: typeof body.hydratedDay === 'string' ? body.hydratedDay : null, last: existing?.last || {} }));
    return json({ ok: true }, 200, cors);
  }
  if (url.pathname === '/unsubscribe') { await env.KV.delete('sub:' + id); return json({ ok: true }, 200, cors); }
  if (url.pathname === '/test') {
    const sub = await env.KV.get('sub:' + id, 'json');
    if (!sub) return json({ error: 'unknown device' }, 404, cors);
    const res = await send(env, sub, { title: 'SYNAPSE · test', body: 'Push działa. Możesz zamknąć aplikację.', tag: 'synapse-test' });
    return json({ ok: res.ok, status: res.status }, 200, cors);
  }
  return json({ error: 'not found' }, 404, cors);
}

/* ── cron: every 5 minutes ── */
export async function runSchedule(env, now = Date.now()) {
  const list = await env.KV.list({ prefix: 'sub:', limit: 100 });
  let sent = 0;
  for (const { name } of list.keys) {
    const sub = await env.KV.get(name, 'json');
    if (!sub) continue;
    const today = localClock(now, sub.schedule.zone).day;
    const last = Object.fromEntries(Object.entries(sub.last || {}).filter(([k]) => k.startsWith(today)));
    const items = due(sub.schedule, last, now, sub.hydratedDay);
    for (const item of items) {
      const res = await send(env, sub, message(sub.app, item.kind));
      if (res.status === 404 || res.status === 410) { await env.KV.delete(name); break; }
      if (res.ok) { last[item.key] = true; sent++; }
    }
    if (await env.KV.get(name)) await env.KV.put(name, JSON.stringify({ ...sub, last }));
  }
  return sent;
}

export default {
  fetch: (request, env) => handle(request, env).catch(e => json({ error: String(e?.message || e) }, 500, corsHeaders(request, env))),
  scheduled: (event, env, ctx) => { ctx.waitUntil(runSchedule(env)); },
};
