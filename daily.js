// Morning and evening rituals, the weekly summary and first-run onboarding helpers.
import * as C from './core.js';

export const RITUALS = {
  morning: { title: 'Poranny start', hint: 'Trzy małe rzeczy na dobry początek.', from: 4, to: 12, items: [
    ['water', 'Wypij szklankę wody'], ['breath', 'Trzy spokojne oddechy przy oknie'], ['one', 'Wybierz jedną rzecz na dziś'],
  ] },
  evening: { title: 'Wieczorne wyciszenie', hint: 'Domknij dzień, żeby jutro było lżej.', from: 18, to: 28, items: [
    ['win', 'Przypomnij sobie jedną rzecz, która się udała'], ['clothes', 'Przygotuj ubrania na jutro'], ['alarm', 'Sprawdź budzik'], ['phone', 'Odłóż telefon chwilę wcześniej'],
  ] },
};
export const RITUAL_REWARD = { xp: 15, coins: 10, materials: 1 };

/** Which ritual fits this hour, or null in the middle of the day. Hours past midnight count as evening. */
export function ritualNow(now = Date.now()) {
  const h = new Date(now).getHours(), hh = h < 4 ? h + 24 : h;
  return Object.keys(RITUALS).find(k => hh >= RITUALS[k].from && hh < RITUALS[k].to) || null;
}

/** The evening ritual that runs past midnight still belongs to the previous day. */
export function ritualDay(now = Date.now()) {
  const d = new Date(now);
  if (d.getHours() < 4) d.setDate(d.getDate() - 1);
  return C.dayKey(d.getTime());
}

/** Monday of the week as YYYY-MM-DD. */
export function weekKey(now = Date.now()) {
  const d = new Date(now); d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return C.dayKey(d.getTime());
}

const DAY_NAMES = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

/** Sums up the last seven days, today included. */
export function weekSummary(state, now = Date.now()) {
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - i); days.push(C.dayKey(d.getTime())); }
  const set = new Set(days), inWeek = state.ledger.filter(e => set.has(e.day));
  const perDay = Object.fromEntries(days.map(d => [d, 0]));
  for (const e of inWeek) if (e.kind === 'step' || e.kind === 'boss' || e.kind === 'focus') perDay[e.day]++;
  const best = days.reduce((a, d) => (perDay[d] > perDay[a] ? d : a), days[0]);
  const done = inWeek.filter(e => e.kind === 'complete');
  const proud = done.map(e => ({ e, task: state.tasks.find(t => t.id === e.taskId) }))
    .sort((a, b) => ['micro', 'normal', 'big'].indexOf(b.task?.tier) - ['micro', 'normal', 'big'].indexOf(a.task?.tier) || b.e.time - a.e.time)[0];
  return {
    days, perDay,
    completed: done.length,
    steps: inWeek.filter(e => e.kind === 'step').length,
    focusMinutes: Math.round(inWeek.filter(e => e.kind === 'focus').reduce((n, e) => n + (e.minutes || 0), 0)),
    coins: inWeek.reduce((n, e) => n + (e.coins || 0), 0),
    activeDays: days.filter(d => perDay[d] > 0).length,
    best: perDay[best] ? { day: best, name: DAY_NAMES[new Date(best + 'T12:00:00').getDay()], count: perDay[best] } : null,
    proud: proud ? proud.e.title : null,
    carry: carryOver(state, now),
  };
}

/** The week a summary belongs to: on Monday it is still last week's. */
export const summaryWeek = (now = Date.now()) => weekKey(now - (new Date(now).getDay() === 1 ? 86400000 : 0));
/** Sunday and Monday show the summary on the main screen until it is closed for that week. */
export const summaryDue = (seenWeek, now = Date.now()) => [0, 1].includes(new Date(now).getDay()) && seenWeek !== summaryWeek(now);

/** Existing users skip onboarding: anyone with tasks or history already knows the app. */
export const needsOnboarding = (state, extra) => !extra.onboarded && !state.tasks.length && state.ledger.length <= 1;

/** One-off tasks that are due (today or earlier) and still open: they move on to the next week. */
export function carryOver(state, now = Date.now()) {
  const day = C.dayKey(now);
  return state.tasks.filter(t => !t.archived && t.repeat === 'none' && t.date <= day && !C.completion(state, t, day)).map(t => t.title);
}

/** The week a new goal is for: on Sunday it is already the coming week. */
export const goalWeek = (now = Date.now()) => weekKey(now + (new Date(now).getDay() === 0 ? 86400000 : 0));
/** The goal to show now: set for this week, or (on Sunday) already for the next one. */
export const activeGoal = (goal, now = Date.now()) => goal?.text && (goal.week === weekKey(now) || goal.week === goalWeek(now)) ? goal.text : '';
