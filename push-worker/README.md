# Usługa push dla SYNAPSE (Cloudflare Workers)

Działa jako worker **agent-synapse-push**: `https://agent-synapse-push.ad-szelag.workers.dev`.
Wysyła przypomnienia (woda, mały krok), gdy aplikacja jest zamknięta. Przechowuje tylko identyfikator urządzenia, subskrypcję push i harmonogram. Nie zna Twoich zadań.

## Co jest w Cloudflare

- **KV** `agent-synapse-subscriptions` (powiązanie `SUBSCRIPTIONS`): subskrypcje urządzeń.
- **Zmienna** `ALLOWED_ORIGIN = https://y33bau.github.io`: tylko ta strona może rozmawiać z usługą.
- **Sekrety:** `PUSH_ACCESS_TOKEN` (klucz wpisywany w aplikacji), `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- **Cron:** co 5 minut sprawdza harmonogramy i wysyła powiadomienia.

## Podłączenie w aplikacji

Więcej → Ustawienia → Ustawienia i kopie danych → Push przy zamkniętej aplikacji. Wpisz adres usługi i `PUSH_ACCESS_TOKEN`, naciśnij **Połącz push**. Na iPhonie aplikacja musi być dodana do ekranu początkowego.

## Wdrożenie poprawek

Ten plik to kopia kodu działającego w Cloudflare. Najprościej: panel Cloudflare → worker → **Edit code**, wklej zawartość `worker.js` wraz z funkcjami z `../notification-core.js` i kliknij **Deploy**. Z terminala: `npx wrangler deploy` w tym folderze.

## Historia błędu (20.11.2026)

Pierwsza wersja używała biblioteki `web-push` dla Node i opcji `redirect: "error"`, której Workers nie obsługują. Każda wysyłka kończyła się błędem. Obecna wersja używa tylko WebCrypto i `redirect: "manual"`.

Testy: `node --test push-worker/worker.test.mjs`.
