/* Demo mode: shows the app with sample data, without touching the user's own data.
   Open with ?demo=1 (or Ustawienia → Tryb pokazowy). Everything is kept under separate keys
   (synapse_demo_v2, adhd_companion_demo_v1), so synchronisation, backups and the real save never see it.
   Loaded as the first module in index.html: it runs before app.js reads the storage keys. */
import * as C from './core.js';

export const DEMO_STATE = 'synapse_demo_v2', DEMO_EXTRA = 'adhd_companion_demo_v1', FLAG = 'synapse_demo';
const DAY = 86400000;

function readFlag(win) {
  try {
    const q = new URLSearchParams(win.location.search).get('demo');
    if (q === '1') { win.sessionStorage.setItem(FLAG, 'fresh'); return 'fresh'; }
    if (q === '0') { win.sessionStorage.removeItem(FLAG); return ''; }
    return win.sessionStorage.getItem(FLAG) || '';
  } catch { return ''; }
}

/** Sample data built with the app's own rules, so it always passes validation. */
export function demoData(now = Date.now()) {
  const s = C.fresh(now - 14 * DAY);
  s.settings.name = 'Ala';
  s.settings.surprises = false;
  const add = (o, ageDays = 6) => { const t = C.makeTask(o, now - ageDays * DAY); t.date = C.dayKey(now - ageDays * DAY); s.tasks.push(t); return t; };
  const walk = add({ title: 'Spacer 15 minut', tier: 'micro', category: 'self', repeat: 'daily' }, 13);
  const water = add({ title: 'Podlać kwiaty', tier: 'micro', category: 'life', repeat: 'weekly' }, 13);
  const mail = add({ title: 'Odpisać na maile', tier: 'normal', category: 'work', steps: ['Otworzyć skrzynkę', 'Odpisać na 3 najważniejsze', 'Zarchiwizować resztę'] }, 2);
  const deck = add({ title: 'Przygotować prezentację na poniedziałek', tier: 'big', category: 'work', steps: ['Szkic w punktach', 'Slajdy', 'Próba na głos'] }, 3);
  const desk = add({ title: 'Posprzątać biurko', tier: 'normal', category: 'life' }, 5);
  add({ title: 'Zadzwonić do przychodni', tier: 'micro', category: 'life' }, 4);
  add({ title: 'Przeczytać 10 stron książki', tier: 'micro', category: 'self', repeat: 'daily' }, 1);
  add({ title: 'Zrobić zakupy na weekend', tier: 'normal', category: 'life' }, 0);
  const at = (daysAgo, hour) => { const d = new Date(now - daysAgo * DAY); d.setHours(hour, 15, 0, 0); return Math.min(d.getTime(), now - 60000); };
  for (const back of [12, 11, 10, 8, 7, 6, 5, 3, 2, 1]) C.completeTask(s, walk.id, C.dayKey(at(back, 18)), at(back, 18));
  for (const back of [13, 6]) if (C.eligible(water, C.dayKey(at(back, 10)))) C.completeTask(s, water.id, C.dayKey(at(back, 10)), at(back, 10));
  C.completeTask(s, desk.id, C.dayKey(at(4, 11)), at(4, 11));
  C.completeTask(s, deck.id, C.dayKey(at(1, 9)), at(1, 9), 0);
  C.completeTask(s, mail.id, C.dayKey(at(0, 8)), at(0, 8), 0);
  try { C.upgrade(s, 'garden', at(3, 20)); C.upgrade(s, 'workshop', at(2, 20)); } catch { /* not enough materials: fine for a demo */ }
  s.energy = 'medium';
  return { state: s, extra: { onboarded: true, names: {}, notes: [{ id: C.uid(), text: 'Kupić baterie do pilota', createdAt: now - 2 * DAY, archived: false }] } };
}

function banner(doc) {
  if (doc.querySelector('.demo-banner')) return;
  const bar = doc.createElement('div');
  bar.className = 'demo-banner'; bar.setAttribute('role', 'status');
  bar.innerHTML = '<span><b>Tryb pokazowy</b> · przykładowe dane<span class="demo-long">, Twoje są bezpieczne</span></span><button type="button" class="demo-exit">Wyjdź</button>';
  bar.querySelector('button').addEventListener('click', () => exitDemo());
  (doc.querySelector('.workspace') || doc.body).prepend(bar);
}

export function exitDemo(win = globalThis.window) {
  try { win.sessionStorage.removeItem(FLAG); win.localStorage.removeItem(DEMO_STATE); win.localStorage.removeItem(DEMO_EXTRA); } catch {}
  win.location.href = win.location.pathname;
}

export function startDemo(win = globalThis.window) {
  win.location.href = win.location.pathname + '?demo=1';
}

if (typeof window !== 'undefined') {
  const flag = readFlag(window);
  if (flag) {
    globalThis.SYNAPSE_DEMO = true;
    try {
      if (flag === 'fresh' || !localStorage.getItem(DEMO_STATE)) {
        const d = demoData();
        localStorage.setItem(DEMO_STATE, JSON.stringify(d.state));
        localStorage.setItem(DEMO_EXTRA, JSON.stringify(d.extra));
        sessionStorage.setItem(FLAG, 'on');
        // Clean address: a reload keeps the demo but does not reset it again.
        history.replaceState(null, '', location.pathname);
      }
    } catch { /* storage blocked: the app falls back to its normal start */ }
    document.documentElement.classList.add('demo');
    banner(document);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest?.('[data-action="demo-start"],[data-action="demo-exit"]');
    if (!b) return;
    if (b.dataset.action === 'demo-start') startDemo(); else exitDemo();
  });
}
