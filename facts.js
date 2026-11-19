// Short, well-established and cheerful. One per day, no scrolling.
export const FACTS = [
  { t: 'Ośmiornice mają trzy serca. Dwa pompują krew przez skrzela, trzecie przez resztę ciała.', tag: 'Zwierzęta' },
  { t: 'Słonie wołają się nawzajem dźwiękami, które działają jak imiona. Wykazało to badanie z 2024 roku.', tag: 'Zwierzęta' },
  { t: 'Delfiny mają własne gwizdy rozpoznawcze, czyli coś w rodzaju imienia dla każdego osobnika.', tag: 'Zwierzęta' },
  { t: 'Pszczoły potrafią przekazać koleżankom kierunek i odległość do kwiatów tańcem.', tag: 'Zwierzęta' },
  { t: 'Szczury w czasie zabawy wydają ultradźwięki przypominające śmiech, zwłaszcza przy łaskotaniu.', tag: 'Zwierzęta' },
  { t: 'Na Wenus doba trwa dłużej niż rok. Obrót wokół osi zajmuje tam około 243 ziemskich dni, a rok około 225.', tag: 'Kosmos' },
  { t: 'Księżyc oddala się od Ziemi o około 3,8 cm rocznie, mniej więcej tyle, ile rosną paznokcie.', tag: 'Kosmos' },
  { t: 'Szacuje się, że na Ziemi rośnie więcej drzew niż gwiazd w Drodze Mlecznej.', tag: 'Przyroda' },
  { t: 'Banany zawierają odrobinę promieniotwórczego potasu-40. Dla zdrowia jest to zupełnie bez znaczenia.', tag: 'Nauka' },
  { t: 'Maria Skłodowska-Curie jako pierwsza osoba dostała dwie Nagrody Nobla, z fizyki w 1903 i z chemii w 1911 roku.', tag: 'Polska' },
  { t: 'W Polsce działa 23 parki narodowe, od Tatr po Ujście Warty.', tag: 'Polska' },
  { t: 'Zamek w Łańcucie ma jedną z największych w Europie kolekcji powozów.', tag: 'Polska' },
  { t: 'Technikę pomodoro wymyślił Francesco Cirillo, a nazwa pochodzi od kuchennego minutnika w kształcie pomidora.', tag: 'Produktywność' },
  { t: 'Klasyczne badania pokazały, że niedokończone sprawy zostają w głowie dłużej (efekt Zeigarnik). Samo zaczęcie często przynosi ulgę.', tag: 'Produktywność' },
  { t: 'Mózg waży około 2% ciała, a zużywa około 20% jego energii. Dlatego przerwy naprawdę pomagają.', tag: 'Mózg' },
  { t: 'Mózg zmienia się przez całe życie. Każda nowa umiejętność buduje nowe połączenia między neuronami.', tag: 'Mózg' },
  { t: 'Podczas snu mózg porządkuje i utrwala to, czego się danego dnia nauczyłeś.', tag: 'Mózg' },
  { t: 'Słuchanie ulubionej muzyki wywołuje w mózgu wyrzut dopaminy, dokładnie tej od nagrody.', tag: 'Mózg' },
  { t: 'Badania wskazują, że już kilkanaście minut spaceru na świeżym powietrzu zwykle poprawia nastrój.', tag: 'Zdrowie' },
  { t: 'Wystarczy kilka głębokich oddechów z wydłużonym wydechem, by organizm zaczął się uspokajać.', tag: 'Zdrowie' },
];

/** Same fact for the whole day, a different one tomorrow. */
export function factOfDay(day, offset = 0) {
  const n = Math.floor(new Date(day + 'T12:00:00').getTime() / 86400000);
  return FACTS[(((n + offset) % FACTS.length) + FACTS.length) % FACTS.length];
}
