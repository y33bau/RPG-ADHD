import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../core.js';
import { buildPlan } from '../planner.js';
import { postponed, idleNudge } from '../guard.js';
import { suggest, breakdown, QUICK, CATALOG } from '../generator.js';
import { factOfDay, FACTS } from '../facts.js';

const at = (s) => new Date(s).getTime();
const withTasks = (...defs) => { const s = C.fresh(at('2026-11-18T08:00:00')); for (const d of defs) s.tasks.push(C.makeTask(d, at('2026-11-18T08:00:00'))); return s; };

test('planner fits tasks into the window and adds a break after 25 minutes of work', () => {
  const s = withTasks({ title: 'A', tier: 'big' }, { title: 'B', tier: 'normal' }, { title: 'C', tier: 'micro' });
  s.energy = 'high';
  const plan = buildPlan(s, { minutes: 120, now: at('2026-11-18T10:00:00') });
  assert.deepEqual(plan.blocks.filter(b => b.type === 'task').map(b => b.title), ['A', 'B', 'C']);
  assert.equal(plan.blocks.filter(b => b.type === 'break').length, 1);
  assert.equal(plan.left, 0);
});

test('low energy starts small and a short window leaves the rest out', () => {
  const s = withTasks({ title: 'Big', tier: 'big' }, { title: 'Tiny', tier: 'micro' });
  s.energy = 'low';
  const plan = buildPlan(s, { minutes: 30, now: at('2026-11-18T10:00:00') });
  assert.equal(plan.blocks[0].title, 'Tiny');
  assert.equal(plan.left, 1);
});

test('guard finds old open tasks and ignores fresh ones', () => {
  const s = C.fresh(at('2026-11-10T08:00:00'));
  s.tasks.push(C.makeTask({ title: 'Stare', date: '2026-11-10' }, at('2026-11-10T08:00:00')), C.makeTask({ title: 'Nowe', date: '2026-11-18' }, at('2026-11-18T07:00:00')));
  const list = postponed(s, at('2026-11-18T12:00:00'));
  assert.deepEqual(list.map(x => x.task.title), ['Stare']);
  assert.equal(list[0].days, 8);
});

test('idle nudge appears after 11:00 only when nothing was done today', () => {
  const s = C.fresh(at('2026-11-18T08:00:00'));
  assert.equal(idleNudge(s, at('2026-11-18T09:00:00')), false);
  assert.equal(idleNudge(s, at('2026-11-18T12:00:00')), true);
  s.ledger.push({ id: 'x', kind: 'step', day: '2026-11-18', time: at('2026-11-18T11:00:00'), xp: 1, coins: 1, materials: 0 });
  assert.equal(idleNudge(s, at('2026-11-18T12:00:00')), false);
});

test('generator respects time and energy and is repeatable for a seed', () => {
  const a = suggest({ area: 'life', minutes: 5, energy: 'low', seed: 7 }), b = suggest({ area: 'life', minutes: 5, energy: 'low', seed: 7 });
  assert.deepEqual(a, b);
  assert.ok(a.length === 3 && a.every(x => x.min <= 5 && x.energy === 'low'));
  assert.ok(Object.keys(CATALOG).every(k => CATALOG[k].every(x => Object.hasOwn(C.TIERS, x.tier))));
  assert.equal(breakdown('Zrobić operat.').length, 5);
});

test('quick chores give the standard reward of their size', () => {
  const s = C.fresh(), q = QUICK.find(x => x.tier === 'normal'), t = C.makeTask({ title: q.title, tier: q.tier, category: q.category });
  s.tasks.push(t);
  C.completeTask(s, t.id);
  assert.equal(C.balance(s).coins, C.TIERS.normal.coins + C.balance(C.fresh()).coins);
  assert.equal(C.validate(JSON.parse(JSON.stringify(s))).ledger.length, s.ledger.length);
});

test('fact of the day is stable within a day and cycles', () => {
  assert.equal(factOfDay('2026-11-18'), factOfDay('2026-11-18'));
  assert.notEqual(factOfDay('2026-11-18'), factOfDay('2026-11-18', 1));
  assert.ok(FACTS.every(f => f.t.length > 20 && f.tag));
});

import { nextThing } from '../planner.js';
test('"what now" gives one open task first, then ideas, and cycles', () => {
  const s = withTasks({ title: 'Jedyne zadanie', tier: 'micro' });
  const a = nextThing(s, { now: at('2026-11-18T10:00:00') });
  assert.equal(a.kind, 'task'); assert.equal(a.title, 'Jedyne zadanie');
  const b = nextThing(s, { skip: 1, now: at('2026-11-18T10:00:00') });
  assert.equal(b.kind, 'idea');
  const wrap = nextThing(s, { skip: a.total, now: at('2026-11-18T10:00:00') });
  assert.equal(wrap.title, 'Jedyne zadanie');
  const empty = nextThing(C.fresh(at('2026-11-18T08:00:00')), { now: at('2026-11-18T10:00:00') });
  assert.equal(empty.kind, 'idea');
});

