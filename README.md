# SYNAPSE · małe kroki, własny rytm

Osobista aplikacja produktywności z lekką warstwą RPG. Po polsku, na telefon i komputer. Bez konta, backendu, bibliotek z CDN i procesu budowania.

## Co jest w wersji 2

- Ekran **Dzisiaj**: jeden wybrany cel, do trzech zadań, deklarowana energia i tryb minimum.
- Zadania jednorazowe, codzienne, w dni robocze i cotygodniowe; daty, obszary, edycja, archiwizacja i przywracanie.
- Do 12 małych kroków. XP, monety i materiały dzielą się między kroki bez zwiększania łącznej nagrody.
- Dopisywanie rzeczy zrobionych poza aplikacją.
- Sesje 2/5/15/25 minut; pauza, anulowanie i odtworzenie po odświeżeniu. Timer liczy według znacznika końca, a nie liczby wywołań interwału.
- Timer nie zalicza automatycznie zadania i nie daje osobnej waluty.
- Własne nagrody, potwierdzanie odbioru i historia wydatków.
- Baza: warsztat, ogród, obserwatorium; po trzy poziomy, koszt 5/10/15 materiałów.
- Poziomy postaci, XP, aktywne dni z ostatnich siedmiu dni, historia wykonania i sesji.
- Krótka celebracja, opcjonalny dźwięk i wibracje zależne od możliwości urządzenia.
- Spokojny wariant wyglądu oraz respektowanie ustawienia ograniczonego ruchu.
- Instalowalna PWA, lokalny zapis, eksport/import JSON i obsługa offline po pierwszym udanym załadowaniu.
- Automatyczna migracja starych kluczy adhd_agent i adhd_quests. Oryginalne klucze pozostają nienaruszone.
- Stary adres adhd.html prowadzi do aktualnej aplikacji.

To narzędzie organizacyjne, nie pomiar dopaminy ani aplikacja medyczna. Tryb skupienia nie blokuje innych stron i aplikacji. Odpoczynek i podstawowe potrzeby nie wymagają monet.

## Używanie

Otwórz aplikację z hostingu HTTPS, np. GitHub Pages. Repozytorium jest statyczne: publikuj katalog główny, bez kompilacji.

Adres przy standardowym GitHub Pages: https://y33bau.github.io/RPG-ADHD/ (wymaga włączenia Pages).

Na iPhonie: Safari → Udostępnij → Do ekranu początkowego. W przeglądarkach wspierających zdarzenie instalacji przycisk pojawi się w ustawieniach. Pierwsze otwarcie wymaga internetu. Gotowość offline jest potwierdzana komunikatem po aktywowaniu service workera. Nie wystarczy pobrać sam plik HTML.

Dane należą do konkretnego adresu strony, przeglądarki i profilu. Wersja pod inną domeną nie odczyta automatycznie starego localStorage. Wyczyszczenie danych przeglądarki może usunąć postęp: regularnie eksportuj kopię.

## Nagrody i cofanie

| Wielkość | XP | Monety | Materiały |
| --- | ---: | ---: | ---: |
| Mały krok | 15 | 10 | 1 |
| Zadanie | 40 | 25 | 3 |
| Wyzwanie | 80 | 50 | 6 |

Jednorazowy cel dostaje nagrodę raz, cykliczny raz na lokalną datę wystąpienia. Zmiana wielkości, kroków lub cyklu po rozpoczęciu jest zablokowana; opis i obszar można poprawić. Przycisk cofania odwraca wszystkie kroki danego wystąpienia. Jeśli monety lub materiały zostały wydane, cofnięcie jest wstrzymane, dopóki saldo nie wystarczy na odjęcie przyznanej nagrody. Baza nie znika z powodu przerwy.

Cykliczne zadania wracają zgodnie z kalendarzem; pominięte wystąpienia nie tworzą długu. Jednorazowe niewykonane zadania pozostają dostępne po swojej dacie. Woda zeruje się przy zmianie lokalnego dnia i nie daje waluty.

## Dane i odzyskiwanie

Ustawienia → Pobierz kopię / Wczytaj kopię. Import jest walidowany i wymaga osobnego potwierdzenia. Przed zastąpieniem danych pobierana jest obecna kopia (należy pozwolić przeglądarce na pobranie). Jeśli zapis jest uszkodzony, aplikacja go nie nadpisuje i udostępnia pobranie oryginału. Nie zapisuj kolejnych zmian w tym stanie: odzyskaj poprawną kopię.

Konta, chmurowa synchronizacja i powiadomienia push nie są wdrożone. Kopię można ręcznie przenieść na inne urządzenie. Brak backendu oznacza, że zawartość zadań nie jest wysyłana do zewnętrznej usługi przez aplikację.

## Rozwój

Node.js 22 lub nowszy, bez instalowania zależności:

~~~sh
npm run check
npm test
~~~

Testy obejmują budżety nagród, częściowe wykonanie, cofanie po zakupie/rozbudowie, kalendarz, timer i jego odtwarzanie, migrację, walidację importu oraz start aplikacji i generowanie ekranów z atrapą DOM. Testy z atrapą DOM nie zastępują testów wizualnych ani prawdziwej przeglądarki.

