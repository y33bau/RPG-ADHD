// The island: Iskra's home. Real-life actions grow places on it, materials build the three houses.
import * as C from './core.js';
import { parseNames } from './generator.js';
import * as ISK from './iskra.js';

export const LEVELS = [1, 6, 20];
export const FEATURES = [
  { id: 'house', name: 'Domek', from: 'sprzątania, prania i zmywania', re: /pran|zmywar|naczy|kubek|blat|odkurz|śmie|półk|porząd|szufl|pościel|łazienk|lodówk|ubrani|zakup|sprząt|ogarn|odłóż|rzeczy/i },
  { id: 'flowers', name: 'Kwietnik', from: 'dbania o siebie: wody, jedzenia, roślin', re: /rośl|kwiat|podl|wod[aęy]|herbat|przekąsk|posił|gotow|jedzen|śniadan|obiad/i },
  { id: 'path', name: 'Ścieżka', from: 'spacerów i ruchu', re: /spacer|\bpies|psem|psa\b|ruch|rozciąg|wyjdź|ćwicz|rower/i, who: 'dog', label: f => 'Ścieżka ' + f[1] },
  { id: 'playground', name: 'Plac zabaw', from: 'czasu z dzieckiem', re: /dzieck|zabaw|histori|bajk|klock|samochodzik|superbohater/i, who: 'kid', label: f => 'Plac zabaw ' + f[1] },
  { id: 'bench', name: 'Ławeczka', from: 'czasu z bliskimi', re: /partner|bliski|wiadomoś|zapytaj|gest|zaplanujcie|domownik|zadzwoń do|telefon do/i, who: 'partner' },
  { id: 'pen', name: 'Zagroda', from: 'opieki nad zwierzakami', re: /zwierz|śwink|kot|karm|klatk/i, who: 'pets', label: f => 'Zagroda ' + f[1] },
  { id: 'pond', name: 'Staw spokoju', from: 'odpoczynku i rytuałów', re: /oddech|wycisz|odpocz|przerw|odłóż telefon|budzik|zasn|cisz|poranny start|wieczorne/i },
  { id: 'library', name: 'Biblioteczka', from: 'hobby, czytania i pomysłów', re: /projekt|hobby|pomysł|czyta|nauk|zapisz|utwór|muzyk|rund|odcinek|zdjęci/i },
  { id: 'campfire', name: 'Ognisko', from: 'sesji skupienia' },
];

const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Counts how often each kind of place was fed, using task titles and the names the user typed. */
export function census(state, names = {}) {
  const count = Object.fromEntries(FEATURES.map(f => [f.id, 0])); let other = 0;
  const personal = FEATURES.filter(f => f.who && names[f.who]).map(f => [f.id, new RegExp(parseNames(names[f.who]).map(escRe).join('|'), 'i')]);
  for (const e of state.ledger) {
    if (e.kind === 'focus') { count.campfire++; continue; }
    if (e.kind !== 'complete' && e.kind !== 'boss') continue;
    const t = e.title || '';
    const hit = personal.find(([, re]) => re.test(t))?.[0] || FEATURES.find(f => f.re && f.re.test(t))?.id;
    if (hit) count[hit]++; else other++;
  }
  return { count, trees: Math.min(12, Math.floor(other / 2) + (other ? 1 : 0)) };
}

export const levelOf = n => LEVELS.filter(x => n >= x).length;

export function places(state, names = {}) {
  const { count, trees } = census(state, names);
  return {
    trees,
    list: FEATURES.map(f => {
      const forms = f.who && names[f.who] ? parseNames(names[f.who]) : null;
      const n = count[f.id], level = levelOf(n), next = LEVELS[level];
      return { ...f, title: forms && f.label ? f.label(forms) : f.name, count: n, level, toNext: next ? next - n : 0 };
    }),
  };
}

/* ───── Drawing ───── */

const POS = { house: [118, 120], flowers: [158, 170], path: [0, 0], playground: [222, 166], bench: [268, 172], pen: [306, 146], pond: [84, 172], library: [168, 112], campfire: [196, 136] };
const ROOM_POS = { workshop: [250, 112], garden: [64, 140], observatory: [296, 112] };
const TREE_POS = [[40, 160], [52, 128], [92, 102], [140, 96], [212, 96], [322, 132], [334, 160], [290, 186], [126, 192], [200, 196], [30, 146], [240, 196]];

