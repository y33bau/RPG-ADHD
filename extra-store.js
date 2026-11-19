// Shared store for add-on data (notes, moods, habits, bosses, routines...).
// One object, one localStorage key: the synchronisation module already carries it between devices.
const KEY = 'adhd_companion_v1';
export const extra = {};

export function defaultRoutines() {
  return [
    { id: 'morning', name: 'Poranek bez pośpiechu', steps: ['Szklanka wody', 'Umyć twarz i zęby', 'Ubrać się', 'Jedno małe śniadanie', 'Wybrać jeden cel na dziś'] },
    { id: 'evening', name: 'Spokojny wieczór', steps: ['Zrzut z głowy do aplikacji', 'Przygotować rzeczy na jutro', 'Szklanka wody', 'Odłożyć telefon na 15 minut'] },
  ];
}

function fill() {
  extra.notes ??= [];
  extra.visits ??= [];
  extra.moods ??= [];
  extra.habits ??= [];
  extra.bosses ??= [];
  extra.badges ??= {};
  extra.routines ??= defaultRoutines();
  extra.prefs ??= { ambient: false };
  extra.names ??= {};
  extra.rituals ??= {};
  extra.wins ??= {};
}

export function reloadExtra(raw) {
  let data = {};
  try { data = JSON.parse(raw) || {}; } catch { data = {}; }
  for (const k of Object.keys(extra)) delete extra[k];
  Object.assign(extra, data);
  fill();
}

export function saveExtra() {
  try { localStorage.setItem(KEY, JSON.stringify(extra)); } catch { /* storage full: data stays in memory */ }
  if (typeof document !== 'undefined' && typeof Event !== 'undefined') document.dispatchEvent(new Event('companion-progress'));
}

reloadExtra(typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY));
