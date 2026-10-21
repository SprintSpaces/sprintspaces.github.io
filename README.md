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

## Treści i weryfikacja

Możliwości potwierdzone w README i dokumentacji prywatnej aplikacji: Kanban/Scrum, projekty i etapy, oś czasu, kalendarz, akceptacje, kontrola dostępu, ewidencja czasu, raporty, Microsoft 365, Spinka/ElevenLabs, MCP i REST API.

Migracja jest elementem przygotowywanego wdrożenia: Excel oraz Google Sheets po eksporcie i mapowaniu. Konfigurowalna synchronizacja dotyczy Excela na SharePoint/OneDrive. Nie obiecywać uniwersalnego konektora Google Sheets, niezweryfikowanej wydajności ani liczbowego minimum RAM/CPU.