| Plik | Odpowiedzialność |
| --- | --- |
| index.html | Semantyczna powłoka i nawigacja |
| styles.css | Responsywny wygląd i ograniczony ruch |
| app.js | Interakcje, widoki, zapis i import |
| core.js | Nagrody, kalendarz, timer, migracja i walidacja |
| sw.js | Bufor offline |
| tests/ | Testy logiki i uruchomienia interfejsu |

Przy zmianie plików aplikacji zwiększ wersję CACHE w sw.js. Nowy worker aktywuje się po zamknięciu starych kart, aby nie łączyć różnych wersji HTML i modułów. Zasoby starego projektu w assets/ pozostają dostępne, ale nowy interfejs nie pobiera dużych dekoracyjnych PNG.

### Kontrola w prawdziwej przeglądarce

- Telefon i desktop: dodaj cel, wykonaj krok, odśwież, dokończ i cofnij.
- Uruchom timer, wstrzymaj, odśwież, wznów; po końcu zapisz sesję i samodzielnie odklikaj wykonanie.
- Odbierz nagrodę, rozbuduj bazę, sprawdź historię i saldo.
- Wyeksportuj kopię, zaimportuj ją ponownie i sprawdź zgodność sald.
- Po komunikacie o gotowości offline odłącz sieć, zamknij i otwórz aplikację.
- Sprawdź klawiaturę, zamykanie dialogów przez Escape i ograniczony ruch.


## Układ i nowości (v2.4)

Pięć zakładek, każda z podzakładkami zamiast jednej długiej strony:

| Zakładka | Podzakładki |
| --- | --- |
| Dzisiaj | Plan · Skupienie (Iskra, body doubling) · Ja (nastrój, rytuały, woda) |
| Zadania | Lista · Zrzut z głowy (z wieczornym przeglądem) · Rutyny |
| Świat | Pogoda · Wyprawa · Kalendarz |
| Baza | Przystań · Wyprawy (bossowie) · Nagrody |
| Postęp | Przegląd (klasa i atrybuty) · Osiągnięcia · Rytm (wykresy) · Historia |

- **Zrzut z głowy**: szybkie pole na ekranie Plan; wieczorny przegląd decyduje o każdej myśli i niedokończonym zadaniu (dziś, jutro, puszczam).
- **Iskra**: towarzysz sesji skupienia z pierścieniem czasu, krótkimi komunikatami i opcjonalnym szumem w tle.
- **Wyprawy**: większy cel jako boss z ciosami. Cios daje 10 XP, 6 monet, 1 materiał; pokonanie premię 60 XP, 30 monet, 4 materiały. Maks. 3 aktywne wyprawy, 10 ciosów.
- **Niespodzianki** (Ustawienia, domyślnie włączone w nowej instalacji): ok. co ósmy krok może dać mały bonus. Wynik zależy od kroku, więc cofanie i powtarzanie niczego nie farmi.
- **Odznaki** liczone z historii, w tym odznaka za powrót po przerwie. **Rytm**: nastrój i energia z 14 dni oraz najlepsze godziny działania.
- Skróty PWA: dodawanie zadania, zrzut z głowy, skupienie (`?action=add|dump|focus`).
- Nowe dane dodatków (zrzuty, nastrój, rytuały, rutyny, wyprawy) są w tym samym kluczu co dotychczasowe dodatki, więc podróżują z synchronizacją.

## Powiadomienia (v2.1)

Ustawienia → Powiadomienia i przypomnienia. Zgoda systemowa jest pytana dopiero po naciśnięciu przycisku. Przypomnienia lokalne działają przy otwartej aplikacji, w wybranych godzinach; nie są push po jej zamknięciu. iPhone wymaga aplikacji dodanej do ekranu początkowego.

Prawdziwy Web Push jest obsługiwany przez service worker i panel połączenia. Usługa jest w katalogu push-worker (Cloudflare Workers, instrukcja w push-worker/README.md). Wystarczy ją wdrożyć i wpisać jej adres oraz klucz dostępu. Bez tego aplikacja uczciwie pokazuje, że działa tylko tryb lokalny. Serwer otrzymuje subskrypcję urządzenia i harmonogram, bez treści zadań, kontaktów i prowizji.

Licznik wody na ekranie Dzisiaj: cel 2 l, 10 porcji po 200 ml, cofanie porcji i reset po lokalnej północy. Woda nie daje punktów ani monet.

## Ochrona danych

Plik `storage-guard.js` (identyczny w agent i RPG-ADHD) przy pierwszym zapisie prosi przeglądarkę o trwałe przechowywanie (`navigator.storage.persist()`). W Ustawieniach pokazuje, czy dane są chronione i kiedy pobrano ostatnią kopię. Gdy kopia jest starsza niż 7 dni, raz dziennie przypomina o niej krótkim komunikatem. Synchronizacja zapamiętuje skrót SHA-256 ostatniego stanu zamiast jego pełnej kopii, więc nie zajmuje drugi raz miejsca w localStorage.
