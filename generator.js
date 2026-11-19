// Task ideas, quick chores and a step breakdown. Everything runs offline.
export const CATALOG = {
  life: [
    { t: 'Odłóż na miejsce pięć rzeczy', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Wstaw naczynia do zmywarki', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Umyj kubek, który stoi najdłużej', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Przetrzyj jeden blat', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Wyrzuć śmieci z jednego kosza', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zbierz ubrania z podłogi', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Włóż jedno pranie', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Rozwieś kilka rzeczy z suszarki', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Złóż pięć sztuk prania', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Przewietrz pokój przez pięć minut', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Podlej jedną roślinę', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Uporządkuj jedną półkę, tylko przez pięć minut', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Przygotuj ubrania na jutro', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Sprawdź, czy masz wszystko potrzebne na poranek', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zrób listę zakupów', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Ogarnij jedną szufladę', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Odkurz jeden pokój', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Zmień pościel', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Posprzątaj biurko', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Ogarnij lodówkę', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Umyj łazienkę', tier: 'big', min: 30, energy: 'high', steps: ['Spryskaj powierzchnie środkiem', 'Umyj umywalkę i lustro', 'Wyszoruj toaletę i prysznic', 'Przetrzyj podłogę'] },
    { t: 'Zrób generalne porządki w jednym pomieszczeniu', tier: 'big', min: 30, energy: 'high' },
  ],
  family: [
    { t: 'Zrób spokojny spacer z psem', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Pobaw się z psem przez pięć minut', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Sprawdź, czy zwierzaki mają świeżą wodę i jedzenie', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Poświęć chwilę na spokojną obserwację zwierzaków', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zapytaj dziecko, co dziś najbardziej mu się podobało', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Pobaw się z dzieckiem przez 10 minut, to ono wybiera', tier: 'micro', min: 10, energy: 'low' },
    { t: 'Zbudujcie coś razem z samochodzików lub klocków', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Wymyśl krótką zabawę w superbohatera', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Przeczytaj dziecku krótką historię', tier: 'micro', min: 10, energy: 'low' },
    { t: 'Przygotujcie razem prostą przekąskę', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Zrób partnerce małe, miłe coś', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zapytaj partnerkę, jak minął jej dzień, i posłuchaj', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zaplanujcie razem jedną przyjemną rzecz na ten tydzień', tier: 'normal', min: 15, energy: 'low' },
    { t: 'Wyślij bliskiej osobie wiadomość bez szczególnej okazji', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Wybierz jedną małą rzecz, która ułatwi jutro domownikom dzień', tier: 'micro', min: 5, energy: 'low' },
  ],
  self: [
    { t: 'Uzupełnij wodę w butelce', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Przygotuj sobie prostą przekąskę', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zrób herbatę i wypij ją bez telefonu', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Napij się szklanki wody', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zrób dwuminutowe rozciąganie', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Wyjdź na krótki spacer', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Zrób jedno zdjęcie miłego momentu z dzisiaj', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zapisz jedną rzecz, która poprawiła Ci dziś nastrój', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Wybierz jedną rzecz, za którą jesteś dziś wdzięczny', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Posłuchaj jednego ulubionego utworu bez robienia czegoś równocześnie', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zagraj jedną krótką rundę dla przyjemności', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Poświęć 15 minut na swój projekt lub hobby', tier: 'normal', min: 15, energy: 'medium' },
    { t: 'Zapisz pomysł, który nie chce wyjść Ci z głowy', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Obejrzyj jeden odcinek albo fragment czegoś, co lubisz', tier: 'normal', min: 30, energy: 'low' },
    { t: 'Zrób sobie 10 minut przerwy bez obowiązków', tier: 'micro', min: 10, energy: 'low' },
    { t: 'Odłóż telefon na 15 minut', tier: 'normal', min: 15, energy: 'low' },
    { t: 'Przygotuj wygodne miejsce do odpoczynku', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Zrób wieczorem krótkie wyciszenie przy przygaszonym świetle', tier: 'normal', min: 15, energy: 'low' },
    { t: 'Sprawdź, czy masz ustawiony budzik na jutro', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Odłóż telefon chwilę wcześniej i daj sobie spokojnie zasnąć', tier: 'micro', min: 5, energy: 'low' },
    { t: 'Przygotuj zdrowy posiłek', tier: 'normal', min: 30, energy: 'medium' },
  ],
};

export const AREAS = [['life', 'Dom'], ['family', 'Rodzina i zwierzaki'], ['self', 'Dla siebie']];
/** Idea areas are shown to the user; family tasks are stored in the Life category. */
export const CATEGORY = { life: 'life', family: 'life', self: 'self' };

/** Chores that can be logged in one tap. Each earns the normal reward of its size. */
export const QUICK = [
  { id: 'q-trash', title: 'Wynieść śmieci', category: 'life', tier: 'micro' },
  { id: 'q-dishes', title: 'Zmywarka / naczynia', category: 'life', tier: 'micro' },
  { id: 'q-laundry', title: 'Pranie', category: 'life', tier: 'normal' },
  { id: 'q-vacuum', title: 'Odkurzanie', category: 'life', tier: 'normal' },
  { id: 'q-cook', title: 'Ugotowanie obiadu', category: 'life', tier: 'normal' },
  { id: 'q-bath', title: 'Sprzątanie łazienki', category: 'life', tier: 'big' },
  { id: 'q-shop', title: 'Zakupy', category: 'life', tier: 'normal' },
  { id: 'q-plants', title: 'Podlanie kwiatów', category: 'life', tier: 'micro' },
  { id: 'q-tidy', title: 'Szybki porządek w jednym miejscu', category: 'life', tier: 'micro' },
  { id: 'q-stretch', title: 'Rozciąganie', category: 'self', tier: 'micro' },
  { id: 'q-callfam', title: 'Telefon do bliskiej osoby', category: 'self', tier: 'micro' },
  { id: 'q-read', title: 'Czytanie przez 15 minut', category: 'self', tier: 'normal' },
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