const g = (x, y, s, body, cls = '') => '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><g class="pl ' + cls + '">' + body + '</g></g>';
const ghost = (x, y, title) => '<g class="pl-ghost" transform="translate(' + x + ' ' + y + ')"><title>' + title + ': jeszcze do odkrycia</title><circle r="9"/><text y="3.5">?</text></g>';

const DRAW = {
  house: l => '<path d="M-14 0v-14h28V0z" fill="#e9dcc9"/><path d="M-17-13L0-27L17-13z" fill="#c9725f"/><rect x="-4" y="-9" width="8" height="9" rx="1" fill="#7b4f3f"/><rect class="win" x="-11" y="-11" width="5" height="5" rx="1"/><rect class="win" x="6" y="-11" width="5" height="5" rx="1"/>' + (l >= 2 ? '<rect x="7" y="-29" width="4" height="9" fill="#9b5a4a"/><g class="smoke"><circle cx="9" cy="-33" r="2.4"/><circle cx="11" cy="-38" r="3"/></g>' : '') + (l >= 3 ? '<path d="M-20 0h40" stroke="#b78b5b" stroke-width="2"/><circle cx="-18" cy="-3" r="3" fill="#f49cbb"/><circle cx="18" cy="-3" r="3" fill="#ffd56b"/>' : ''),
  flowers: l => [...Array(2 + l * 2)].map((_, i) => { const x = (i - (1 + l)) * 6, c = ['#f49cbb', '#ffd56b', '#bbabff', '#ff9a6b'][i % 4]; return '<path d="M' + x + ' 0v-7" stroke="#4f9a67" stroke-width="1.4"/><circle class="bloom" style="animation-delay:-' + i * .4 + 's" cx="' + x + '" cy="-8" r="' + (2.2 + l * .3) + '" fill="' + c + '"/>'; }).join(''),
  playground: l => '<path d="M-12 0l6-18h12l6 18" stroke="#c9a37a" stroke-width="2" fill="none"/><path d="M-6-18h12" stroke="#c9a37a" stroke-width="2"/><g class="swing"><path d="M-2-18v12M2-18v12" stroke="#ddd" stroke-width=".8"/><rect x="-4" y="-7" width="8" height="2" fill="#ff9a6b"/></g>' + (l >= 2 ? '<path d="M14 0v-10h6l8 10" stroke="#7cc7ff" stroke-width="2" fill="none"/>' : '') + (l >= 3 ? '<circle cx="-18" cy="-3" r="3" fill="#ffd56b"/><path d="M-22-2h8" stroke="#ff9a6b"/>' : ''),
  bench: l => '<rect x="-10" y="-6" width="20" height="2.5" rx="1" fill="#b78b5b"/><rect x="-10" y="-11" width="20" height="2.5" rx="1" fill="#b78b5b"/><path d="M-8-3.5v3.5M8-3.5v3.5" stroke="#6d5240" stroke-width="1.6"/>' + (l >= 2 ? '<path d="M14 0v-16" stroke="#2c2f45" stroke-width="1.6"/><circle class="lamp" cx="14" cy="-17" r="3"/>' : '') + (l >= 3 ? '<path class="heart" d="M-2-18c0-3 4-4 5-1c1-3 5-2 5 1c0 3-5 6-5 6s-5-3-5-6z" fill="#f49cbb"/>' : ''),
  pen: l => '<path d="M-14 0v-8M-7 0v-8M0 0v-8M7 0v-8M14 0v-8M-15-6h30M-15-2h30" stroke="#b78b5b" stroke-width="1.5"/>' + '<ellipse class="critter" cx="-4" cy="-3" rx="4" ry="2.6" fill="#e6c7a4"/>' + (l >= 2 ? '<ellipse class="critter" style="animation-delay:-1s" cx="5" cy="-3" rx="3.4" ry="2.3" fill="#f2f2f2"/>' : '') + (l >= 3 ? '<path d="M-2-20h10l-5-6z" fill="#c9725f"/><rect x="-1" y="-20" width="8" height="8" fill="#e9dcc9"/>' : ''),
  pond: l => '<ellipse cx="0" cy="-2" rx="' + (12 + l * 3) + '" ry="' + (5 + l) + '" fill="#2f8aa6"/><ellipse class="ripple-w" cx="-3" cy="-3" rx="5" ry="1.6" fill="none" stroke="#a6e3f5"/>' + (l >= 2 ? '<g class="lily"><ellipse cx="6" cy="-1" rx="3" ry="1.4" fill="#4f9a67"/><circle cx="6" cy="-2" r="1.2" fill="#f49cbb"/></g>' : '') + (l >= 3 ? '<path class="duck" d="M-10-4q2-3 4 0q1-2 3-1l-1 1q1 2-2 2h-4z" fill="#ffd56b"/>' : ''),
  library: l => '<rect x="-9" y="-16" width="18" height="16" rx="2" fill="#8f7bd6"/><path d="M-11-16L0-24L11-16z" fill="#6c59b8"/><rect class="win" x="-3" y="-12" width="6" height="6" rx="3"/>' + (l >= 2 ? '<rect x="-7" y="-3" width="3" height="3" fill="#ffd56b"/><rect x="4" y="-3" width="3" height="3" fill="#b4efd9"/>' : '') + (l >= 3 ? '<path class="flag" d="M0-24v-9l7 2.5L0-28" fill="#f3d49b" stroke="#f3d49b"/>' : ''),
  campfire: l => '<path d="M-8 0l16-4M8 0l-16-4" stroke="#7b4f3f" stroke-width="2.4" stroke-linecap="round"/><path class="flame" d="M0-4c-5-4-3-9 0-13c1 4 5 5 5 9a5 5 0 0 1-10 0" fill="#ff9a4b"/><path class="flame f2" d="M0-4c-2-2-1.5-5 0-7c.5 2 2.5 3 2.5 5a2.5 2.5 0 0 1-5 0" fill="#ffe08a"/>' + (l >= 2 ? '<g class="ember"><circle cx="-2" cy="-20" r=".9"/><circle cx="3" cy="-24" r=".7"/></g>' : '') + (l >= 3 ? '<path d="M-16 0q-2-4 2-4h6" stroke="#b78b5b" stroke-width="2" fill="none"/><path d="M16 0q2-4-2-4h-6" stroke="#b78b5b" stroke-width="2" fill="none"/>' : ''),
};
const ROOM_DRAW = {
  workshop: l => '<rect x="-12" y="-14" width="24" height="14" fill="#a99377"/><path d="M-14-14h28l-4-7h-20z" fill="#6e6a86"/><rect class="win" x="-8" y="-10" width="6" height="5"/>' + (l >= 2 ? '<circle class="gear" cx="7" cy="-8" r="3.4" fill="none" stroke="#f3d49b" stroke-width="1.6" stroke-dasharray="2 1.4"/>' : '') + (l >= 3 ? '<path class="flag" d="M-12-21v-9l7 2.5L-12-26" fill="#b4efd9"/>' : ''),
  garden: l => '<path d="M-14 0q14-10 28 0" fill="#5aa874"/>' + [...Array(l)].map((_, i) => '<circle cx="' + (-8 + i * 8) + '" cy="-5" r="3" fill="' + ['#ff7f7f', '#ffd56b', '#bbabff'][i] + '"/>').join('') + (l >= 2 ? '<path d="M-16 0v-10h4v10M12 0v-10h4v10M-16-10q16-10 32 0" stroke="#e9dcc9" stroke-width="1.4" fill="none"/>' : ''),
  observatory: l => '<rect x="-9" y="-16" width="18" height="16" fill="#cfd3e6"/><path d="M-11-16a11 11 0 0 1 22 0z" fill="#8a90b8"/>' + (l >= 2 ? '<path d="M2-24l9-6" stroke="#3b3f5c" stroke-width="2.6" stroke-linecap="round"/>' : '') + (l >= 3 ? '<g class="ember"><circle cx="13" cy="-34" r="1"/><circle cx="18" cy="-28" r=".8"/></g>' : ''),
};

