/* "Mój tydzień" as a picture: a 1080×1350 card (Instagram portrait) drawn on a canvas,
   shared through the system share sheet where available, otherwise downloaded as PNG. */
import * as C from './core.js';
import * as D from './daily.js';

const W = 1080, H = 1350;
const SHORT = ['nd', 'pn', 'wt', 'śr', 'cz', 'pt', 'sb'];

/** Iskra as a glowing drop with a smile (the app's SVG relies on page CSS, so it is redrawn here). */
function drawSpark(ctx, cx, cy) {
  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, 150); glow.addColorStop(0, '#ff9a6b66'); glow.addColorStop(1, '#ff9a6b00');
  ctx.fillStyle = glow; ctx.fillRect(cx - 160, cy - 160, 320, 320);
  const body = ctx.createLinearGradient(0, cy - 110, 0, cy + 70); body.addColorStop(0, '#ffd2a8'); body.addColorStop(1, '#ff8a6a');
  ctx.beginPath(); ctx.moveTo(cx, cy - 110);
  ctx.bezierCurveTo(cx + 30, cy - 60, cx + 75, cy - 20, cx + 75, cy + 15);
  ctx.arc(cx, cy + 15, 75, 0, Math.PI);
  ctx.bezierCurveTo(cx - 75, cy - 20, cx - 30, cy - 60, cx, cy - 110); ctx.fillStyle = body; ctx.fill();
  ctx.fillStyle = '#3a2030';
  for (const dx of [-24, 24]) { ctx.beginPath(); ctx.arc(cx + dx, cy + 10, 7, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = '#3a2030'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(cx, cy + 22, 14, .2 * Math.PI, .8 * Math.PI); ctx.stroke();
  ctx.fillStyle = '#ff6a8a88'; for (const dx of [-44, 44]) { ctx.beginPath(); ctx.ellipse(cx + dx, cy + 30, 11, 7, 0, 0, Math.PI * 2); ctx.fill(); }
}

function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

/** Draws the card and returns the canvas. */
export async function drawWeek(state, { name = '', now = Date.now(), doc = document } = {}) {
  const w = D.weekSummary(state, now), level = C.levelInfo(C.balance(state).xp);
  const font = (size, weight = 600) => weight + ' ' + size + 'px "Inter","Segoe UI",system-ui,-apple-system,sans-serif';
  const cv = doc.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // Background: deep night with magenta and violet glows.
  ctx.fillStyle = '#0d0a1f'; ctx.fillRect(0, 0, W, H);
  for (const [x, y, r, c] of [[W * .9, -60, 760, '#ff2ea640'], [-80, 260, 700, '#7c5cff40'], [W / 2, H + 120, 900, '#5b21b638']]) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, '#0d0a1f00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  const neon = ctx.createLinearGradient(80, 0, W - 80, 0); neon.addColorStop(0, '#ff2ea6'); neon.addColorStop(.45, '#c13cf5'); neon.addColorStop(1, '#7c5cff');

  // Header
  ctx.fillStyle = '#e9a6ff'; ctx.font = font(26, 700); ctx.letterSpacing = '8px'; ctx.fillText('SYNAPSE', 80, 120); ctx.letterSpacing = '0px';
  ctx.fillStyle = '#ffffff'; ctx.font = font(92, 800); ctx.fillText('Mój tydzień', 76, 230);
  const fmt = d => new Date(d + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' });
  ctx.fillStyle = '#b4acd6'; ctx.font = font(32, 500); ctx.fillText(fmt(w.days[0]) + ' – ' + fmt(w.days[6]) + (name ? ' · ' + name : ''), 80, 290);

  // Iskra
  drawSpark(ctx, W - 190, 185);

  // Bars
  const max = Math.max(1, ...w.days.map(d => w.perDay[d]));
  round(ctx, 60, 350, W - 120, 470, 44); ctx.fillStyle = '#1b1740e6'; ctx.fill(); ctx.strokeStyle = '#ffffff1c'; ctx.lineWidth = 2; ctx.stroke();
  const bw = 92, gap = (W - 120 - 80 - 7 * bw) / 6;
  w.days.forEach((d, i) => {
    const x = 100 + i * (bw + gap), hgt = Math.max(14, Math.round(300 * w.perDay[d] / max)), y = 730 - hgt;
    const g = ctx.createLinearGradient(0, y, 0, 730); g.addColorStop(0, w.perDay[d] ? '#b4efd9' : '#4a4470'); g.addColorStop(1, w.perDay[d] ? '#8b5cf6' : '#2a2550');
    round(ctx, x, y, bw, hgt, 18); ctx.fillStyle = g; ctx.fill();
    ctx.fillStyle = '#b4acd6'; ctx.font = font(28, 600); ctx.textAlign = 'center'; ctx.fillText(SHORT[new Date(d + 'T12:00:00').getDay()], x + bw / 2, 780); ctx.textAlign = 'left';
  });

  // Stats
  const stats = [[w.completed, 'ukończone'], [w.activeDays + '/7', 'aktywne dni'], [w.focusMinutes, 'min skupienia']];
  stats.forEach(([v, l], i) => {
    const x = 60 + i * ((W - 120) / 3), cw = (W - 120) / 3 - 20;
    round(ctx, x + (i ? 20 : 0), 860, cw, 190, 36); ctx.fillStyle = '#ffffff0b'; ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = font(76, 800); ctx.fillText(String(v), x + (i ? 20 : 0) + 34, 960);
    ctx.fillStyle = '#b4acd6'; ctx.font = font(28, 500); ctx.fillText(l, x + (i ? 20 : 0) + 36, 1012);
  });

  // Level and proud line
  ctx.fillStyle = neon; ctx.font = font(40, 800); ctx.fillText('Poziom ' + level.level, 80, 1130);
  round(ctx, 80, 1150, W - 160, 14, 7); ctx.fillStyle = '#ffffff14'; ctx.fill();
  round(ctx, 80, 1150, Math.max(14, (W - 160) * level.xp / level.needed), 14, 7); ctx.fillStyle = neon; ctx.fill();
  if (w.proud) { ctx.fillStyle = '#f4e8ff'; ctx.font = font(32, 600); const t = '✦ Najważniejsze: ' + w.proud; ctx.fillText(t.length > 46 ? t.slice(0, 45) + '…' : t, 80, 1225); }
  ctx.fillStyle = '#7d75a8'; ctx.font = font(26, 500); ctx.fillText('Małe kroki. Własny rytm.', 80, 1290);
  return cv;
}

/** Shares the card (phone share sheet) or downloads it. Returns 'shared', 'downloaded' or 'cancelled'. */
export async function shareWeek(state, opts = {}) {
  const cv = await drawWeek(state, opts);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const file = new File([blob], 'synapse-moj-tydzien.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Mój tydzień · SYNAPSE' }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = file.name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
