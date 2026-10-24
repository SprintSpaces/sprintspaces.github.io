# sprintspaces.github.io

Publiczna strona sprzedażowa SprintSpaces, utrzymywana w GitHub Pages. Kod prywatnej aplikacji pozostaje w osobnym repozytorium.

## Lokalnie

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Otwórz http://127.0.0.1:4173/. Strona nie wymaga kompilacji ani zależności. GitHub Pages publikuje katalog główny gałęzi `main`.

## Zawartość

- `index.html`, `styles.css`, `app.js`: responsywna strona, galeria sześciu widoków, powiększanie, kontakt.
- `assets/screenshots/`: rzeczywiste zrzuty aktualnej aplikacji na fikcyjnych danych. PNG to oryginały, WebP to wersje do strony.
- `brand/`: identyfikacja i pliki dla mailingu; `brand/BRAND.md` jest specyfikacją.
- Formularz używa tego samego endpointu co mleczakm.github.io: `https://formspree.io/f/xdavweok`. Ma natywne POST jako fallback, walidację HTML, pułapkę antyspamową oraz obsługę odpowiedzi AJAX. Nie wysyłać testowych zgłoszeń do właściciela bez potrzeby; weryfikować odpowiedzi przez lokalny mock.

## Demo na żywo

Sekcja „Wypróbuj” (`#demo`) rozmawia z usługą z repozytorium `SprintSpaces/Demo` (trzy punkty: `POST /v1/demos`, `GET /v1/demos/{job}`, `GET /v1/stats`). Adres usługi jest w `<meta name="demo-api" content="">` w `index.html`;
**pusty = sekcja jest wyłączona** (komunikat „Demo jest chwilowo niedostępne”) i nic nie jest wysyłane. Ustaw go dopiero, gdy usługa działa i jej `DEMO_ALLOWED_ORIGINS` zawiera `https://sprintspaces.github.io`.
Każda nowa instancja trwa15minut od gotowości; przy braku RAM może czekać na zasoby. Nie ma parametru zmieniającego adres usługi w locie. Licznik „aktywne N/3” i „uruchomiono łącznie” pochodzą z usługi. Logika jest w `demo-core.mjs` (testy: `node --test test/*.test.mjs`), widok w `demo.js`, wygląd w `demo.css`.
Do oglądania w przeglądarce bez usługi: `node tools/mock-demo-api.mjs` serwuje stronę z atrapą usługi i scenariuszami (`/__scenario?name=full|rate|offline|expired|badurl|normal`).

## Treści i weryfikacja

Możliwości potwierdzone w README i dokumentacji prywatnej aplikacji: Kanban/Scrum, projekty i etapy, oś czasu, kalendarz, akceptacje, kontrola dostępu, ewidencja czasu, raporty, Microsoft 365, Spinka/ElevenLabs, MCP i REST API.

Migracja jest elementem przygotowywanego wdrożenia: Excel oraz Google Sheets po eksporcie i mapowaniu. Konfigurowalna synchronizacja dotyczy Excela na SharePoint/OneDrive. Nie obiecywać uniwersalnego konektora Google Sheets, niezweryfikowanej wydajności ani liczbowego minimum RAM/CPU.

Po odbiorze rzeczywistego backendu ustaw publiczny adres przez
`node tools/configure-demo.mjs https://PUBLICZNY-BACKEND`.
Skrypt najpierw wymaga prawdziwego HTTP200 `/v1/stats`, limitu3 oraz ttl_seconds900
oraz CORS dokładnie dla `https://sprintspaces.github.io`; dopiero potem zmienia
meta w `index.html`. Testy skryptu używają atrap i nie uruchamiają dem.
Strona wywołuje publiczne `POST /v1/demos`. Podpisany `/v1/hooks/demo` jest
wyłącznie dla wywołań serwer–serwer; jego sekret nigdy nie trafia do HTML/JS.
Sama kontrola stats/CORS nie zastępuje próby start→readiness→logowanie→expiry→cleanup.