const tree = (x, y, i) => '<g transform="translate(' + x + ' ' + y + ')"><g class="tree" style="animation-delay:-' + (i * .7).toFixed(1) + 's"><rect x="-1.3" y="-6" width="2.6" height="6" fill="#7b4f3f"/><circle cy="-11" r="7" fill="' + (i % 3 ? '#3f8f63' : '#4fa874') + '"/><circle cx="-3" cy="-13" r="3" fill="#6cc08b" opacity=".6"/></g></g>';

export function svg(state, names = {}, now = Date.now()) {
  const h = new Date(now).getHours(), night = h >= 20 || h < 6;
  const { list, trees } = places(state, names), by = Object.fromEntries(list.map(p => [p.id, p]));
  const stars = night ? [...Array(18)].map((_, i) => '<circle class="star" style="animation-delay:-' + (i * .37).toFixed(2) + 's" cx="' + ((i * 53) % 350 + 5) + '" cy="' + ((i * 29) % 70 + 6) + '" r="' + (i % 4 ? .8 : 1.3) + '"/>').join('') : '';
  const pathP = by.path;
  const path = pathP.level ? '<path class="pl-path" d="M40 172Q90 152 130 160T214 150T300 168" stroke-width="' + (2 + pathP.level * 1.5) + '"/>' + (pathP.level >= 3 ? '<circle class="lamp" cx="170" cy="150" r="2.4"/><circle class="lamp" cx="252" cy="152" r="2.4"/>' : '') : '';
  const items = list.filter(p => p.id !== 'path').map(p => {
    const [x, y] = POS[p.id];
    return p.level ? '<g><title>' + p.title + ' · poziom ' + p.level + '</title>' + g(x, y, 0.95 + p.level * 0.12, DRAW[p.id](p.level), 'pl-' + p.id) + '</g>' : ghost(x, y - 6, p.title);
  }).join('');
  const rooms = C.ROOMS.map(r => { const l = state.rooms[r.id] || 0, [x, y] = ROOM_POS[r.id]; return l ? '<g><title>' + r.name + ' · poziom ' + l + '</title>' + g(x, y, 0.95 + l * 0.1, ROOM_DRAW[r.id](l)) + '</g>' : ghost(x, y - 6, r.name); }).join('');
  const forest = TREE_POS.slice(0, trees).map(([x, y], i) => tree(x, y, i)).join('');
  const isk = ISK.svg(state, { size: 46 }).replace('<svg ', '<svg x="157" y="24" ');
  return '<svg class="island' + (night ? ' night' : '') + '" viewBox="0 0 360 220" role="img" aria-label="Wyspa Iskry. Odkryte miejsca: ' + list.filter(p => p.level).length + ' z ' + list.length + '.">' +
    '<defs><linearGradient id="isl-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (night ? '#121530' : '#2b2c56') + '"/><stop offset="1" stop-color="' + (night ? '#1c2244' : '#4a4378') + '"/></linearGradient>' +
    '<linearGradient id="isl-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (night ? '#173a52' : '#2a6f8a') + '"/><stop offset="1" stop-color="' + (night ? '#0d1f33' : '#17435e') + '"/></linearGradient>' +
    '<radialGradient id="isl-grass" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#7fcf8f"/><stop offset="1" stop-color="#3e8f62"/></radialGradient></defs>' +
    '<rect width="360" height="220" fill="url(#isl-sky)"/>' + stars + (night ? '<circle class="moon" cx="318" cy="30" r="11" fill="#f6efd2"/>' : '<circle class="sun" cx="320" cy="34" r="14" fill="#ffd9a0"/>') +
    '<g class="cloud"><ellipse cx="60" cy="40" rx="22" ry="7"/><ellipse cx="74" cy="35" rx="13" ry="7"/></g><g class="cloud c2"><ellipse cx="250" cy="58" rx="18" ry="5.5"/><ellipse cx="262" cy="54" rx="10" ry="5"/></g>' +
    '<rect y="92" width="360" height="128" fill="url(#isl-sea)"/>' +
    '<g class="waves"><path d="M10 110q10-4 20 0t20 0M290 104q10-4 20 0t20 0M220 206q10-4 20 0t20 0M24 200q10-4 20 0t20 0"/></g>' +
    '<ellipse cx="180" cy="152" rx="166" ry="56" fill="#e8d3a3" class="shore"/><ellipse cx="180" cy="148" rx="156" ry="50" fill="url(#isl-grass)"/>' +
    '<ellipse cx="180" cy="196" rx="120" ry="5" fill="#000" opacity=".12"/>' +
    path + forest + rooms + items + '<g class="isl-iskra">' + isk + '</g></svg>';
}
