# sprintspaces.github.io

Publiczna strona sprzedażowa SprintSpaces, utrzymywana w GitHub Pages. Kod prywatnej aplikacji pozostaje w osobnym repozytorium.

## Lokalnie

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Otwórz http://127.0.0.1:4173/. Strona nie wymaga kompilacji ani zależności. GitHub Pages publikuje katalog główny gałęzi `main`.

## Wersje językowe (PL / EN)

Polska strona zachowuje dotychczasowy adres `/`, a angielska jest dostępna pod
`/en/`. Obie mają pełną treść w HTML, własny canonical i wzajemne odnośniki
`hreflang` (`pl`, `en`, `x-default`). Sitemap zawiera oba adresy. Nie przekierowujemy
automatycznie na podstawie języka przeglądarki: wybór jest zawsze dostępny w nagłówku,
także bez JavaScript. Przy włączonym JS przełącznik zachowuje aktualną sekcję.

Źródłem wspólnego układu są polskie pliki `index.html`, `prywatnosc.html` i
`brand/index.html`. Tłumaczenia znajdują się w `locales/en.json`, z polską treścią
jako kluczem. Po zmianie treści lub układu uruchom:

```sh
python3 tools/build-locales.py
python3 tools/build-locales.py --check
python3 -m unittest discover -s test -p '*_test.py'
node --test test/*.test.mjs
```

Generator używa wyłącznie biblioteki standardowej Pythona. Tworzy `en/index.html`,
`en/privacy.html`, `en/brand/index.html` i `locales/runtime-en.mjs`. Te pliki są
wersjonowane i nie należy edytować ich ręcznie. Brak tłumaczenia przerywa generowanie;
CI sprawdza, czy wygenerowane pliki są aktualne i czy linki lokalne są poprawne.
GitHub Pages nadal serwuje gotowe pliki bez etapu budowania na serwerze.

Teksty interaktywne używają `t('Polska treść')` z `i18n.mjs`; argumenty dynamiczne
mają postać `{seconds}` i są przekazywane jako drugi argument. Generator wybiera
te dosłowne klucze do niewielkiego słownika runtime. Stałe pierwszego logowania
i estymacji dema są uwzględniane osobno. Język pochodzi z `html lang`.
Demo korzysta ze wspólnego storage dla obu ścieżek, więc zmiana języka nie tworzy
nowej instancji. `tools/configure-demo.mjs` aktualizuje adres API w obu wersjach.

Angielska strona ma własny obraz udostępniania `assets/social-card-en.png`
(źródło wektorowe: `assets/social-card-en.svg`). Zrzuty aplikacji pozostają
oryginalnymi zrzutami polskiego interfejsu, co opisują angielskie podpisy.
Prywatność i materiały marki zachowują dotychczasowe `noindex`; pełna techniczna
specyfikacja marki w Markdown pozostaje po polsku i jest odpowiednio oznaczona.

## Zawartość

- `index.html`, `styles.css`, `app.js`: responsywna strona, galeria sześciu widoków, powiększanie, kontakt.
- `assets/screenshots/`: rzeczywiste zrzuty aktualnej aplikacji na fikcyjnych danych. PNG to oryginały, WebP to wersje do strony.
- `brand/`: identyfikacja i pliki dla mailingu; `brand/BRAND.md` jest specyfikacją.
- Formularz używa tego samego endpointu co mleczakm.github.io: `https://formspree.io/f/xdavweok`. Ma natywne POST jako fallback, walidację HTML, pułapkę antyspamową oraz obsługę odpowiedzi AJAX. Nie wysyłać testowych zgłoszeń do właściciela bez potrzeby; weryfikować odpowiedzi przez lokalny mock.

## Demo na żywo

Sekcja „Wypróbuj” nie wymaga wyboru sposobu logowania: nowe publiczne demo używa profilu plain, bez obowiązkowej zmiany hasła i2FA. Sekcja (`#demo`) rozmawia z usługą z repozytorium `SprintSpaces/Demo` (trzy punkty: `POST /v1/demos`, `GET /v1/demos/{job}`, `GET /v1/stats`). Adres usługi jest w `<meta name="demo-api" content="">` w `index.html`;
**pusty = sekcja jest wyłączona** (komunikat „Demo jest chwilowo niedostępne”) i nic nie jest wysyłane. Ustaw go dopiero, gdy usługa działa i jej `DEMO_ALLOWED_ORIGINS` zawiera `https://sprintspaces.github.io`.
Każda nowa instancja jest usuwana po15minutach bezczynności w aplikacji; przy braku RAM może czekać na zasoby. Nie ma parametru zmieniającego adres usługi w locie. Licznik „aktywne N/3” i „uruchomiono łącznie” pochodzą z usługi. Logika jest w `demo-core.mjs` (testy: `node --test test/*.test.mjs`), widok w `demo.js`, wygląd w `demo.css`.
Do oglądania w przeglądarce bez usługi: `node tools/mock-demo-api.mjs` serwuje stronę z atrapą usługi i scenariuszami (`/__scenario?name=full|rate|offline|expired|badurl|normal|slow|waiting|failed`).

