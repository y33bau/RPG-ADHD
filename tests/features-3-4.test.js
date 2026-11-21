import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../core.js';
import * as P from '../planner.js';
import * as D from '../daily.js';
import { dueReminders, validateReminders, defaultReminders, reminderMessage, toMinute } from '../notification-core.js';
import { demoData } from '../demo.js';

const at = (y, m, d, h, min = 0) => new Date(y, m - 1, d, h, min).getTime();

test('"Co teraz?" prefers work in the morning and home or self in the evening', () => {
  const now = at(2026, 11, 18, 9), s = C.fresh(now);
  const home = C.makeTask({ title: 'Pranie', category: 'life' }, now), work = C.makeTask({ title: 'Raport', category: 'work' }, now), self = C.makeTask({ title: 'Joga', category: 'self' }, now);
  s.tasks.push(home, self, work);
  assert.equal(P.nextThing(s, { now }).title, 'Raport');
  assert.equal(P.nextThing(s, { now }).why, 'dobre na poranek');
  const evening = at(2026, 11, 18, 20);
  assert.equal(P.nextThing(s, { now: evening }).title, 'Joga');
});

test('overdue tasks still come first, whatever the time of day', () => {
  const now = at(2026, 11, 18, 9), s = C.fresh(now);
  const old = C.makeTask({ title: 'Stary rachunek', category: 'self', date: '2026-11-10' }, now);
  s.tasks.push(C.makeTask({ title: 'Raport', category: 'work' }, now), old);
  const n = P.nextThing(s, { now });
  assert.equal(n.title, 'Stary rachunek');
  assert.match(n.why, /czeka od 10\.11/);
});

test('the weekly summary lists what moves on and keeps a goal for the coming week', () => {
  const now = at(2026, 11, 22, 19), s = C.fresh(now); // Sunday
  s.tasks.push(C.makeTask({ title: 'Faktura', date: '2026-11-20' }, now), C.makeTask({ title: 'Codziennie', repeat: 'daily', date: '2026-11-20' }, now));
  assert.deepEqual(D.weekSummary(s, now).carry, ['Faktura']);
  const goal = { week: D.goalWeek(now), text: 'Skończyć prezentację' };
  assert.equal(goal.week, '2026-11-23');
  assert.equal(D.activeGoal(goal, now), 'Skończyć prezentację');
  assert.equal(D.activeGoal(goal, at(2026, 11, 25, 10)), 'Skończyć prezentację');
  assert.equal(D.activeGoal(goal, at(2026, 12, 1, 10)), '');
});

test('reminders at fixed times fire once inside their 5-minute window', () => {
  const cfg = validateReminders({ ...defaultReminders('adhd'), enabled: true, water: false, work: false, times: ['20:00', '09:00'], zone: 'UTC' }, 'adhd');
  assert.deepEqual(cfg.times, ['09:00', '20:00']);
  const nine = Date.UTC(2026, 10, 18, 9, 2);
  const due = dueReminders(cfg, nine);
  assert.equal(due.length, 1); assert.equal(due[0].kind, 'morning');
  cfg.last[due[0].key] = true;
  assert.equal(dueReminders(cfg, nine).length, 0);
  assert.equal(dueReminders(cfg, Date.UTC(2026, 10, 18, 20, 0))[0].kind, 'evening');
  assert.equal(dueReminders(cfg, Date.UTC(2026, 10, 18, 9, 6)).length, 0);
  assert.match(reminderMessage('adhd', 'evening').title, /wyciszenie/);
  assert.throws(() => validateReminders({ ...defaultReminders('adhd'), times: ['25:00'] }, 'adhd'));
  assert.equal(toMinute('07:30'), 450);
  // Old saved settings without times keep working.
  assert.deepEqual(validateReminders({ enabled: true }, 'adhd').times, []);
});

test('demo data passes validation and has a week worth showing', () => {
  const now = at(2026, 11, 21, 19), { state, extra } = demoData(now);
  assert.doesNotThrow(() => C.validate(JSON.parse(JSON.stringify(state))));
  assert.equal(extra.onboarded, true);
  const w = D.weekSummary(state, now);
  assert.ok(w.activeDays >= 5, 'active days: ' + w.activeDays);
  assert.ok(state.tasks.length >= 6);
});
