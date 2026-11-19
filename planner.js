import * as C from './core.js';

export const MINUTES = { micro: 5, normal: 15, big: 30 };
const ORDER = ['micro', 'normal', 'big'];
const WORK_BLOCK = 25, BREAK = 5, STEP = 300000;

export function candidates(state, now = Date.now()) {
  const day = C.dayKey(now);
  return state.tasks.filter(t => !t.archived && C.eligible(t, day) && !C.completion(state, t, day));
}

/** Lays today's open tasks out as time blocks. Low energy starts small, high energy starts with the big one. */
export function buildPlan(state, { minutes = 120, now = Date.now(), maxTasks = 6 } = {}) {
  const day = C.dayKey(now), list = candidates(state, now);
  const energy = state.minimum ? 'low' : state.energy || 'medium';
  const rank = t => ORDER.indexOf(t.tier);
  const overdue = t => (t.date < day ? 1 : 0);
  list.sort((a, b) =>
    overdue(b) - overdue(a) ||
    (energy === 'low' ? rank(a) - rank(b) : energy === 'high' ? rank(b) - rank(a) : Math.abs(rank(a) - 1) - Math.abs(rank(b) - 1)) ||
    a.createdAt - b.createdAt);
  const end = now + minutes * 60000, blocks = [];
  let t = Math.ceil(now / STEP) * STEP, worked = 0, planned = 0;
  for (const task of list) {
    if (planned >= maxTasks) break;
    const m = MINUTES[task.tier];
    if (t + m * 60000 > end) continue;
    if (worked >= WORK_BLOCK) {
      if (t + BREAK * 60000 + m * 60000 > end) continue;
      blocks.push({ type: 'break', start: t, end: t + BREAK * 60000, minutes: BREAK });
      t += BREAK * 60000; worked = 0;
    }
    blocks.push({ type: 'task', taskId: task.id, title: task.title, tier: task.tier, minutes: m, start: t, end: t + m * 60000 });
    t += m * 60000; worked += m; planned++;
  }
  return { blocks, planned, total: list.length, left: list.length - planned, energy };
}
