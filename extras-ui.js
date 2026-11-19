// Add-on views: brain dump, evening review, body doubling, mood, habits, routines,
// bosses, achievements and rhythm charts. Builders return HTML strings; init() wires events.
import * as C from './core.js';
import * as A from './achievements.js';
import * as I from './insights.js';
import * as P from './planner.js';
import * as G from './guard.js';
import * as GEN from './generator.js';
import { FACTS, factOfDay } from './facts.js';
import { DIY } from './diy.js';
import { FOCUS_TIPS, tipOfDay, thoughtOfDay } from './wisdom.js';
import { extra, saveExtra, reloadExtra } from './extra-store.js';

export { extra };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, one, few, many) => n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? few : many;
const today = () => C.dayKey();
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return C.dayKey(d); };
const openNotes = () => extra.notes.filter(n => !n.archived);

export const SUBS = {
  today: [['plan', 'Plan'], ['planner', 'Planer'], ['focus', 'Skupienie'], ['me', 'Ja']],
  tasks: [['list', 'Lista'], ['quick', 'Szybkie punkty'], ['generator', 'Generator'], ['dump', 'Zrzut z głowy'], ['routines', 'Rutyny']],
  world: [['trip', 'Wyprawy'], ['calendar', 'Kalendarz'], ['facts', 'Ciekawostki'], ['diy', 'Zrób to sam'], ['settings', 'Ustawienia']],
  base: [['base', 'Przystań'], ['bosses', 'Wyprawy'], ['rewards', 'Nagrody']],
  history: [['overview', 'Przegląd'], ['badges', 'Osiągnięcia'], ['rhythm', 'Rytm'], ['log', 'Historia']],
};

/** Minimal mode keeps only what is needed to plan, focus and rest. */
const MINIMAL_HIDDEN = new Set(['today:me', 'today:planner', 'tasks:quick', 'tasks:generator', 'tasks:routines', 'world:trip', 'world:facts', 'world:diy', 'base:bosses', 'history:badges', 'history:rhythm']);

export function subs(tab, minimal = false) {
  return (SUBS[tab] || []).filter(([id]) => !(minimal && MINIMAL_HIDDEN.has(tab + ':' + id)));
}

/** The sub-tab that is really shown: the chosen one, or the first available. */
export function currentSub(tab, wanted, minimal = false) {
  const list = subs(tab, minimal);
  return list.some(([id]) => id === wanted) ? wanted : list[0]?.[0];
}

export function subnav(tab, wanted, minimal = false) {
  const items = subs(tab, minimal), current = currentSub(tab, wanted, minimal);
  if (!items.length) return '';
  return '<div class="x-subtabs" role="tablist" aria-label="Sekcje">' + items.map(([id, label]) => {
    const n = tab === 'tasks' && id === 'dump' ? openNotes().length : 0;
    return '<button role="tab" class="x-subtab' + (current === id ? ' on' : '') + '" data-sub="' + id + '" aria-selected="' + (current === id) + '" tabindex="' + (current === id ? 0 : -1) + '">' + label + (n ? '<b>' + n + '</b>' : '') + '</button>';
  }).join('') + '</div>';
}

const empty = (symbol, title, text) => '<div class="empty"><div class="empty-symbol">' + symbol + '</div><h3>' + title + '</h3><p>' + text + '</p></div>';

/* ───────────── Brain dump ───────────── */

export function captureCard() {
  const n = openNotes().length;
  return '<section class="panel x-capture"><div class="eyebrow">ZRZUT Z GŁOWY</div><form id="x-dump-form" class="x-inline"><label class="x-sr" for="x-dump-quick">Co chodzi Ci po głowie?</label><input id="x-dump-quick" name="text" maxlength="500" required placeholder="Zapisz myśl i wróć do działania" autocomplete="off"><button class="btn primary x-square" type="submit" aria-label="Zapisz myśl">＋</button></form><button class="btn link" data-go="tasks:dump">' + (n ? n + ' ' + plural(n, 'myśl czeka', 'myśli czekają', 'myśli czeka') + ' na przegląd →' : 'Otwórz parking myśli →') + '</button></section>';
}

export function dumpView() {
  const notes = openNotes().slice().reverse();
  return '<section class="panel x-dump"><div class="section-line"><h2>Zrzuć to z głowy</h2><button class="btn small purple" data-action="x-review" ' + '>☾ Wieczorny przegląd</button></div><form id="x-dump-form" class="x-inline"><label class="x-sr" for="x-dump-input">Co chodzi Ci po głowie?</label><input id="x-dump-input" name="text" maxlength="500" required placeholder="Cokolwiek. Posortujesz później." autocomplete="off"><button class="btn primary" type="submit">＋ Zrzuć</button></form><p class="subtext tiny">Myśl nie musi być zadaniem. Wieczorem zdecydujesz: dziś, jutro albo puszczasz.</p></section>' +
    '<section class="panel"><div class="section-line"><h3>Czeka na decyzję</h3><span class="tiny muted">' + notes.length + '</span></div>' +
    (notes.length ? notes.map(n => '<article class="x-note"><p>' + esc(n.text) + '</p><div class="x-note-actions"><button class="btn small" data-action="x-note-today" data-id="' + esc(n.id) + '">Na dziś</button><button class="btn small" data-action="x-note-tomorrow" data-id="' + esc(n.id) + '">Na jutro</button><button class="btn small link" data-action="x-note-drop" data-id="' + esc(n.id) + '">Puść</button></div></article>').join('') : empty('☁', 'Głowa jest lekka.', 'Gdy coś Ci przyjdzie do głowy, wpisz to powyżej.')) + '</section>';
}

function noteToTask(state, note, date) {
  const task = C.makeTask({ title: note.text.slice(0, 160), tier: 'micro', category: 'life', date });
  state.tasks.push(task);
  note.archived = true;
  note.convertedAt = Date.now();
  return task;
}

/* ───────────── Evening review ───────────── */

let queue = [], reviewTotal = 0, reviewStats = { today: 0, tomorrow: 0, dropped: 0 };

function startReview(ctx) {
  const s = ctx.state(), day = today();
  queue = [
    ...openNotes().map(n => ({ kind: 'note', id: n.id })),
    ...s.tasks.filter(t => !t.archived && t.repeat === 'none' && C.eligible(t, day) && !C.completion(s, t, day)).map(t => ({ kind: 'task', id: t.id })),
  ];
  reviewTotal = queue.length;
  reviewStats = { today: 0, tomorrow: 0, dropped: 0 };
  showReview(ctx);
}

function locked(s, id) { return s.ledger.some(e => e.taskId === id && ['step', 'complete'].includes(e.kind)); }

function showReview(ctx) {
  const s = ctx.state();
  while (queue.length) {
    const item = queue[0];
    const exists = item.kind === 'note' ? extra.notes.find(n => n.id === item.id && !n.archived) : s.tasks.find(t => t.id === item.id && !t.archived);
    if (exists) break;
    queue.shift();
  }
  if (!queue.length) {
    const { today: a, tomorrow: b, dropped: c } = reviewStats;
    ctx.modal('Głowa jest lżejsza.', '<p class="subtext">' + (reviewTotal ? 'Dziś: ' + a + ' · Jutro: ' + b + ' · Puszczone: ' + c + '.' : 'Nie ma nic do przeglądu. Można odpocząć.') + '</p><div class="form-actions"><button class="btn primary" data-action="close">Dobranoc ☾</button></div>');
    return;
  }
  const item = queue[0], position = reviewTotal - queue.length + 1;
  if (item.kind === 'note') {
    const n = extra.notes.find(n => n.id === item.id);
    ctx.modal('Przegląd · ' + position + '/' + reviewTotal, '<div class="x-review-card"><div class="eyebrow">MYŚL</div><p class="x-review-text">' + esc(n.text) + '</p></div><div class="x-review-actions"><button class="btn primary" data-action="x-rv" data-do="today">Zrobię dziś</button><button class="btn purple" data-action="x-rv" data-do="tomorrow">Jutro</button><button class="btn" data-action="x-rv" data-do="drop">Puszczam</button></div>');
  } else {
    const t = s.tasks.find(t => t.id === item.id), fixed = locked(s, t.id);
    ctx.modal('Przegląd · ' + position + '/' + reviewTotal, '<div class="x-review-card"><div class="eyebrow">NIEDOKOŃCZONE</div><p class="x-review-text">' + esc(t.title) + '</p>' + (fixed ? '<p class="subtext tiny">Zadanie jest już rozpoczęte, więc nie zmieniamy jego daty.</p>' : '') + '</div><div class="x-review-actions"><button class="btn primary" data-action="x-rv" data-do="today">Zostaje na dziś</button><button class="btn purple" data-action="x-rv" data-do="tomorrow" ' + (fixed ? 'disabled' : '') + '>Przenieś na jutro</button><button class="btn" data-action="x-rv" data-do="drop">Do archiwum</button></div>');
  }
}

