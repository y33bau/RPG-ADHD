import * as C from './core.js';

export const BADGES = [
  { id: 'first', icon: '◈', name: 'Pierwszy krok', desc: 'Wykonaj swój pierwszy mały krok.', goal: 1, value: c => c.steps },
  { id: 'ten', icon: '✦', name: 'Dziesięć kroków', desc: 'Dziesięć małych kroków za Tobą.', goal: 10, value: c => c.steps },
  { id: 'fifty', icon: '✹', name: 'Pięćdziesiąt kroków', desc: 'Pół setki. Naprawdę.', goal: 50, value: c => c.steps },
  { id: 'focus1', icon: '◷', name: 'Byłem przy zadaniu', desc: 'Zapisz pierwszą sesję skupienia.', goal: 1, value: c => c.sessions },
  { id: 'focus5', icon: '◴', name: 'Pięć sesji', desc: 'Pięć zapisanych sesji skupienia.', goal: 5, value: c => c.sessions },
  { id: 'hour', icon: '⌛', name: 'Godzina skupienia', desc: 'Łącznie 60 minut w sesjach.', goal: 60, value: c => c.minutes },
  { id: 'days7', icon: '☾', name: 'Siedem dni z Tobą', desc: 'Siedem różnych dni z aktywnością. Nie muszą iść po kolei.', goal: 7, value: c => c.days },
  { id: 'comeback', icon: '↺', name: 'Powrót', desc: 'Wróć po kilku dniach przerwy. To też się liczy, i to bardzo.', goal: 1, value: c => c.comeback ? 1 : 0 },
  { id: 'level5', icon: '✳', name: 'Poziom 5', desc: 'Osiągnij piąty poziom postaci.', goal: 5, value: c => c.level },
  { id: 'reward', icon: '✧', name: 'Coś miłego', desc: 'Odbierz pierwszą nagrodę.', goal: 1, value: c => c.purchases },
  { id: 'base', icon: '⌂', name: 'Gotowa przystań', desc: 'Rozbuduj wszystkie trzy pomieszczenia.', goal: 9, value: c => c.rooms },
  { id: 'dump', icon: '☁', name: 'Lżejsza głowa', desc: 'Zrzuć z głowy pięć myśli.', goal: 5, value: c => c.notes },
  { id: 'boss', icon: '♞', name: 'Pogromca', desc: 'Pokonaj pierwszego bossa.', goal: 1, value: c => c.bosses },
  { id: 'mood7', icon: '◐', name: 'Znam swój rytm', desc: 'Zapisz nastrój w siedem różnych dni.', goal: 7, value: c => c.moodDays },
  { id: 'find', icon: '❖', name: 'Szczęśliwy traf', desc: 'Znajdź pierwszą niespodziankę.', goal: 1, value: c => c.finds },
];

export function context(state, extra) {
  const ledger = state.ledger;
  const steps = ledger.filter(e => e.kind === 'step').length;
  const focus = ledger.filter(e => e.kind === 'focus');
  const days = [...new Set(ledger.filter(e => ['step', 'focus', 'boss'].includes(e.kind)).map(e => e.day))].sort();
  let comeback = false;
  for (let i = 1; i < days.length; i++) {
    const gap = (new Date(days[i] + 'T12:00:00') - new Date(days[i - 1] + 'T12:00:00')) / 86400000;
    if (gap >= 3) comeback = true;
  }
  return {
    steps,
    sessions: focus.length,
    minutes: focus.reduce((n, e) => n + (e.minutes || 0), 0),
    days: days.length,
    comeback,
    level: C.levelInfo(C.balance(state).xp).level,
    purchases: ledger.filter(e => e.kind === 'purchase').length,
    rooms: Object.values(state.rooms).reduce((n, x) => n + x, 0),
    notes: (extra.notes || []).length,
    bosses: (extra.bosses || []).filter(b => b.defeatedAt).length,
    moodDays: new Set((extra.moods || []).map(m => m.day)).size,
    finds: ledger.filter(e => e.kind === 'bonus').length,
  };
}

export function list(state, extra) {
  const c = context(state, extra);
  return BADGES.map(b => {
    const value = b.value(c);
    return { id: b.id, icon: b.icon, name: b.name, desc: b.desc, goal: b.goal, value: Math.min(value, b.goal), earned: value >= b.goal };
  });
}

/** Marks badges as seen. The first run marks silently so old progress does not produce a flood of toasts. */
export function collectNew(state, extra, now = Date.now()) {
  const earned = list(state, extra).filter(b => b.earned);
  const fresh = earned.filter(b => !extra.badges[b.id]);
  const silent = !extra.badgesReady;
  for (const b of fresh) extra.badges[b.id] = now;
  const changed = fresh.length > 0 || !extra.badgesReady;
  extra.badgesReady = true;
  return { changed, announce: silent ? [] : fresh };
}
