// Iskra: the companion at the heart of the app. She grows from everything you do, never dies,
// never sulks, and is always glad when you come back.
import * as C from './core.js';

export const STAGES = [
  { xp: 0, name: 'Iskierka', c1: '#fff6d6', c2: '#f6b45a', c3: '#ffdf9a', note: 'Dopiero się rozpala.' },
  { xp: 120, name: 'Płomyczek', c1: '#ffeacc', c2: '#ff8f6b', c3: '#ffc3a3', note: 'Ma już swój ciepły blask.' },
  { xp: 350, name: 'Ognik', c1: '#ffe2f0', c2: '#ee77ae', c3: '#ffb3d6', note: 'Tańczy, gdy coś zrobisz.' },
  { xp: 800, name: 'Gwiazdka', c1: '#efe9ff', c2: '#9f87ff', c3: '#cfc2ff', note: 'Świeci nawet w gorszy dzień.' },
  { xp: 1600, name: 'Zorza', c1: '#ddfff3', c2: '#4fd6ad', c3: '#a6f1d7', note: 'Rozlewa światło po całej wyspie.' },
  { xp: 3000, name: 'Supernowa', c1: '#ffffff', c2: '#7cc7ff', c3: '#d6c8ff', note: 'Najjaśniejsze światło, jakie znasz.' },
];

/** XP earned so far (spending coins or materials never shrinks Iskra). */
export const careXp = state => state.ledger.reduce((n, e) => n + Math.max(0, e.xp || 0), 0);

export function growth(state) {
  const xp = careXp(state);
  let i = 0; while (i + 1 < STAGES.length && xp >= STAGES[i + 1].xp) i++;
  const cur = STAGES[i], next = STAGES[i + 1];
  return { index: i, stage: cur, next, xp, progress: next ? (xp - cur.xp) / (next.xp - cur.xp) : 1, toNext: next ? next.xp - xp : 0 };
}

const ACTIVE = new Set(['step', 'complete', 'focus', 'boss', 'bonus']);
export function lastActive(state) {
  for (let i = state.ledger.length - 1; i >= 0; i--) if (ACTIVE.has(state.ledger[i].kind)) return state.ledger[i].time;
  return null;
}

/** joy: something happened in the last 2 hours · calm: earlier today · sleepy: night or yesterday · missed: 2+ days away. */
export function mood(state, now = Date.now()) {
  const h = new Date(now).getHours(), last = lastActive(state);
  if (last && now - last < 2 * 3600e3) return 'joy';
  const days = last ? Math.round((new Date(C.dayKey(now) + 'T12:00:00') - new Date(C.dayKey(last) + 'T12:00:00')) / 864e5) : 0;
  if (last && days >= 2) return 'missed';
  if (h >= 22 || h < 6) return 'sleepy';
  if (last && days === 0) return 'calm';
  return last ? 'sleepy' : 'calm';
}

const pick = (list, seed) => list[Math.abs(seed) % list.length];
const LINES = {
  joy: ['Widziałam to! Rosnę od samego patrzenia.', 'Ale dobrze idzie. Iskrzę się cała.', 'To było super. Może jeszcze jedna mała rzecz?', 'Czuję się jaśniejsza. Dzięki!'],
  calm: ['Jestem obok. Zrobimy coś małego?', 'Jedna rzecz naraz. Wybrałam coś dla nas.', 'Nie spieszymy się. Wystarczy zacząć.', 'Hej. Pięć minut i będzie lżej.'],
  sleepy: ['Mrrr. Jestem trochę zaspana, ale chętnie pomogę.', 'Spokojnie. Nawet mała rzecz mnie obudzi.', 'Cicho tu dziś. Zrobimy coś drobnego?'],
  missed: ['Wróciłeś! Bardzo się cieszę.', 'Tęskniłam, ale nic się nie stało. Zaczynamy od nowa, lekko.', 'Jesteś! Wyspa na Ciebie czekała.'],
  night: ['Późno już. Może coś na wyciszenie?', 'Wieczór to dobra pora, żeby domknąć dzień.'],
  morning: ['Dzień dobry! Szklanka wody i jedziemy?', 'Nowy dzień, czysta karta.'],
};

/** What Iskra says right now. Stable for ten minutes so it does not flicker on every re-render. */
export function line(state, now = Date.now(), name = '') {
  const m = mood(state, now), h = new Date(now).getHours(), seed = Math.floor(now / 6e5);
  let text = m === 'calm' && h >= 5 && h < 10 ? pick(LINES.morning, seed) : m === 'calm' && h >= 20 ? pick(LINES.night, seed) : pick(LINES[m], seed);
  if (name && m === 'missed') text = text.replace('Wróciłeś!', 'Wróciłeś, ' + name + '!');
  return { mood: m, text };
}

/* ───── Drawing ───── */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let uid = 0;