function reviewDecision(ctx, choice) {
  const s = ctx.state(), item = queue.shift();
  if (!item) return;
  if (item.kind === 'note') {
    const n = extra.notes.find(n => n.id === item.id);
    if (!n) return showReview(ctx);
    if (choice === 'drop') { n.archived = true; reviewStats.dropped++; }
    else { noteToTask(s, n, choice === 'today' ? today() : tomorrow()); reviewStats[choice]++; }
    saveExtra(); ctx.save();
  } else {
    const t = s.tasks.find(t => t.id === item.id);
    if (t) {
      if (choice === 'drop') { t.archived = true; reviewStats.dropped++; }
      else if (choice === 'tomorrow') { t.date = tomorrow(); reviewStats.tomorrow++; }
      else reviewStats.today++;
      ctx.save();
    }
  }
  ctx.render();
  showReview(ctx);
}

/* ───────────── Body doubling ───────────── */

const BUDDY = {
  idle: ['Siedzę obok. Zaczniemy od jednego kroku?', 'Nie musisz być w formie. Wystarczą 2 minuty.', 'Wybierz zadanie, a ja posiedzę z Tobą.'],
  run: ['Jestem obok. Pracujemy.', 'Tylko ten jeden krok. Reszta poczeka.', 'Dobrze Ci idzie. Bez pośpiechu.', 'Myśl ucieka? Zapisz ją w Zrzucie i wróć.', 'Oddech. Ramiona w dół. Dalej.', 'Nie musi być idealnie. Ma być zrobione.'],
  paused: ['Pauza jest w porządku. Poczekam.'],
  done: ['Czas minął. Byłeś przy zadaniu. To się liczy.'],
};
const RING = 2 * Math.PI * 52;

function spark(mode) {
  return '<svg class="x-spark ' + mode + '" id="x-spark" viewBox="0 0 140 140" role="img" aria-label="Iskra, Twój towarzysz skupienia"><defs><radialGradient id="x-glow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#f3d49b" stop-opacity=".55"/><stop offset="1" stop-color="#f3d49b" stop-opacity="0"/></radialGradient><linearGradient id="x-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9defc"/><stop offset="1" stop-color="#9f8fe0"/></linearGradient></defs><circle class="x-halo" cx="70" cy="66" r="62" fill="url(#x-glow)"/><ellipse cx="70" cy="127" rx="30" ry="5" fill="#0a0c18" opacity=".45"/><g class="x-float"><path d="M70 16c24 0 42 19 42 45 0 27-13 45-42 55C41 106 28 88 28 61c0-26 18-45 42-45z" fill="url(#x-body)"/><path d="M70 10c2 7 7 10 7 15s-3 7-7 7-7-3-7-7 5-8 7-15z" fill="#f3d49b"/><g class="x-eyes-open"><ellipse cx="54" cy="64" rx="5" ry="7" fill="#1b1f33"/><ellipse cx="86" cy="64" rx="5" ry="7" fill="#1b1f33"/><circle cx="56" cy="61" r="1.8" fill="#fff"/><circle cx="88" cy="61" r="1.8" fill="#fff"/></g><g class="x-eyes-closed"><path d="M48 66q6 5 12 0M80 66q6 5 12 0" stroke="#1b1f33" stroke-width="3" fill="none" stroke-linecap="round"/></g><path d="M62 82q8 7 16 0" stroke="#1b1f33" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="45" cy="78" rx="6" ry="3.5" fill="#edb8d5" opacity=".6"/><ellipse cx="95" cy="78" rx="6" ry="3.5" fill="#edb8d5" opacity=".6"/></g></svg>';
}

let ambient = null;
export function setAmbient(on, win = globalThis.window) {
  if (ambient) { try { ambient.src.stop(); ambient.ctx.close(); } catch { /* already closed */ } ambient = null; }
  if (!on) return false;
  const AC = win?.AudioContext || win?.webkitAudioContext;
  if (!AC) return false;
  try {
    const ctx = new AC(), len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
    const src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = buf; src.loop = true; gain.gain.value = 0.16;
    src.connect(gain); gain.connect(ctx.destination); src.start();
    ambient = { src, ctx };
    return true;
  } catch { return false; }
}

function buddyLine(state, now = Date.now()) {
  const f = state.focus;
  if (!f) return { mode: 'idle', text: BUDDY.idle[Math.floor(now / 60000) % BUDDY.idle.length] };
  const left = C.remaining(f, now);
  if (left === 0) return { mode: 'done', text: BUDDY.done[0] };
  if (f.paused) return { mode: 'paused', text: BUDDY.paused[0] };
  const elapsed = f.duration - left;
  return { mode: 'run', text: BUDDY.run[Math.floor(elapsed / 45000) % BUDDY.run.length] };
}