import { personalize, declineName, parseNames } from '../generator.js';
test('names are declined or overridden, and neutral wording is the fallback', () => {
  assert.equal(personalize('Spacer z {dog:ins}', {}), 'Spacer z psem');
  assert.equal(personalize('Spacer z {dog:ins}', { dog: 'Mika' }), 'Spacer z Miką');
  assert.equal(personalize('Przeczytaj {kid:dat}', { kid: 'Olaf' }), 'Przeczytaj Olafowi');
  assert.equal(personalize('Zapytaj {partner:acc}', { partner: 'Klaudia' }), 'Zapytaj Klaudię');
  assert.equal(personalize('{pets:gen}', { pets: 'świnki, świnek, świnkom, świnki, świnkami' }), 'świnek');
  assert.equal(parseNames('  '), null);
  assert.deepEqual(declineName('Marek'), ['Marek', 'Marka', 'Markowi', 'Marka', 'Markiem']);
});

import { FOCUS_TIPS, THOUGHTS, tipOfDay, thoughtOfDay } from '../wisdom.js';
test('tips and thoughts are stable within a day and cycle with an offset', () => {
  assert.equal(tipOfDay('2026-11-19'), tipOfDay('2026-11-19'));
  assert.notEqual(tipOfDay('2026-11-19'), tipOfDay('2026-11-19', 1));
  assert.ok(FOCUS_TIPS.length >= 20 && THOUGHTS.length >= 25);
  assert.ok(thoughtOfDay('2026-11-19', 999).length > 10);
});

import * as Dly from '../daily.js';
test('rituals follow the clock and late evening belongs to the previous day', () => {
  assert.equal(Dly.ritualNow(at('2026-11-19T08:00:00')), 'morning');
  assert.equal(Dly.ritualNow(at('2026-11-19T14:00:00')), null);
  assert.equal(Dly.ritualNow(at('2026-11-20T01:00:00')), 'evening');
  assert.equal(Dly.ritualDay(at('2026-11-20T01:00:00')), '2026-11-19');
});

test('week summary counts the last seven days and shows on Sunday and Monday only', () => {
  const s = withTasks({ title: 'Duże', tier: 'big' }, { title: 'Małe', tier: 'micro' });
  C.completeTask(s, s.tasks[0].id, '2026-11-18', at('2026-11-18T10:00:00'));
  C.completeTask(s, s.tasks[1].id, '2026-11-18', at('2026-11-18T11:00:00'));
  const w = Dly.weekSummary(s, at('2026-11-22T12:00:00'));
  assert.equal(w.completed, 2); assert.equal(w.best.name, 'środa'); assert.equal(w.proud, 'Duże');
  assert.equal(Dly.summaryDue(undefined, at('2026-11-19T12:00:00')), false);
  assert.equal(Dly.summaryDue(undefined, at('2026-11-22T12:00:00')), true);
  assert.equal(Dly.summaryWeek(at('2026-11-22T12:00:00')), Dly.summaryWeek(at('2026-11-23T12:00:00')));
  assert.equal(Dly.summaryDue(Dly.summaryWeek(at('2026-11-22T12:00:00')), at('2026-11-23T12:00:00')), false);
});

test('only a brand new user gets onboarding', () => {
  assert.equal(Dly.needsOnboarding(C.fresh(), {}), true);
  assert.equal(Dly.needsOnboarding(C.fresh(), { onboarded: true }), false);
  assert.equal(Dly.needsOnboarding(withTasks({ title: 'x' }), {}), false);
});

import * as ISK from '../iskra.js';
import * as ISL from '../island.js';
test('Iskra grows with XP, never shrinks when coins are spent, and is glad when you come back', () => {
  const s = withTasks({ title: 'Duże', tier: 'big' });
  assert.equal(ISK.growth(s).index, 0);
  for (let i = 0; i < 3; i++) s.ledger.push({ id: 'x' + i, kind: 'complete', day: '2026-11-10', time: at('2026-11-10T10:00:00'), xp: 50, coins: 30, materials: 0, title: 'x' });
  s.ledger.push({ id: 'p', kind: 'purchase', day: '2026-11-10', time: at('2026-11-10T11:00:00'), xp: 0, coins: -80, materials: 0, title: 'nagroda' });
  assert.equal(ISK.growth(s).stage.name, 'Płomyczek');
  assert.equal(ISK.mood(s, at('2026-11-10T11:30:00')), 'joy');
  assert.equal(ISK.mood(s, at('2026-11-15T12:00:00')), 'missed');
  assert.match(ISK.line(s, at('2026-11-15T12:00:00')).text, /./);
  assert.match(ISK.svg(s), /^<svg[^>]+class="isk /);
});

test('island places grow from matching chores and use the names typed by the user', () => {
  const s = C.fresh(at('2026-11-18T08:00:00'));
  const done = title => { const t = C.makeTask({ title }); s.tasks.push(t); C.completeTask(s, t.id); };
  done('Wstaw naczynia do zmywarki'); done('Pobaw się z Olafem'); done('Coś zupełnie innego'); done('Jeszcze coś');
  const p = ISL.places(s, { kid: 'Olaf' }), by = Object.fromEntries(p.list.map(x => [x.id, x]));
  assert.equal(by.house.level, 1); assert.equal(by.playground.level, 1); assert.equal(by.playground.title, 'Plac zabaw Olafa');
  assert.ok(p.trees >= 1);
  assert.equal(ISL.levelOf(6), 2); assert.equal(ISL.levelOf(20), 3);
  assert.match(ISL.svg(s, {}), /class="island/);
});