function face(m) {
  if (m === 'sleepy') return '<path class="i-eye-c" d="M47 74q4 3 8 0M65 74q4 3 8 0"/><circle class="i-mouth-o" cx="60" cy="84" r="2.2"/>';
  const eyes = m === 'joy' ? '<path class="i-eye-c" d="M46 75q5-6 10 0M64 75q5-6 10 0"/>'
    : '<g class="i-eyes"><ellipse class="i-eye" cx="51" cy="73" rx="4" ry="5.2"/><ellipse class="i-eye" cx="69" cy="73" rx="4" ry="5.2"/><circle class="i-glint" cx="52.6" cy="71" r="1.5"/><circle class="i-glint" cx="70.6" cy="71" r="1.5"/>' + (m === 'missed' ? '<circle class="i-glint" cx="49.8" cy="75.4" r=".9"/><circle class="i-glint" cx="67.8" cy="75.4" r=".9"/>' : '') + '</g>';
  const mouth = m === 'joy' ? '<path class="i-mouth-open" d="M53 82q7 9 14 0z"/>' : m === 'missed' ? '<path class="i-mouth" d="M53 83q7 6 14 0"/>' : '<path class="i-mouth" d="M55 83q5 4 10 0"/>';
  return eyes + '<ellipse class="i-cheek" cx="43" cy="81" rx="4.5" ry="2.6"/><ellipse class="i-cheek" cx="77" cy="81" rx="4.5" ry="2.6"/>' + mouth;
}

/** Iskra as SVG. `id` and `cls` let the focus timer keep updating her mood class. */
export function svg(state, { size = 120, moodOverride, id = '', cls = '', label = 'Iskra' } = {}) {
  const g = growth(state), s = g.stage, m = moodOverride || mood(state), k = 'i' + (++uid), n = g.index;
  const scale = (0.74 + n * 0.055).toFixed(3);
  const rays = n >= 3 ? '<g class="i-rays">' + Array.from({ length: 8 }, (_, i) => '<path d="M60 8v10" transform="rotate(' + i * 45 + ' 60 66)"/>').join('') + '</g>' : '';
  const orbit = n >= 4 ? '<g class="i-orbit">' + [0, 120, 240].map(a => '<circle cx="60" cy="16" r="2.6" transform="rotate(' + a + ' 60 66)"/>').join('') + '</g>' : '';
  const ribbons = n >= 5 ? '<g class="i-aurora"><path d="M18 60q20-30 42-6t42-6" /><path d="M14 74q24-24 46 0t46 0"/></g>' : '';
  const tuft = n >= 2 ? '<path class="i-tuft" d="M60 14c4 6 9 9 9 15a9 9 0 0 1-18 0c0-6 5-9 9-15z" fill="url(#' + k + 'b)"/>' : '';
  const zzz = m === 'sleepy' ? '<g class="i-zzz"><text x="88" y="38">z</text><text x="96" y="28">z</text></g>' : '';
  const hearts = m === 'missed' ? '<g class="i-hearts"><path d="M96 40c0-3 4-4 5-1c1-3 5-2 5 1c0 3-5 6-5 6s-5-3-5-6z"/><path d="M14 50c0-2.4 3.2-3.2 4-.8c.8-2.4 4-1.6 4 .8c0 2.4-4 4.8-4 4.8s-4-2.4-4-4.8z"/></g>' : '';
  return '<svg' + (id ? ' id="' + id + '"' : '') + ' class="isk ' + m + ' st' + n + (cls ? ' ' + cls : '') + '" viewBox="0 0 120 120" width="' + size + '" height="' + size + '" role="img" aria-label="' + esc(label + ', ' + s.name) + '" style="--c1:' + s.c1 + ';--c2:' + s.c2 + ';--c3:' + s.c3 + '">' +
    '<defs><radialGradient id="' + k + 'b" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="' + s.c1 + '"/><stop offset=".55" stop-color="' + s.c3 + '"/><stop offset="1" stop-color="' + s.c2 + '"/></radialGradient>' +
    '<radialGradient id="' + k + 'h" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="' + s.c2 + '" stop-opacity=".55"/><stop offset="1" stop-color="' + s.c2 + '" stop-opacity="0"/></radialGradient></defs>' +
    '<circle class="i-halo" cx="60" cy="68" r="56" fill="url(#' + k + 'h)"/>' + ribbons + rays + orbit +
    '<g class="i-body" style="transform:scale(' + scale + ')">' + tuft +
    '<path class="i-shape" d="M60 20C72 38 94 50 94 74a34 34 0 0 1-68 0c0-24 22-36 34-54z" fill="url(#' + k + 'b)"/>' +
    '<ellipse class="i-shine" cx="47" cy="54" rx="9" ry="13" transform="rotate(-24 47 54)"/>' + face(m) + '</g>' + zzz + hearts + '</svg>';
}