const clock = ms => { const s = Math.ceil(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

export function focusView(state) {
  const f = state.focus, line = buddyLine(state), day = today();
  const tasks = state.tasks.filter(t => C.eligible(t, day) && !C.completion(state, t, day));
  const stats = I.focusStats(state);
  const left = f ? C.remaining(f) : 0, progress = f ? 1 - left / f.duration : 0;
  const task = f && state.tasks.find(t => t.id === f.taskId);
  const controls = f
    ? '<div class="x-buddy-timer"><svg viewBox="0 0 120 120" class="x-ring" aria-hidden="true"><circle cx="60" cy="60" r="52" class="x-ring-bg"/><circle cx="60" cy="60" r="52" class="x-ring-fg" id="x-ring" stroke-dasharray="' + RING.toFixed(1) + '" stroke-dashoffset="' + (RING * (1 - progress)).toFixed(1) + '"/></svg><div class="x-ring-text"><strong id="x-buddy-time" role="timer">' + clock(left) + '</strong><small>' + esc(task?.title || 'Chwila skupienia') + '</small></div></div><div class="x-buddy-actions">' +
      (left === 0 ? '<button class="btn primary" data-action="focus-finish">Zapisz sesję ✓</button>' : '<button class="btn" data-action="focus-pause">' + (f.paused ? 'Wznów' : 'Pauza') + '</button>') + '<button class="btn link" data-action="focus-stop">Zakończ bez zapisu</button></div>'
    : '<label class="field x-pick-field">Nad czym pracujemy?<select id="x-buddy-task"><option value="">Chwila skupienia, bez zadania</option>' + tasks.map(t => '<option value="' + esc(t.id) + '">' + esc(t.title) + '</option>').join('') + '</select></label><div class="x-durations" role="group" aria-label="Czas sesji">' + [2, 5, 15, 25].map(n => '<button class="x-duration" data-action="x-buddy-start" data-min="' + n + '"><strong>' + n + '</strong><small>min</small></button>').join('') + '</div>';
  return tipCard() + '<div class="dashboard"><div class="stack"><section class="panel x-buddy"><div class="x-buddy-stage">' + spark(line.mode) + '</div><div class="x-buddy-body"><div class="eyebrow">POPRACUJMY RAZEM</div><h2>Iskra siedzi obok</h2><p class="x-buddy-msg" id="x-buddy-msg" aria-live="off">' + esc(line.text) + '</p>' + controls + '<button class="btn small x-ambient" data-action="x-ambient" aria-pressed="' + !!ambient + '">' + (ambient ? '♪ Szum włączony' : '♪ Włącz szum w tle') + '</button></div></section><div data-co-slot id="slot-pick"></div></div>' +
    '<div class="stack"><section class="panel"><div class="section-line"><h3>Twoje skupienie</h3><span class="tiny muted">łącznie</span></div><div class="stats"><div class="stat"><strong>' + stats.sessions + '</strong><small>sesji</small></div><div class="stat"><strong>' + stats.minutes + '</strong><small>minut</small></div><div class="stat"><strong>' + stats.average + '</strong><small>śr. min</small></div></div><p class="subtext tiny">Sesja nie zalicza zadania. Punkty daje dopiero wykonany krok.</p></section></div></div>';
}

/** Updates the live parts of the body-doubling panel once a second without re-rendering. */
export function tick(state, doc) {
  const time = doc.querySelector('#x-buddy-time');
  if (!state.focus && ambient) setAmbient(false);
  if (!time) return;
  const f = state.focus;
  if (!f) return;
  const left = C.remaining(f);
  time.textContent = clock(left);
  const ring = doc.querySelector('#x-ring');
  if (ring) ring.style.strokeDashoffset = String(RING * left / f.duration);
  const line = buddyLine(state), msg = doc.querySelector('#x-buddy-msg'), svg = doc.querySelector('#x-spark');
  if (msg && msg.textContent !== line.text) msg.textContent = line.text;
  if (svg) svg.setAttribute('class', 'x-spark ' + line.mode);
}

/* ───────────── Mood and habits ───────────── */

const FACES = [['😞', 'Ciężko'], ['😕', 'Słabo'], ['😐', 'Tak sobie'], ['🙂', 'Dobrze'], ['😄', 'Świetnie']];
const dayPart = () => new Date().getHours() < 15 ? 'am' : 'pm';

export function moodCard() {
  const part = dayPart(), entry = extra.moods.find(m => m.day === today() && m.part === part) || {};
  const faces = FACES.map(([face, label], i) => '<button class="x-face' + (entry.mood === i + 1 ? ' on' : '') + '" data-action="x-mood" data-kind="mood" data-v="' + (i + 1) + '" aria-label="Nastrój: ' + label + '" aria-pressed="' + (entry.mood === i + 1) + '"><span>' + face + '</span><small>' + label + '</small></button>').join('');
  const bars = [1, 2, 3, 4, 5].map(v => '<button class="x-level' + (entry.energy === v ? ' on' : '') + '" data-action="x-mood" data-kind="energy" data-v="' + v + '" aria-label="Energia ' + v + ' z 5" aria-pressed="' + (entry.energy === v) + '"><i style="height:' + (6 + v * 5) + 'px"></i></button>').join('');
  return '<section class="panel x-mood"><div class="section-line"><div><div class="eyebrow">' + (part === 'am' ? 'PIERWSZA POŁOWA DNIA' : 'DRUGA POŁOWA DNIA') + '</div><h2>Jak Ci teraz?</h2></div></div><div class="x-faces">' + faces + '</div><div class="x-energy-row"><span class="tiny muted">Energia</span><div class="x-levels">' + bars + '</div></div><p class="subtext tiny">To Twoja deklaracja, nie pomiar. Po tygodniu zobaczysz swój rytm w zakładce Postęp.</p></section>';
}

export function habitsCard() {
  const habits = extra.habits.filter(h => !h.archived), days = I.lastDays(7);
  return '<section class="panel x-habits"><div class="section-line"><h2>Małe rytuały</h2><span class="tiny muted">bez punktów, bez presji</span></div>' +
    (habits.length ? habits.map(h => '<div class="x-habit"><button class="x-tick' + (h.days[today()] ? ' on' : '') + '" data-action="x-habit" data-id="' + esc(h.id) + '" aria-pressed="' + !!h.days[today()] + '" aria-label="' + esc(h.name) + ': dzisiaj">' + (h.days[today()] ? '✓' : '') + '</button><div class="x-habit-name"><strong>' + esc(h.name) + '</strong><span class="x-dots" aria-hidden="true">' + days.map(d => '<i class="' + (h.days[d] ? 'on' : '') + '"></i>').join('') + '</span></div><button class="icon-button" data-action="x-habit-del" data-id="' + esc(h.id) + '" aria-label="Usuń rytuał ' + esc(h.name) + '">×</button></div>').join('') : '<p class="subtext">Np. spacer, rozciąganie, szklanka wody, czytanie. Wybierz to, co chcesz widzieć.</p>') +
    (habits.length < 8 ? '<form id="x-habit-form" class="x-inline"><label class="x-sr" for="x-habit-input">Nowy rytuał</label><input id="x-habit-input" name="name" maxlength="50" required placeholder="Nowy rytuał" autocomplete="off"><button class="btn small" type="submit">＋ Dodaj</button></form>' : '') + '</section>';
}

/* ───────────── Routines ───────────── */

export function routinesView() {
  return '<section class="panel x-intro"><div class="section-line"><div><div class="eyebrow">GOTOWE ŁAŃCUCHY KROKÓW</div><h2>Rutyny</h2></div><button class="btn primary small" data-action="x-routine-new">＋ Własna rutyna</button></div><p class="subtext">Jedno dotknięcie zamienia rutynę w zadanie z małymi krokami. Nagrody liczą się jak zawsze.</p></section><div class="x-grid">' +
    extra.routines.map(r => '<article class="panel x-routine"><div class="section-line"><h3>' + esc(r.name) + '</h3><button class="icon-button" data-action="x-routine-edit" data-id="' + esc(r.id) + '" aria-label="Edytuj rutynę ' + esc(r.name) + '">⋯</button></div><ol>' + r.steps.slice(0, 6).map(s => '<li>' + esc(s) + '</li>').join('') + (r.steps.length > 6 ? '<li class="muted">… i ' + (r.steps.length - 6) + ' więcej</li>' : '') + '</ol><div class="x-routine-actions"><button class="btn primary small" data-action="x-routine-run" data-id="' + esc(r.id) + '">Uruchom dziś</button><button class="btn small" data-action="x-routine-daily" data-id="' + esc(r.id) + '">↻ Codziennie</button></div></article>').join('') + '</div>';
}

function routineForm(ctx, id) {
  const r = extra.routines.find(r => r.id === id);
  ctx.modal(r ? 'Twoja rutyna' : 'Nowa rutyna', '<form id="x-routine-form" data-id="' + esc(id || '') + '"><label class="field">Nazwa<input name="name" required maxlength="80" value="' + esc(r?.name || '') + '" placeholder="Np. Start pracy"></label><label class="field">Kroki, każdy w nowej linii (do 12)<textarea name="steps" required rows="6" maxlength="1500">' + esc((r?.steps || []).join('\n')) + '</textarea></label><div class="form-actions">' + (r ? '<button class="btn danger" type="button" data-action="x-routine-delete" data-id="' + esc(r.id) + '">Usuń</button>' : '') + '<button class="btn primary" type="submit">Zapisz rutynę</button></div></form>');
}

function launchRoutine(ctx, r, repeat) {
  const s = ctx.state(), day = today();
  const same = s.tasks.find(t => !t.archived && t.title === r.name && (repeat === 'daily' ? t.repeat === 'daily' : C.eligible(t, day) && !C.completion(s, t, day)));
  if (same) { ctx.toast('To już jest na Twojej liście.'); return; }
  s.tasks.push(C.makeTask({ title: r.name, tier: 'normal', category: 'self', date: day, repeat, steps: r.steps }));
  ctx.save(); ctx.render();
  ctx.toast(repeat === 'daily' ? 'Rutyna będzie wracać codziennie.' : 'Rutyna czeka w planie na dziś.');
}

/* ───────────── Bosses ───────────── */

const KINDS = {
  shade: ['Cień', '<path d="M50 8c-19 0-31 15-31 34v44l8-6 8 8 7-8 8 8 7-8 8 8 8-6V42C77 23 69 8 50 8z" fill="currentColor"/><circle cx="39" cy="42" r="5.5" fill="#101322"/><circle cx="61" cy="42" r="5.5" fill="#101322"/><ellipse cx="50" cy="60" rx="7" ry="5" fill="#101322"/>'],
  bat: ['Nietoperz', '<path d="M50 34c-4 0-7-3-7-8l-5 7L6 18c2 17 6 32 16 38 6-4 13-2 17 5l11-10 11 10c4-7 11-9 17-5 10-6 14-21 16-38L62 33l-5-7c0 5-3 8-7 8z" fill="currentColor" transform="translate(0 6)"/><circle cx="44" cy="45" r="3" fill="#101322"/><circle cx="56" cy="45" r="3" fill="#101322"/>'],
  spider: ['Pająk', '<g stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M38 46L18 32 6 44M38 54L12 56 8 72M40 62L22 78 24 90M44 66L36 88"/><path d="M62 46l20-14 12 12M62 54l26 2 4 16M60 62l18 16-2 12M56 66l8 22"/></g><circle cx="50" cy="60" r="17" fill="currentColor"/><circle cx="50" cy="38" r="11" fill="currentColor"/><circle cx="45" cy="36" r="2.5" fill="#101322"/><circle cx="55" cy="36" r="2.5" fill="#101322"/>'],
  skull: ['Czaszka', '<path d="M50 8C29 8 17 22 17 40c0 11 5 18 13 23v17h40V63c8-5 13-12 13-23C83 22 71 8 50 8z" fill="currentColor"/><ellipse cx="38" cy="43" rx="8" ry="9" fill="#101322"/><ellipse cx="62" cy="43" rx="8" ry="9" fill="#101322"/><path d="M50 52l-5 9h10z" fill="#101322"/><path d="M39 70v10M50 70v10M61 70v10" stroke="#101322" stroke-width="3"/>'],
};

const creature = (kind, hp) => '<svg class="x-creature" viewBox="0 0 100 100" style="--hp:' + (hp / 100).toFixed(2) + '" aria-hidden="true">' + (KINDS[kind] || KINDS.shade)[1] + '</svg>';

export function bossesView(state) {
  const active = extra.bosses.filter(b => !b.defeatedAt && !b.archived), won = extra.bosses.filter(b => b.defeatedAt);
  return '<section class="panel x-intro"><div class="section-line"><div><div class="eyebrow">WIĘKSZY CEL, MAŁE CIOSY</div><h2>Wyprawy</h2></div>' + (active.length < C.BOSS.maxActive ? '<button class="btn primary small" data-action="x-boss-new">＋ Nowy boss</button>' : '') + '</div><p class="subtext">Duży projekt to boss. Każdy mały krok to cios: +' + C.BOSS.blow.xp + ' XP, +' + C.BOSS.blow.coins + ' monet, +' + C.BOSS.blow.materials + ' mat. Pokonanie daje premię (' + C.BOSS.defeat.coins + ' monet, ' + C.BOSS.defeat.materials + ' mat.).</p></section>' +
    (active.length ? '<div class="x-grid">' + active.map(b => {
      const st = I.bossState(b);
      return '<article class="panel x-boss"><div class="x-boss-head">' + creature(b.kind, st.hp) + '<div><h3>' + esc(b.name) + '</h3><div class="x-hp" role="progressbar" aria-label="Życie bossa" aria-valuenow="' + st.hp + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + st.hp + '%"></i></div><small class="tiny muted">Życie ' + st.hp + '% · zostało ' + st.left + ' z ' + st.total + ' ' + plural(st.total, 'ciosu', 'ciosów', 'ciosów') + '</small></div></div><div class="x-blows">' +
        b.blows.map((bl, i) => '<button class="x-blow' + (bl.done ? ' done' : '') + '" data-action="x-blow" data-id="' + esc(b.id) + '" data-i="' + i + '" ' + (bl.done ? 'disabled' : '') + '><span class="x-blow-mark">' + (bl.done ? '✓' : '⚔') + '</span><span>' + esc(bl.text) + '</span></button>').join('') + '</div><button class="btn link small" data-action="x-boss-drop" data-id="' + esc(b.id) + '">Porzuć wyprawę</button></article>';
    }).join('') + '</div>' : '<section class="panel">' + empty('♞', 'Brak aktywnych wypraw.', 'Wybierz jeden większy cel i rozbij go na kilka ciosów.') + '</section>') +
    (won.length ? '<section class="panel"><div class="section-line"><h3>Trofea</h3><span class="tiny muted">' + won.length + '</span></div><div class="x-trophies">' + won.slice().reverse().map(b => '<div class="x-trophy">' + creature(b.kind, 100) + '<strong>' + esc(b.name) + '</strong><small>' + esc(C.dayKey(new Date(b.defeatedAt))) + '</small></div>').join('') + '</div></section>' : '');
}

function bossForm(ctx) {
  ctx.modal('Nowy boss', '<form id="x-boss-form"><label class="field">Jak się nazywa?<input name="name" required maxlength="80" placeholder="Np. Góra papierów"></label><fieldset class="x-kinds"><legend>Wygląd</legend>' + Object.entries(KINDS).map(([k, [label]], i) => '<label class="x-kind"><input type="radio" name="kind" value="' + k + '" ' + (i === 0 ? 'checked' : '') + '>' + creature(k, 100) + '<span>' + label + '</span></label>').join('') + '</fieldset><label class="field">Ciosy, każdy w nowej linii (2–' + C.BOSS.maxBlows + ')<textarea name="blows" required rows="5" maxlength="1200" placeholder="Zebrać dokumenty&#10;Zrobić oględziny&#10;Napisać opis"></textarea></label><div class="form-actions"><button class="btn primary" type="submit">Rozpocznij wyprawę</button></div></form>');
}

function strike(ctx, bossId, i) {
  const s = ctx.state(), boss = extra.bosses.find(b => b.id === bossId), blow = boss?.blows[i];
  if (!boss || !blow || blow.done || boss.defeatedAt) return;
  blow.done = Date.now();
  C.awardBoss(s, 'Cios: ' + blow.text.slice(0, 150), C.BOSS.blow, 'blow|' + boss.id + '|' + i);
  const defeated = boss.blows.every(b => b.done);
  if (defeated) { boss.defeatedAt = Date.now(); C.awardBoss(s, 'Pokonany boss: ' + boss.name.slice(0, 150), C.BOSS.defeat, 'boss|' + boss.id); }
  saveExtra(); ctx.save(); ctx.render();
  if (defeated) { ctx.celebrate(); ctx.toast('Boss pokonany: ' + boss.name + '! Premia dopisana.'); }
  else ctx.toast('Cios! Życie bossa: ' + I.bossState(boss).hp + '%.');
}

/* ───────────── Progress ───────────── */

export function attributesCard(state) {
  const a = I.attributes(state), max = Math.max(5, ...Object.values(a.counts));
  return '<section class="panel"><div class="section-line"><div><div class="eyebrow">TWOJA KLASA</div><h2>' + a.title + '</h2></div><span class="tiny muted">' + a.total + ' kroków</span></div>' + I.ATTRIBUTES.map(x => '<div class="x-attr"><div class="row between"><strong>' + x.name + '</strong><span class="tiny muted">' + a.counts[x.id] + '</span></div><div class="track"><div class="fill" style="width:' + (a.counts[x.id] / max * 100) + '%"></div></div><small class="tiny muted">' + x.note + '</small></div>').join('') + '</section>';
}

export function badgesView(state) {
  const list = A.list(state, extra), n = list.filter(b => b.earned).length;
  return '<section class="panel x-intro"><div class="section-line"><div><div class="eyebrow">ODZNAKI</div><h2>' + n + ' z ' + list.length + '</h2></div></div><div class="track"><div class="fill" style="width:' + (n / list.length * 100) + '%"></div></div><p class="subtext">Odznaki nagradzają także powrót po przerwie, nie tylko ciągłość.</p></section><div class="x-badges">' +
    list.map(b => '<article class="x-badge' + (b.earned ? ' earned' : '') + '"><div class="x-medal" aria-hidden="true">' + b.icon + '</div><strong>' + b.name + '</strong><p>' + b.desc + '</p>' + (b.earned ? '<small>' + (extra.badges[b.id] ? esc(C.dayKey(new Date(extra.badges[b.id]))) : 'Zdobyta') + '</small>' : '<div class="track"><div class="fill" style="width:' + (b.value / b.goal * 100) + '%"></div></div><small>' + b.value + ' / ' + b.goal + '</small>') + '</article>').join('') + '</div>';
}

function moodChart(series) {
  const W = 560, H = 160, L = 26, R = 8, T = 10, B = 26, x = i => L + i * (W - L - R) / (series.length - 1), y = v => T + (5 - v) * (H - T - B) / 4;
  const path = key => { let d = '', pen = false; series.forEach((p, i) => { if (p[key] == null) { pen = false; return; } d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p[key]).toFixed(1); pen = true; }); return d; };
  const dots = (key, cls) => series.map((p, i) => p[key] == null ? '' : '<circle class="' + cls + '" cx="' + x(i).toFixed(1) + '" cy="' + y(p[key]).toFixed(1) + '" r="3.4"/>').join('');
  return '<svg class="x-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Nastrój i energia z ostatnich 14 dni">' + [1, 2, 3, 4, 5].map(v => '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="x-grid-line"/><text x="6" y="' + (y(v) + 4) + '" class="x-axis">' + v + '</text>').join('') +
    series.map((p, i) => i % 2 === 0 ? '<text x="' + x(i) + '" y="' + (H - 7) + '" text-anchor="middle" class="x-axis">' + p.day.slice(8) + '.' + p.day.slice(5, 7) + '</text>' : '').join('') +
    '<path d="' + path('energy') + '" class="x-line energy"/><path d="' + path('mood') + '" class="x-line mood"/>' + dots('energy', 'x-dot energy') + dots('mood', 'x-dot mood') + '</svg>';
}

function hourChart(bins) {
  const max = Math.max(1, ...bins), W = 560, H = 120, bw = (W - 20) / 24;
  return '<svg class="x-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Kiedy wykonujesz najwięcej kroków, według godzin">' + bins.map((v, h) => '<rect x="' + (10 + h * bw + 2).toFixed(1) + '" y="' + (H - 22 - v / max * (H - 36)).toFixed(1) + '" width="' + (bw - 4).toFixed(1) + '" height="' + (v / max * (H - 36)).toFixed(1) + '" rx="3" class="x-bar' + (v === max ? ' top' : '') + '"/>' + (h % 3 === 0 ? '<text x="' + (10 + h * bw + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle" class="x-axis">' + h + '</text>' : '')).join('') + '</svg>';
}

export function rhythmView(state) {
  const series = I.moodSeries(extra), hasMood = series.some(p => p.mood != null || p.energy != null), bins = I.hourHistogram(state), best = I.bestHours(bins), fs = I.focusStats(state);
  const hh = h => String(h).padStart(2, '0') + ':00';
  return '<section class="panel"><div class="section-line"><div><div class="eyebrow">OSTATNIE 14 DNI</div><h2>Nastrój i energia</h2></div><span class="x-legend"><i class="mood"></i>nastrój <i class="energy"></i>energia</span></div>' + (hasMood ? moodChart(series) : empty('◐', 'Jeszcze nic nie zapisano.', 'Zaznacz nastrój w zakładce Dzisiaj → Ja. Po kilku dniach zobaczysz wzór.')) + '</section>' +
    '<section class="panel"><div class="section-line"><div><div class="eyebrow">KIEDY DZIAŁASZ</div><h2>Twoje najlepsze godziny</h2></div></div>' + (best ? hourChart(bins) + '<p class="subtext">Najwięcej robisz między <strong>' + hh(best.from) + '</strong> a <strong>' + hh(best.to) + '</strong>. Spróbuj tam stawiać trudniejsze rzeczy.</p>' : empty('◷', 'Za mało danych.', 'Wykonaj kilka kroków, a pokażemy Twoje najlepsze godziny.')) + '</section>' +
    '<section class="panel"><div class="section-line"><h3>Sesje skupienia</h3></div><div class="stats"><div class="stat"><strong>' + fs.sessions + '</strong><small>sesji</small></div><div class="stat"><strong>' + fs.average + '</strong><small>śr. minut</small></div><div class="stat"><strong>' + fs.longest + '</strong><small>najdłuższa</small></div></div></section>';
}


/* ───────────── Planner ───────────── */

let planWindow = 120;
const hm = t => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
const TIER_LABEL = { micro: 'mały krok', normal: 'zadanie', big: 'wyzwanie' };

export function plannerView(state) {
  const plan = P.buildPlan(state, { minutes: planWindow });
  const energy = { low: 'Niska energia: zaczynasz od małych rzeczy.', medium: 'Energia w sam raz: rzeczy średniej wielkości na początek.', high: 'Masz moc: najcięższe rzeczy idą pierwsze.' }[plan.energy];
  return '<section class="panel x-intro"><div class="section-line"><div><div class="eyebrow">PLANER DNIA</div><h2>Ile masz czasu?</h2></div></div><div class="x-durations x-windows" role="group" aria-label="Okno czasu">' +
    [[60, '1 godz.'], [120, '2 godz.'], [240, '4 godz.'], [480, 'Cały dzień']].map(([m, l]) => '<button class="x-duration' + (planWindow === m ? ' on' : '') + '" data-action="x-plan-window" data-min="' + m + '" aria-pressed="' + (planWindow === m) + '"><strong>' + l + '</strong></button>').join('') +
    '</div><p class="subtext tiny">' + energy + ' Co 25 minut pracy wpisuję 5 minut przerwy.</p></section>' +
    '<section class="panel">' + (plan.blocks.length ? '<div class="section-line"><h3>Plan: ' + plan.planned + ' z ' + plan.total + '</h3><span class="tiny muted">do ' + hm(plan.blocks.at(-1).end) + '</span></div><div class="x-timeline">' +
      plan.blocks.map(b => b.type === 'break'
        ? '<div class="x-block break"><time>' + hm(b.start) + '</time><span>Przerwa ' + b.minutes + ' min. Woda, ruch, oddech.</span></div>'
        : '<div class="x-block"><time>' + hm(b.start) + '</time><div class="x-block-main"><strong>' + esc(b.title) + '</strong><small>' + TIER_LABEL[b.tier] + ' · ' + b.minutes + ' min</small></div><div class="x-block-actions"><button class="btn small primary" data-action="x-plan-start" data-id="' + esc(b.taskId) + '" data-min="' + b.minutes + '">Start</button><button class="btn small" data-action="complete" data-id="' + esc(b.taskId) + '" aria-label="Oznacz jako zrobione: ' + esc(b.title) + '">✓</button></div></div>').join('') +
      '</div>' + (plan.left ? '<p class="subtext tiny">' + plan.left + ' ' + plural(plan.left, 'rzecz nie mieści', 'rzeczy nie mieszczą', 'rzeczy nie mieści') + ' się w tym czasie. To dobra okazja, by coś puścić albo przenieść na jutro.</p>' : '')
      : empty('☷', plan.total ? 'Nic się nie mieści w tym oknie.' : 'Nie ma nic do zaplanowania.', plan.total ? 'Wybierz dłuższe okno albo zmniejsz zadania.' : 'Dodaj zadanie albo wylosuj pomysł w generatorze.')) + '</section>';
}

/* ───────────── "What now?" — one thing at a time ───────────── */

let nowSkip = 0;

export function nowCard(state) {
  const n = P.nextThing(state, { skip: nowSkip, names: extra.names });
  if (!n) return '';
  const done = n.kind === 'task' ? '<button class="btn" data-action="complete" data-id="' + esc(n.task.id) + '">Już zrobione ✓</button>' : '';
  return '<section class="panel x-now"><div class="eyebrow">CO TERAZ?</div><p class="x-now-hint">Zrób dziś tylko jedną z tych rzeczy. Resztę możesz zostawić na później.</p><h2 class="x-now-title">' + esc(n.title) + '</h2>' +
    '<p class="x-now-meta">' + TIER_LABEL[n.tier] + ' · zaczynasz od 5 minut' + (n.kind === 'idea' ? ' · nowy pomysł' : '') + '</p>' +
    '<button class="btn primary x-now-go" data-action="x-now-start">▶ Zaczynam</button>' +
    '<div class="x-note-actions x-now-more"><button class="btn" data-action="x-now-next">Inna rzecz ↻</button>' + done + '</div></section>';
}

/* ───────────── Procrastination guard ───────────── */

export function guardCard(state) {
  const stale = G.postponed(state).slice(0, 3), nudge = G.idleNudge(state);
  if (!stale.length && !nudge) return '';
  const first = stale[0]?.task || P.candidates(state)[0];
  const startBtn = t => '<button class="btn small primary" data-action="x-guard-two" data-id="' + esc(t.id) + '">2 minuty</button>';
  return '<section class="panel x-guard"><div class="section-line"><div><div class="eyebrow">STRAŻNIK ODKŁADANIA</div><h2>' + (stale.length ? 'Te sprawy czekają najdłużej' : 'Dzień się rozkręca') + '</h2></div></div>' +
    (nudge && first ? '<p class="subtext">Jeszcze nic dziś nie zrobiłeś. To w porządku. Wystarczą dwie minuty z jedną rzeczą.' + (stale.length ? '' : ' ' + esc(first.title) + '?') + '</p>' + (stale.length ? '' : '<div class="x-note-actions">' + startBtn(first) + '</div>') : '') +
    stale.map(({ task: t, days, touched }) => '<article class="x-note"><p><strong>' + esc(t.title) + '</strong><br><small class="muted">odkładane od ' + days + ' ' + plural(days, 'dnia', 'dni', 'dni') + '</small></p><div class="x-note-actions">' + startBtn(t) +
      (!touched && !t.steps.length ? '<button class="btn small" data-action="x-guard-split" data-id="' + esc(t.id) + '">Rozbij</button>' : '') +
      (!touched ? '<button class="btn small" data-action="x-guard-tomorrow" data-id="' + esc(t.id) + '">Jutro</button>' : '') +
      '<button class="btn small link" data-action="x-guard-drop" data-id="' + esc(t.id) + '">Puść</button></div></article>').join('') + '</section>';
}

/* ───────────── Generator and quick points ───────────── */

let genOpts = { area: 'life', minutes: 15, energy: 'medium', seed: 1 };

export function generatorView(state) {
  const ideas = GEN.suggest({ ...genOpts, count: 3, names: extra.names });
  const seg = (key, items) => '<div class="x-chips" role="group">' + items.map(([v, l]) => '<button class="x-chip' + (genOpts[key] === v ? ' on' : '') + '" data-action="x-gen-opt" data-key="' + key + '" data-v="' + v + '" aria-pressed="' + (genOpts[key] === v) + '">' + l + '</button>').join('') + '</div>';
  return '<section class="panel x-intro"><div class="section-line"><div><div class="eyebrow">NIE WIESZ, OD CZEGO ZACZĄĆ?</div><h2>Generator zadań</h2></div></div><label class="x-sr">Obszar</label>' + seg('area', GEN.AREAS) + '<label class="x-sr">Czas</label>' + seg('minutes', [[5, '5 min'], [15, '15 min'], [30, '30 min']]) + '<label class="x-sr">Energia</label>' + seg('energy', [['low', 'Niska'], ['medium', 'W sam raz'], ['high', 'Mam moc']]) +
    '<div class="x-note-actions" style="margin-top:14px"><button class="btn purple" data-action="x-gen-roll">✧ Wylosuj inne</button></div></section>' +
    '<section class="panel"><div class="section-line"><h3>Propozycje</h3></div>' + (ideas.length ? ideas.map((x, i) => '<article class="x-note"><p><strong>' + esc(x.t) + '</strong><br><small class="muted">' + TIER_LABEL[x.tier] + ' · ok. ' + x.min + ' min</small></p><div class="x-note-actions"><button class="btn small primary" data-action="x-gen-add" data-i="' + i + '">Dodaj na dziś</button></div></article>').join('') : empty('✧', 'Brak pomysłów dla tych ustawień.', 'Zwiększ czas albo energię.')) + '</section>' +
    '<section class="panel"><div class="section-line"><h3>Rozbij własne zadanie</h3></div><p class="subtext tiny">Wpisz coś dużego, a podzielę to na małe kroki.</p><form id="x-split-form" class="x-inline"><label class="x-sr" for="x-split-input">Zadanie</label><input id="x-split-input" name="title" maxlength="120" required placeholder="Np. Zrobić operat dla klienta" autocomplete="off"><button class="btn primary" type="submit">Rozbij</button></form></section>';
}

const quickItems = () => GEN.QUICK.concat(extra.quick || []);

export function quickView(state) {
  const day = today(), done = q => state.tasks.some(t => t.title === q.title && t.date === day && C.completion(state, t, day));
  const groups = [['life', 'Dom'], ['self', 'Dla siebie']];
  return '<section class="panel x-intro"><div class="section-line"><div><div class="eyebrow">JEDNO DOTKNIĘCIE</div><h2>Szybkie punkty</h2></div></div><p class="subtext">Zrobiłeś coś w domu albo dla siebie? Zapisz to i odbierz punkty. Każdą czynność możesz zapisać raz dziennie.</p></section>' +
    groups.map(([cat, label]) => '<section class="panel"><div class="section-line"><h3>' + label + '</h3></div><div class="x-quick">' + quickItems().filter(q => q.category === cat).map(q => {
      const t = C.TIERS[q.tier], d = done(q);
      return '<button class="x-q' + (d ? ' done' : '') + '" data-action="x-quick" data-id="' + esc(q.id) + '" ' + (d ? 'disabled' : '') + '><span class="x-q-title">' + (d ? '✓ ' : '') + esc(q.title) + '</span><small>+' + t.xp + ' XP · +' + t.coins + ' monet</small></button>';
    }).join('') + '</div></section>').join('') +
    '<section class="panel"><div class="section-line"><h3>Własna czynność</h3></div><form id="x-quick-form" class="x-quick-form"><label class="field">Nazwa<input name="title" maxlength="60" required placeholder="Np. Podlanie kwiatów"></label><div class="x-quick-row"><label class="field">Obszar<select name="category"><option value="life">Dom</option><option value="self">Dla siebie</option></select></label><label class="field">Wielkość<select name="tier"><option value="micro">Mały krok</option><option value="normal" selected>Zadanie</option><option value="big">Wyzwanie</option></select></label></div><button class="btn primary" type="submit">＋ Dodaj do listy</button></form>' +
    ((extra.quick || []).length ? '<div class="x-chips" style="margin-top:12px">' + extra.quick.map(q => '<button class="x-chip" data-action="x-quick-del" data-id="' + esc(q.id) + '" aria-label="Usuń czynność ' + esc(q.title) + '">' + esc(q.title) + ' ×</button>').join('') + '</div>' : '') + '</section>';
}

export function rewardIdeas(state) {
  const have = new Set(state.rewards.filter(r => !r.archived).map(r => r.title));
  const ideas = GEN.REWARD_IDEAS.map((r, i) => [r, i]).filter(([r]) => !have.has(r[0]));
  if (!ideas.length) return '';
  return '<section class="panel"><div class="section-line"><h3>Pomysły na nagrody</h3><span class="tiny muted">dotknij, by dodać</span></div><div class="x-chips">' + ideas.map(([r, i]) => '<button class="x-chip" data-action="x-reward-idea" data-i="' + i + '">＋ ' + esc(r[0]) + ' · ' + r[1] + '</button>').join('') + '</div></section>';
}

/* ───────────── Names (stay on the device) ───────────── */

export function namesCard() {
  const n = extra.names || {};
  const sample = GEN.personalize('Zrób {partner:dat} mały, miły gest. Pobaw się z {kid:ins}.', n);
  return '<section class="panel"><div class="section-line"><div><div class="eyebrow">IMIONA W ZADANIACH</div><h3>Zadania mówią Twoim językiem</h3></div></div><p class="subtext tiny">Wpisz imię w mianowniku, a odmienię je sam. Jeśli odmiana wyjdzie źle, wpisz pięć form po przecinku: mianownik, dopełniacz, celownik, biernik, narzędnik. Imiona zostają tylko na Twoim urządzeniu.</p>' +
    '<form id="x-names-form" class="x-quick-form">' + GEN.NAME_FIELDS.map(([k, label]) => '<label class="field">' + label + '<input name="' + k + '" maxlength="150" value="' + esc(n[k] || '') + '" placeholder="' + esc(GEN.NAME_FIELDS.find(f => f[0] === k)[2][0]) + '" autocomplete="off"></label>').join('') +
    '<p class="subtext tiny">Podgląd: ' + esc(sample) + '</p><button class="btn primary" type="submit">Zapisz imiona</button></form></section>';
}

/* ───────────── Tips and thought of the day ───────────── */

let tipOffset = 0, thoughtOffset = 0;

export function tipCard() {
  return '<section class="panel x-tip"><div class="eyebrow">WSKAZÓWKA NA SKUPIENIE</div><p class="x-tip-text">' + esc(tipOfDay(today(), tipOffset)) + '</p><div class="x-note-actions"><button class="btn small" data-action="x-tip-next">Inna wskazówka ↻</button></div></section>';
}

export function thoughtCard() {
  return '<section class="x-thought" aria-label="Myśl dnia"><span class="x-thought-mark" aria-hidden="true">✦</span><div><div class="eyebrow">MYŚL DNIA</div><p>' + esc(thoughtOfDay(today(), thoughtOffset)) + '</p></div><button class="x-thought-next" data-action="x-thought-next" aria-label="Inna myśl">↻</button></section>';
}

/* ───────────── Facts and DIY ───────────── */

let factOffset = 0;

export function factsView() {
  const f = factOfDay(today(), factOffset);
  return thoughtCard() + '<section class="panel x-fact"><div class="eyebrow">' + esc(f.tag).toUpperCase() + ' · CIEKAWOSTKA' + (factOffset ? '' : ' DNIA') + '</div><p class="x-fact-text">' + esc(f.t) + '</p><div class="x-note-actions"><button class="btn purple" data-action="x-fact-next">Kolejna ciekawostka →</button>' + (factOffset ? '<button class="btn link" data-action="x-fact-reset">Wróć do dzisiejszej</button>' : '') + '</div></section><p class="subtext tiny" style="text-align:center">Mała dawka ciekawości na dobry początek. Zebrane: ' + FACTS.length + '.</p>';
}

export function diyView() {
  return '<section class="panel x-intro"><div class="section-line"><div><div class="eyebrow">ZRÓB TO SAM</div><h2>Domowe sposoby na produktywność</h2></div></div><p class="subtext">Proste rzeczy z kartki, pudełka i minutnika. Dotknij, by zamienić pomysł w zadanie z krokami.</p></section><div class="x-grid">' +
    DIY.map(d => '<article class="panel x-diy"><h3>' + esc(d.title) + '</h3><p class="subtext tiny">' + esc(d.why) + '</p><ol>' + d.steps.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol><button class="btn small primary" data-action="x-diy-task" data-id="' + d.id + '">Zrób z tego zadanie</button></article>').join('') + '</div>';
}

/* ───────────── Badges, shortcuts and events ───────────── */

/** Records newly earned badges and returns their names for a toast. */
export function checkBadges(state) {
  const { changed, announce } = A.collectNew(state, extra);
  if (changed) saveExtra();
  return announce.map(b => b.name);
}

let wired = false;

export function init(ctx, doc = globalThis.document) {
  if (wired || !doc?.addEventListener) return;
  wired = true;
  const guard = fn => { try { fn(); } catch (e) { ctx.toast(e?.message || 'Nie udało się wykonać tej akcji.'); } };

  doc.addEventListener('submit', e => {
    const f = e.target, id = f?.id;
    if (!id || !id.startsWith('x-')) return;
    e.preventDefault();
    guard(() => {
      const data = new FormData(f);
      if (id === 'x-dump-form') {
        const text = String(data.get('text') || '').trim();
        if (!text) return;
        extra.notes.push({ id: C.uid(), text, createdAt: Date.now(), archived: false });
        saveExtra(); ctx.render(); ctx.toast('Zapisane. Możesz wrócić do działania.');
        doc.querySelector('#x-dump-input')?.focus?.();
      }
      if (id === 'x-split-form') {
        const title = String(data.get('title') || '').trim();
        if (!title) return;
        ctx.state().tasks.push(C.makeTask({ title, tier: 'big', category: 'life', steps: GEN.breakdown(title) }));
        ctx.save(); ctx.render(); ctx.toast('Gotowe. Zadanie czeka w planie z małymi krokami.');
      }
      if (id === 'x-quick-form') {
        const title = String(data.get('title') || '').trim().slice(0, 60);
        if (!title) return;
        extra.quick ??= [];
        if (extra.quick.length >= 20) throw Error('Możesz mieć maksymalnie 20 własnych czynności.');
        const category = ['life', 'self'].includes(data.get('category')) ? data.get('category') : 'life';
        const tier = Object.hasOwn(C.TIERS, data.get('tier')) ? data.get('tier') : 'normal';
        extra.quick.push({ id: 'u-' + C.uid(), title, category, tier });
        saveExtra(); ctx.render(); ctx.toast('Dodane do szybkich punktów.');
      }
      if (id === 'x-names-form') {
        extra.names = {};
        for (const [k] of GEN.NAME_FIELDS) { const v = String(data.get(k) || '').trim().slice(0, 150); if (v) extra.names[k] = v; }
        saveExtra(); ctx.render(); ctx.toast('Zapisane. Zadania będą używać tych imion.');
      }
      if (id === 'x-habit-form') {
        const name = String(data.get('name') || '').trim().slice(0, 50);
        if (!name || extra.habits.filter(h => !h.archived).length >= 8) return;
        extra.habits.push({ id: C.uid(), name, days: {}, archived: false });
        saveExtra(); ctx.render();
      }
      if (id === 'x-routine-form') {
        const name = String(data.get('name') || '').trim().slice(0, 80);
        const steps = String(data.get('steps') || '').split('\n').map(x => x.trim().slice(0, 160)).filter(Boolean).slice(0, 12);
        if (!name || !steps.length) throw Error('Wpisz nazwę i przynajmniej jeden krok.');
        const r = extra.routines.find(r => r.id === f.dataset.id);
        if (r) Object.assign(r, { name, steps }); else extra.routines.push({ id: C.uid(), name, steps });
        saveExtra(); ctx.close(); ctx.render(); ctx.toast('Rutyna zapisana.');
      }
      if (id === 'x-boss-form') {
        const name = String(data.get('name') || '').trim().slice(0, 80);
        const blows = String(data.get('blows') || '').split('\n').map(x => x.trim().slice(0, 160)).filter(Boolean).slice(0, C.BOSS.maxBlows);
        if (!name || blows.length < 2) throw Error('Wpisz nazwę i co najmniej dwa ciosy.');
        if (extra.bosses.filter(b => !b.defeatedAt && !b.archived).length >= C.BOSS.maxActive) throw Error('Masz już ' + C.BOSS.maxActive + ' aktywne wyprawy.');
        const kind = Object.hasOwn(KINDS, data.get('kind')) ? data.get('kind') : 'shade';
        extra.bosses.push({ id: C.uid(), name, kind, blows: blows.map(text => ({ text, done: 0 })), createdAt: Date.now() });
        saveExtra(); ctx.close(); ctx.render(); ctx.toast('Wyprawa rozpoczęta. Pierwszy cios czeka.');
      }
    });
  });

  doc.addEventListener('click', e => {
    const b = e.target.closest?.('button[data-action^="x-"]');
    if (!b) return;
    const a = b.dataset.action, id = b.dataset.id;
    guard(() => {
      const s = ctx.state();
      switch (a) {
        case 'x-review': startReview(ctx); break;
        case 'x-rv': reviewDecision(ctx, b.dataset.do); break;
        case 'x-note-today': case 'x-note-tomorrow': {
          const n = extra.notes.find(n => n.id === id); if (!n) break;
          noteToTask(s, n, a === 'x-note-today' ? today() : tomorrow());
          saveExtra(); ctx.save(); ctx.render(); ctx.toast(a === 'x-note-today' ? 'Dodane do planu na dziś.' : 'Przeniesione na jutro.'); break;
        }
        case 'x-note-drop': { const n = extra.notes.find(n => n.id === id); if (n) { n.archived = true; saveExtra(); ctx.render(); ctx.toast('Puszczone. Głowa lżejsza.'); } break; }
        case 'x-buddy-start': {
          const taskId = doc.querySelector('#x-buddy-task')?.value || null;
          C.startFocus(s, taskId, Number(b.dataset.min)); ctx.save(); ctx.render(); ctx.toast(b.dataset.min + ' minut. Iskra siedzi obok.'); break;
        }
        case 'x-ambient': {
          const on = setAmbient(!ambient);
          ctx.render(); if (!on && !ambient) ctx.toast('Szum wyłączony.'); break;
        }
        case 'x-mood': {
          const part = dayPart(), day = today();
          let m = extra.moods.find(m => m.day === day && m.part === part);
          if (!m) { m = { day, part, time: Date.now() }; extra.moods.push(m); }
          m[b.dataset.kind] = Number(b.dataset.v);
          extra.moods = extra.moods.slice(-400);
          saveExtra(); ctx.render(); ctx.toast('Zapisane. Dziękuję, że sprawdzasz, jak Ci jest.'); break;
        }
        case 'x-habit': { const h = extra.habits.find(h => h.id === id); if (!h) break; if (h.days[today()]) delete h.days[today()]; else h.days[today()] = true; const keep = I.lastDays(90); h.days = Object.fromEntries(Object.entries(h.days).filter(([d]) => keep.includes(d))); saveExtra(); ctx.render(); break; }
        case 'x-habit-del': { const h = extra.habits.find(h => h.id === id); if (h) { h.archived = true; saveExtra(); ctx.render(); } break; }
        case 'x-routine-new': routineForm(ctx, null); break;
        case 'x-routine-edit': routineForm(ctx, id); break;
        case 'x-routine-delete': extra.routines = extra.routines.filter(r => r.id !== id); saveExtra(); ctx.close(); ctx.render(); break;
        case 'x-routine-run': { const r = extra.routines.find(r => r.id === id); if (r) launchRoutine(ctx, r, 'none'); break; }
        case 'x-routine-daily': { const r = extra.routines.find(r => r.id === id); if (r) launchRoutine(ctx, r, 'daily'); break; }
        case 'x-boss-new': bossForm(ctx); break;
        case 'x-blow': strike(ctx, id, Number(b.dataset.i)); break;
        case 'x-tip-next': tipOffset++; ctx.render(); break;
        case 'x-thought-next': thoughtOffset++; ctx.render(); break;
        case 'x-now-next': nowSkip++; ctx.render(); break;
        case 'x-now-start': {
          const n = P.nextThing(s, { skip: nowSkip, names: extra.names }); if (!n) break;
          let taskId = n.task?.id;
          if (n.kind === 'idea') {
            const t = C.makeTask({ title: n.idea.t, tier: n.idea.tier, category: GEN.CATEGORY[n.area] || 'life', steps: n.idea.steps || [], date: today() });
            s.tasks.push(t); taskId = t.id;
          }
          C.startFocus(s, taskId, 5); nowSkip = 0; ctx.save(); ctx.render(); ctx.toast('Tylko 5 minut. Iskra siedzi obok.'); break;
        }
        case 'x-plan-window': planWindow = Number(b.dataset.min) || 120; ctx.render(); break;
        case 'x-plan-start': { C.startFocus(s, id, Number(b.dataset.min) || 15); ctx.save(); ctx.render(); ctx.toast('Start. Iskra siedzi obok.'); break; }
        case 'x-guard-two': { C.startFocus(s, id, 2); ctx.save(); ctx.render(); ctx.toast('Tylko 2 minuty. Potem możesz przestać.'); break; }
        case 'x-guard-split': { const t = s.tasks.find(t => t.id === id); if (t && !t.steps.length) { t.steps = GEN.breakdown(t.title); ctx.save(); ctx.render(); ctx.toast('Podzielone na małe kroki.'); } break; }
        case 'x-guard-tomorrow': { const t = s.tasks.find(t => t.id === id); if (t && !locked(s, id)) { t.date = tomorrow(); ctx.save(); ctx.render(); ctx.toast('Przeniesione na jutro.'); } break; }
        case 'x-guard-drop': { const t = s.tasks.find(t => t.id === id); if (t) { t.archived = true; ctx.save(); ctx.render(); ctx.toast('Puszczone. To też jest decyzja.'); } break; }
        case 'x-gen-opt': { const v = b.dataset.key === 'minutes' ? Number(b.dataset.v) : b.dataset.v; genOpts = { ...genOpts, [b.dataset.key]: v, seed: genOpts.seed }; ctx.render(); break; }
        case 'x-gen-roll': genOpts = { ...genOpts, seed: genOpts.seed + 1 }; ctx.render(); break;
        case 'x-gen-add': {
          const x = GEN.suggest({ ...genOpts, count: 3, names: extra.names })[Number(b.dataset.i)]; if (!x) break;
          const cat = GEN.CATEGORY[genOpts.area] || 'life';
          s.tasks.push(C.makeTask({ title: x.t, tier: x.tier, category: cat, steps: x.steps || [], date: today() }));
          ctx.save(); ctx.render(); ctx.toast('Dodane na dziś. Zacznij od dwóch minut.'); break;
        }
        case 'x-quick': {
          const q = quickItems().find(q => q.id === id); if (!q) break;
          const day = today();
          if (s.tasks.some(t => t.title === q.title && t.date === day && C.completion(s, t, day))) { ctx.toast('To już dziś zapisane.'); break; }
          const task = C.makeTask({ title: q.title, tier: q.tier, category: q.category, date: day });
          s.tasks.push(task);
          const before = s.ledger.length, earned = C.completeTask(s, task.id);
          task.archived = true;
          ctx.save(); ctx.render(); ctx.celebrate(earned, s.ledger.slice(before).filter(e => e.kind === 'bonus')); break;
        }
        case 'x-quick-del': extra.quick = (extra.quick || []).filter(q => q.id !== id); saveExtra(); ctx.render(); break;
        case 'x-reward-idea': { const r = GEN.REWARD_IDEAS[Number(b.dataset.i)]; if (r && !s.rewards.some(x => x.title === r[0] && !x.archived)) { s.rewards.push({ id: C.uid(), title: r[0], cost: r[1], archived: false }); ctx.save(); ctx.render(); ctx.toast('Nagroda dodana.'); } break; }
        case 'x-fact-next': factOffset++; ctx.render(); break;
        case 'x-fact-reset': factOffset = 0; ctx.render(); break;
        case 'x-diy-task': {
          const d = DIY.find(d => d.id === id); if (!d) break;
          s.tasks.push(C.makeTask({ title: d.title, tier: 'normal', category: 'self', steps: d.steps, date: today() }));
          ctx.save(); ctx.render(); ctx.toast('Dodane do planu na dziś.'); break;
        }
        case 'x-minimal': { s.settings.minimal = !s.settings.minimal; ctx.save(); ctx.render(); ctx.toast(s.settings.minimal ? 'Tryb minimalny włączony.' : 'Wszystkie funkcje z powrotem.'); break; }
        case 'x-boss-drop': { const boss = extra.bosses.find(x => x.id === id); if (boss) { boss.archived = true; saveExtra(); ctx.render(); ctx.toast('Wyprawa porzucona. Zdobyte nagrody zostają.'); } break; }
      }
    });
  });

  globalThis.window?.addEventListener?.('storage', e => {
    if (e.key === 'adhd_companion_v1') { reloadExtra(e.newValue); ctx.render(); }
  });
}
