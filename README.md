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