## Treści i weryfikacja

Możliwości potwierdzone w README i dokumentacji prywatnej aplikacji: Kanban/Scrum, projekty i etapy, oś czasu, kalendarz, akceptacje, kontrola dostępu, ewidencja czasu, raporty, Microsoft 365, Spinka/ElevenLabs, MCP i REST API.

Migracja jest elementem przygotowywanego wdrożenia: Excel oraz Google Sheets po eksporcie i mapowaniu. Konfigurowalna synchronizacja dotyczy Excela na SharePoint/OneDrive. Nie obiecywać uniwersalnego konektora Google Sheets, niezweryfikowanej wydajności ani liczbowego minimum RAM/CPU.

Po odbiorze rzeczywistego backendu ustaw publiczny adres przez
`node tools/configure-demo.mjs https://PUBLICZNY-BACKEND`.
Skrypt najpierw wymaga prawdziwego HTTP200 `/v1/stats`, limitu3, ttl_seconds900 oraz expiry_policy=idle/idle_timeout_seconds900
oraz CORS dokładnie dla `https://sprintspaces.github.io`; dopiero potem zmienia
meta w `index.html` oraz `en/index.html`. Testy skryptu używają atrap i nie uruchamiają dem.
Strona wywołuje publiczne `POST /v1/demos`. Podpisany `/v1/hooks/demo` jest
wyłącznie dla wywołań serwer–serwer; jego sekret nigdy nie trafia do HTML/JS.
Sama kontrola stats/CORS nie zastępuje próby start→readiness→logowanie→expiry→cleanup.


## Oczekiwanie i gotowość dema

`demo-launch.mjs` przechowuje stałą estymację **34 s (±3 s)**. Podstawa: rzeczywista
instancja Mikrus z 25.10.2026, od created_at 18:54:10 UTC do ready_at 18:54:44 UTC.
To pojedynczy pomiar przykładowy, a ±3 s jest tolerancją prezentacji, nie statystyczną
obietnicą. Ponowna próba z 19:12 UTC zakończyła się błędem przydzielenia domeny,
więc nie została użyta jako pomiar udanego startu.

Pasek płynnie rośnie między odpowiedziami backendu i ma animowane pasy. Pozostaje
poniżej 100% do rzeczywistego `ready`. Po przekroczeniu estymacji wyświetla
informację o dłuższym przygotowaniu; kolejka zasobów nie obiecuje terminu startu.
Nieudana instancja, która nigdy nie była gotowa, otrzymuje komunikat błędu startu.
Okno gotowości pojawia się raz po ręcznym uruchomieniu, bez ponownego otwierania
przy odświeżeniu strony lub okresowym sprawdzaniu stanu.

Adres, login i hasło mają przyciski kopiowania; hasło jest domyślnie ukryte,
a przycisk oka przełącza jego widoczność. Kopiowanie ma potwierdzenie i obsługę
odmowy dostępu do schowka. Wygaszenie i ponowna kontrola terminu usuwają dane
z pól oraz zamykają okno. Poświadczenia nie są zapisywane w storage ani kopiowane
do okna powitalnego. Klawiatura, etykiety czytników ekranu i reduced-motion są
obsługiwane. Mobilny układ zachowuje pola i ich przyciski w jednym wierszu.

Weryfikacja: `node --test test/*.test.mjs`; lokalny mock pozwala sprawdzić
normalny start, `slow` (przekroczenie estymacji), `waiting` (kolejka), `failed`
(błąd przed gotowością), wygaszenie i błędy sieci bez tworzenia realnych instancji.

Nowe dema korzystają z automatycznych adresów `wanda192-PORT.mikrus.cloud`. Backend nie rejestruje dla nich rekordów w panelu; po usunięciu instancji port jest trwale wycofany. Stary adres nie prowadzi do późniejszego demo. Frontend akceptuje ten schemat wyłącznie dla właściwej VM i poprawnego zakresu portów. Historyczne rekordy Cytrusa wymagają osobnego usunięcia; ta zmiana ich nie usuwa.

Otwarte karty tej samej przeglądarki mogą odzyskać prywatny job przez BroadcastChannel przed nowym POST. Token pozostaje w sessionStorage każdej karty; hasło/login/URL nie są przesyłane kanałem ani zapisywane w localStorage. Gdy żadna karta nie ma tokenu, ograniczenie IP pozostaje i nie ujawnia dostępu innym osobom za tym samym adresem.
