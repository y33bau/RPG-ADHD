// Task ideas, quick chores and a step breakdown. Everything runs offline.
export const CATALOG = {
  life: [
    { t: 'Wynieść śmieci', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Włączyć zmywarkę', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Nastawić pranie', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Przetrzeć blaty w kuchni', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zrobić listę zakupów', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Powiesić pranie', tier: 'micro', min: 10, energy: 'low' },
    { t: 'Ogarnąć jedną szufladę', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Odkurzyć jeden pokój', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Zmienić pościel', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Posprzątać biurko', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Ogarnąć lodówkę', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Umyć łazienkę', tier: 'big', min: 30, energy: 'high', steps: ['Spryskać powierzchnie środkiem', 'Umyć umywalkę i lustro', 'Wyszorować toaletę i prysznic', 'Przetrzeć podłogę'] },
    { t: 'Generalne porządki w jednym pomieszczeniu', tier: 'big', min: 30, energy: 'high' },
  ],
  work: [
    { t: 'Odpisać na jednego maila', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zadzwonić do klienta', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zaplanować trasę oględzin na jutro', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Przejrzeć kalendarz na tydzień', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Wystawić fakturę', tier: 'micro', min: 10, energy: 'low' },
    { t: 'Uzupełnić dokumentację zdjęciową', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Sprawdzić księgę wieczystą', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Uporządkować folder zlecenia', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Dobrać nieruchomości porównawcze', tier: 'big', min: 30, energy: 'high', steps: ['Ustalić kryteria doboru', 'Wybrać kandydatów z bazy', 'Porównać cechy', 'Zapisać wnioski'] },
    { t: 'Napisać jeden rozdział opisu', tier: 'big', min: 30, energy: 'high' },
  ],
  self: [
    { t: 'Szklanka wody i trzy oddechy', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Rozciąganie przez 5 minut', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Wyjść na światło dzienne na 10 minut', tier: 'micro', min: 10, energy: 'low' },
    { t: 'Spacer 15 minut', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Zadzwonić do bliskiej osoby', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Przygotować zdrowy posiłek', tier: 'normal', min: 30, energy: 'medium' },
  ],
};

export const AREAS = [['life', 'Dom'], ['work', 'Praca'], ['self', 'Dla siebie']];

/** Chores that can be logged in one tap. Each earns the normal reward of its size. */
export const QUICK = [
  { id: 'q-trash', title: 'Wynieść śmieci', category: 'life', tier: 'micro' },
  { id: 'q-dishes', title: 'Zmywarka / naczynia', category: 'life', tier: 'micro' },
  { id: 'q-laundry', title: 'Pranie', category: 'life', tier: 'normal' },
  { id: 'q-vacuum', title: 'Odkurzanie', category: 'life', tier: 'normal' },
  { id: 'q-cook', title: 'Ugotowanie obiadu', category: 'life', tier: 'normal' },
  { id: 'q-bath', title: 'Sprzątanie łazienki', category: 'life', tier: 'big' },
  { id: 'q-call', title: 'Telefon do klienta', category: 'work', tier: 'micro' },
  { id: 'q-mail', title: 'Odpowiedź na maila', category: 'work', tier: 'micro' },
  { id: 'q-docs', title: 'Porządkowanie dokumentów', category: 'work', tier: 'normal' },
  { id: 'q-visit', title: 'Oględziny nieruchomości', category: 'work', tier: 'big' },
  { id: 'q-report', title: 'Praca nad operatem', category: 'work', tier: 'big' },
  { id: 'q-walk', title: 'Spacer', category: 'self', tier: 'normal' },
];

export const REWARD_IDEAS = [
  ['Ulubiona kawa na mieście', 40], ['Odcinek serialu bez wyrzutów sumienia', 50], ['Godzina w ulubionej grze', 80],
  ['Pizza na wynos', 120], ['Nowa książka lub komiks', 200], ['Dzień bez „powinienem”', 300], ['Mały gadżet na biurko', 400],
];

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const LEVEL = { low: 0, medium: 1, high: 2 };

/** Picks up to `count` ideas that fit the time and the energy. The same seed gives the same result. */
export function suggest({ area = 'life', minutes = 15, energy = 'medium', count = 3, seed = 1 } = {}) {
  const pool = (CATALOG[area] || CATALOG.life).filter(x => x.min <= minutes && LEVEL[x.energy] <= LEVEL[energy]);
  const rand = rng(seed), out = [];
  const bag = [...pool];
  while (out.length < count && bag.length) out.push(bag.splice(Math.floor(rand() * bag.length), 1)[0]);
  return out;
}

/** Turns a vague task into four or five small steps. */
export function breakdown(title) {
  const t = String(title).trim().replace(/[.!?]+$/, '').slice(0, 90);
  return ['Przygotować miejsce i rzeczy', 'Zacząć na 2 minuty: ' + t, 'Zrobić główną część', 'Sprawdzić, czy jest „wystarczająco dobrze”', 'Posprzątać po sobie i odhaczyć'];
}
