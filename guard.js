import * as C from './core.js';

const noon = day => new Date(day + 'T12:00:00').getTime();

/** One-off tasks that keep being pushed to later: older than two days and still open. */
export function postponed(state, now = Date.now()) {
  const day = C.dayKey(now);
  return state.tasks
    .filter(t => !t.archived && t.repeat === 'none' && C.eligible(t, day) && !C.completion(state, t, day))
    .map(t => ({
      task: t,
      days: Math.max(Math.round((noon(day) - noon(t.date)) / 86400000), Math.floor((now - t.createdAt) / 86400000)),
      touched: state.ledger.some(e => e.taskId === t.id && ['step', 'complete'].includes(e.kind)),
    }))
    .filter(x => x.days >= 2)
    .sort((a, b) => b.days - a.days);
}

/** True when the day is well under way and nothing has been done yet. */
export function idleNudge(state, now = Date.now()) {
  const day = C.dayKey(now);
  if (new Date(now).getHours() < 11) return false;
  return !state.ledger.some(e => e.day === day && ['step', 'focus', 'boss'].includes(e.kind));
}
