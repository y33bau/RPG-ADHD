import * as C from './core.js';

export function lastDays(n, today = C.dayKey()) {
  const out = [];
  const end = new Date(today + 'T12:00:00');
  for (let i = n - 1; i >= 0; i--) { const d = new Date(end); d.setDate(d.getDate() - i); out.push(C.dayKey(d)); }
  return out;
}

/** Average mood and energy per day (1-5), null when nothing was recorded. */
export function moodSeries(extra, n = 14, today = C.dayKey()) {
  return lastDays(n, today).map(day => {
    const items = (extra.moods || []).filter(m => m.day === day);
    const avg = key => {
      const v = items.map(m => m[key]).filter(Number.isFinite);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    return { day, mood: avg('mood'), energy: avg('energy') };
  });
}

/** How many completed steps and sessions fall into each hour of the day. */
export function hourHistogram(state) {
  const bins = Array(24).fill(0);
  for (const e of state.ledger) if (e.kind === 'step' || e.kind === 'focus') bins[new Date(e.time).getHours()]++;
  return bins;
}

export function bestHours(bins) {
  const max = Math.max(0, ...bins);
  if (!max) return null;
  let best = 0, bestSum = -1;
  for (let h = 0; h < 24; h++) {
    const sum = bins[h] + bins[(h + 1) % 24] + bins[(h + 2) % 24];
    if (sum > bestSum) { bestSum = sum; best = h; }
  }
  return { from: best, to: (best + 3) % 24 };
}

export function focusStats(state) {
  const f = state.ledger.filter(e => e.kind === 'focus');
  const minutes = f.reduce((n, e) => n + (e.minutes || 0), 0);
  return { sessions: f.length, minutes, average: f.length ? Math.round(minutes / f.length) : 0, longest: Math.max(0, ...f.map(e => e.minutes || 0)) };
}

export const ATTRIBUTES = [
  { id: 'work', name: 'Intelekt', note: 'Praca i zawodowe kroki' },
  { id: 'life', name: 'Wigor', note: 'Życie, dom, sprawy' },
  { id: 'self', name: 'Wytrwałość', note: 'Rzeczy dla siebie' },
];

/** Attributes are derived from steps per task area. Nothing is stored. */
export function attributes(state) {
  const byTask = new Map(state.tasks.map(t => [t.id, t.category]));
  const counts = { work: 0, life: 0, self: 0 };
  for (const e of state.ledger) if (e.kind === 'step' && byTask.has(e.taskId)) counts[byTask.get(e.taskId)]++;
  const total = counts.work + counts.life + counts.self;
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const titles = { work: 'Strateg', life: 'Wędrowiec', self: 'Opiekun' };
  return { counts, total, title: total < 5 ? 'Nowicjusz' : titles[top[0]] };
}

export function bossState(boss) {
  const total = boss.blows.length, done = boss.blows.filter(b => b.done).length;
  return { total, done, left: total - done, hp: total ? Math.round((total - done) / total * 100) : 0 };
}
