// Visual smoke test: opens every screen in demo mode on a phone and a desktop, checks the layout rules
// and saves screenshots to tests-ui/screenshots/ for a quick look.
// Run: npm run test:ui   (needs Playwright with Chromium; axe-core is optional for the accessibility check)
import { createRequire } from 'node:module';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'tests-ui', 'screenshots');
const { chromium } = require('playwright');
let axe = null;
try { axe = readFileSync(process.env.AXE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8'); } catch { /* optional */ }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json' };
const TABS = ['today', 'tasks', 'base', 'history', 'world'];
const DEVICES = { phone: { width: 390, height: 844 }, desktop: { width: 1280, height: 860 } };
const failures = [], notes = [];
const fail = (where, msg) => failures.push(where + ': ' + msg);

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const [device, viewport] of Object.entries(DEVICES)) {
  const ctx = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await ctx.route('https://app.test/**', route => {
    let p = new URL(route.request().url()).pathname; if (p.endsWith('/')) p += 'index.html';
    const f = join(root, p);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ body: readFileSync(f), contentType: TYPES[extname(f)] || 'application/octet-stream' });
  });
  await ctx.route(/^https?:\/\/(?!app\.test)/, r => r.abort());
  await ctx.route('https://api.open-meteo.com/**', r => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ current: { temperature_2m: 4, weather_code: 2, wind_speed_10m: 10, time: 'x' } }) }));
  const page = await ctx.newPage();
  page.on('pageerror', e => fail(device, 'page error: ' + e.message));
  await page.goto('https://app.test/?demo=1');
  await page.waitForSelector('main h1');
  await page.addStyleTag({ content: '#toast{display:none!important}*{animation-duration:0s!important;transition-duration:0s!important}' });

  for (const tab of TABS) {
    const where = device + '/' + tab;
    await page.evaluate(t => document.querySelector('#navigation [data-tab="' + t + '"]')?.click() ?? document.querySelector('[data-tab="' + t + '"]')?.click(), tab);
    await page.waitForTimeout(250);
    await page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); });
    const r = await page.evaluate(() => {
      const box = s => { const e = document.querySelector(s); if (!e || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return null; const b = e.getBoundingClientRect(); return { l: b.left, r: innerWidth - b.right, w: b.width, top: b.top, bottom: b.bottom }; };
      const navs = [...document.querySelectorAll('#navigation > button')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.getBoundingClientRect());
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        h1: document.querySelector('main h1')?.textContent || '',
        left: box('.appbar-btn'), brand: box('.appbar-brand'), right: box('.amb-host[data-host="top"] .amb-btn'),
        dock: box('.sidebar'), navs: navs.map(n => ({ l: n.left, w: n.width, cy: n.top + n.height / 2 })),
        now: box('.x-now-go'), weather: box('#slot-weather .dashboard-weather'), vh: innerHeight,
        small: [...document.querySelectorAll('main *')].filter(e => e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && e.offsetParent && parseFloat(getComputedStyle(e).fontSize) < 11 && parseFloat(getComputedStyle(e).fontSize) > 0).length,
      };
    });
    if (r.overflow > 0) fail(where, 'page scrolls sideways by ' + r.overflow + 'px');
    if (!r.h1) fail(where, 'no page title');
    if (r.small) notes.push(where + ': ' + r.small + ' text element(s) below 11px');
    if (device === 'phone') {
      if (!r.left || !r.right || !r.brand) fail(where, 'top bar is missing a part');
      else {
        if (Math.abs(r.left.l - r.right.r) > 1) fail(where, 'top bar buttons are not symmetric (' + r.left.l + ' vs ' + r.right.r + ')');
        if (Math.abs(r.left.w - r.right.w) > 1) fail(where, 'top bar buttons differ in size');
        if (Math.abs(r.brand.l - r.brand.r) > 2) fail(where, 'logo is not centred');
      }
      if (r.navs.length !== 5) fail(where, 'dock should show 5 items, shows ' + r.navs.length);
      const widths = r.navs.map(n => Math.round(n.w)).filter((_, i) => i !== 2);
      if (Math.max(...widths) - Math.min(...widths) > 1) fail(where, 'dock tabs have different widths: ' + widths);
      if (r.navs.length === 5 && Math.abs((r.navs[0].l - r.dock.l) - ((r.dock.l + r.dock.w) - (r.navs[4].l + r.navs[4].w))) > 1) fail(where, 'dock is not symmetric');
      if (r.navs.some(n => Math.abs(n.cy - r.navs[0].cy) > 1)) fail(where, 'dock items are not on one line (something sticks out)');
    }
    if (tab === 'today') {
      if (!r.weather) fail(where, 'weather strip is missing');
      if (!r.now || r.now.bottom > r.vh) fail(where, '"Zaczynam" is not visible on the first screen');
    }
    await page.screenshot({ path: join(out, device + '-' + tab + '.png') });
  }

  if (axe) {
    await page.evaluate(t => document.querySelector('[data-tab="' + t + '"]')?.click(), 'today');
    await page.addScriptTag({ content: axe });
    const res = await page.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help })));
    for (const v of res) (v.impact === 'critical' ? failures : notes).push(device + '/axe: ' + v.impact + ' ' + v.id + ' (' + v.n + '×) ' + v.help);
  } else notes.push('axe-core not installed: accessibility check skipped');
  await ctx.close();
}
await browser.close();

for (const n of notes) console.log('note  ' + n);
for (const f of failures) console.log('FAIL  ' + f);
console.log(failures.length ? '\n' + failures.length + ' problem(s). Screenshots: tests-ui/screenshots/' : '\nLayout OK on ' + Object.keys(DEVICES).length * TABS.length + ' screens. Screenshots: tests-ui/screenshots/');
process.exit(failures.length ? 1 : 0);
