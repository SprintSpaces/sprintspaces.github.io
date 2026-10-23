# Verification — 2026-10-21

Published site: https://sprintspaces.github.io/
Site source commit: a3bd6e9
Organization profile: https://github.com/SprintSpaces
Profile source commit: 272e118

- GitHub Pages build: built, HTTPS enforced, HTTP 200.
- Static JavaScript syntax and all local HTML file references: pass.
- Desktop and mobile (390 px viewport): no horizontal page overflow; hero, menu, gallery and contact reviewed.
- Gallery: six views switch, selected state and corresponding source images verified; image dialog opens and closes.
- Form: existing Formspree endpoint xdavweok verified against personal website source. Success HTTP 200 and error HTTP 422 tested by browser interception, without transmitting a message. Success resets fields; error preserves content and re-enables submit.
- Public privacy information and brand assets available. Logo, Spinka mark, PNG wordmark and six optimized WebP screenshots load.
- Organization metadata updated by GitHub API. Avatar uploaded via Firefox, GitHub confirmation: “Your profile picture has been updated. It may take a few minutes to update across the site.”
- Branding sent to Claude in “Szablony wiadomości email”; Claude confirmed receipt and started reading BRAND.md.
- Original application source not edited. Screenshots generated from a disposable /tmp copy with fictional names and tasks, no production data or service credentials.

## Demo na żywo (2026-10-23)

Sprawdzone w przeglądarce panelu aplikacji na atrapie usługi (`qa/mock-demo-api.mjs`), nie na prawdziwej usłudze: wybór wariantu, uruchomienie, pasek postępu, gotowe demo z hasłem domyślnie ukrytym, odświeżenie karty wraca do tego samego demo
(w `sessionStorage` tylko identyfikator prośby i zadania — bez adresu, loginu i hasła), odliczanie, koniec czasu, pełna pula, limit prób, brak sieci, adres spoza darmowych domen nie jest linkowany, widok 375 px bez przewijania poziomego.
Testy logiki: `node --test test/demo-core.test.mjs` (14). Nie sprawdzono: realnej usługi i prawdziwego CORS z `https://sprintspaces.github.io`, czytników ekranu, Safari/Firefox.

Poprawka po recenzji 2944277: koniec dostępu wynika z zegara i terminu podanego przez usługę (offline, zawieszenie, 5xx, uśpiona karta) i czyści adres, login i hasło z DOM (nie tylko ukrywa); „gotowe” bez poprawnego terminu
(brak, pusty, zły format, przeszły, dalszy niż 25 h) jest odrzucane; obok odliczania jest dokładny moment końca (data, godzina, strefa). Przeglądarka znalazła błąd, którego testy logiki nie widziały
(`toLocaleString` z `dateStyle` i `timeZoneName` rzuca wyjątek) — poprawione. Atrapa usługi jest w `tools/mock-demo-api.mjs` (`qa/` jest w `.gitignore`). Nadal brak: prawdziwej usługi, prawdziwego CORS, czytników ekranu.
