# Usługa push dla SYNAPSE (Cloudflare Workers)

Wysyła przypomnienia (woda, mały krok), gdy aplikacja jest zamknięta. Przechowuje tylko identyfikator urządzenia, subskrypcję push i harmonogram. Nie zna Twoich zadań.

## Wdrożenie bez terminala (przez panel Cloudflare)

1. Scal gałąź z aplikacją do `main` w GitHubie.
2. Cloudflare → **Workers & Pages** → **Create** → **Import a repository** → wybierz `RPG-ADHD`.
3. Jako **Root directory** wpisz `push-worker`. Zatwierdź i poczekaj na pierwsze wdrożenie (Cloudflare sam utworzy magazyn KV).
4. W pliku `wrangler.toml` zmień `VAPID_SUBJECT` na swój e-mail (`mailto:...`). Jest to wymagane przez serwisy push.
5. Worker → **Settings** → **Variables and Secrets** → dodaj **Secret** o nazwie `API_TOKEN`. Wymyśl losowy tekst, minimum 24 znaki, i go zapisz.
6. Skopiuj adres workera (`https://synapse-push.TWOJA-NAZWA.workers.dev`).

## Podłączenie w aplikacji

Ustawienia → Powiadomienia i przypomnienia → Push przy zamkniętej aplikacji. Wklej adres i `API_TOKEN`, naciśnij **Połącz push**. Na iPhonie aplikacja musi być dodana do ekranu początkowego.

## Jak to działa

- Klucze VAPID tworzą się same przy pierwszym użyciu i leżą w Twoim KV.
- Co 5 minut zadanie cron sprawdza harmonogramy i wysyła powiadomienia zaszyfrowane zgodnie z RFC 8291.
- Wygasłe subskrypcje są usuwane automatycznie.
- Pozwolone źródło zapytań to `ALLOWED_ORIGINS` (domyślnie Twoja strona na GitHub Pages).
- Testy: `node --test push-worker/worker.test.mjs`.
