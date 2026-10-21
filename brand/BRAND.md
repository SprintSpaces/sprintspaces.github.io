# SprintSpaces — branding, 21.10.2026

## Identyfikacja

- Nazwa: **SprintSpaces** (łącznie, wielkie S i S). Logotyp: Sprint zwykłe, Spaces pogrubione.
- Hasło marki: **Przestrzeń na dobrą pracę.**
- Hasło strony sprzedażowej: **Mniej arkuszy. Więcej porządku.**
- Opis: Projekty, zadania i zgłoszenia w jednej przestrzeni.
- Zachowano znak z aplikacji: kwadrat z rogami o promieniu 8/32 szerokości i trzema białymi liniami (ostatnia krótsza). Główny błękit ujednolicono z aktualnym interfejsem aplikacji: #0C66E4.

## Kolory

| Zastosowanie | HEX |
|---|---|
| Marka / główne CTA | #0C66E4 |
| Hover CTA | #0055CC |
| Tekst główny / ciemne tło | #172B4D |
| Tekst pomocniczy | #626F86 |
| Tło | #F7F8F9 |
| Powierzchnia | #FFFFFF |
| Obramowanie | #DCDFE4 |
| Jasny akcent | #E9F2FF |
| Sukces | #1F845A / #DCFFF1 |
| Ostrzeżenie | #A54800 / #FFF7D6 |
| Błąd | #C9372C / #FFECEB |
| Spinka / AI | #6E5DC6 |

Źródło palety: web/static/app.css aplikacji. Spinka zachowuje swój znak z aplikacji. Nie oznaczaj całej marki fioletem; fiolet dotyczy asystenta / AI.

## Pliki publiczne

- Znak SVG: https://sprintspaces.github.io/assets/logo.svg
- Znak biały SVG: https://sprintspaces.github.io/assets/logo-white.svg
- PNG: https://sprintspaces.github.io/assets/logo-512.png oraz logo-192.png, logo-1024.png
- Logotyp na ciemne tło PNG: https://sprintspaces.github.io/assets/wordmark-white.png
- Logotyp SVG: https://sprintspaces.github.io/assets/wordmark.svg
- Logotyp PNG 1104×224: https://sprintspaces.github.io/assets/wordmark.png
- Spinka SVG: https://sprintspaces.github.io/assets/spinka.svg
- Tokeny: https://sprintspaces.github.io/brand/tokens.json

Pole ochronne co najmniej ¼ szerokości znaku. Minimalny znak 24 px. Nie rozciągać, nie zmieniać geometrii, nie dodawać cienia do samego znaku. Wersja biała na granatowym/niebieskim tle. Wersja podstawowa na białym/jasnym tle.

## Typografia i głos

WWW: systemowy font bezszeryfowy jak w aplikacji. Mailing: Arial, Helvetica, sans-serif. Krótkie polskie zdania, konkretne zadanie/status/termin, spokojny ton. Bez marketingowych obietnic w powiadomieniach operacyjnych.

### Jak opisywać produkt

- Wyjaśniaj konkretną czynność i efekt: „Wyślij kartę tygodnia do zatwierdzenia”, „Zobacz zadania po terminie”. Unikaj ogólników takich jak „pełny kontekst” czy „wspólny rytm zespołu”.
- Przy pierwszym użyciu wyjaśnij „przestrzeń”: miejsce dla zespołu lub projektu z własnymi statusami, polami i formularzami.
- Pisz do jednej osoby („Twój zespół”, „wybierz”), a czynności zespołowe nazywaj wprost. Nie przeplataj przypadkowo form „Ty” i „Wy”.
- Rozróżniaj migrację danych, konfigurację integracji i codzienne funkcje aplikacji. Dane z Arkuszy Google importujemy z eksportu; dwukierunkowa synchronizacja Excela w SharePoint/OneDrive wymaga konfiguracji wybranych pól.
- Zaproszenie dotyczy darmowego wdrożenia testowego. Zakres, czas i ewentualne koszty usług zewnętrznych są ustalane przed startem.

## Mailing — instrukcja dla Claude

- Nazwa nadawcy i nagłówek: SprintSpaces; nie zmieniać technicznego adresu skrzynki bez potrzeby.
- PNG logotypu wyświetlany 220×45 px lub znak 32×32 px + tekst; alt="SprintSpaces". SVG nie powinno być jedynym formatem grafiki w wiadomości.
- Zalecane osadzenie CID; jeśli zewnętrzny publiczny obraz, używać absolutnych URL powyżej. Treść i CTA muszą działać przy wyłączonych obrazkach.
- Kontener 600–640 px, białe tło, zewnętrzne #F7F8F9, cienkie #DCDFE4 obramowania, zaokrąglenie ok. 8 px. Stylowanie tabelami i inline, bez JS, webfontów i zależności od flex/grid.
- Główne CTA #0C66E4 z białym tekstem; linki #0C66E4. Informacje hierarchicznie: rodzaj zdarzenia, kod i tytuł (tylko jeśli dozwolone), autor/zmiana, komentarz, link do sprawy, dostępna historia.
- Stopka produktowa: SprintSpaces — przestrzeń na dobrą pracę. Link aplikacyjny używa adresu danej instancji; marketing: https://sprintspaces.github.io/.
- Zachować istniejące ACL, poufność, threading, outbox, pełną autoryzowaną historię i wariant tekstowy. Branding nie poszerza odbiorców ani treści. Bez testowych maili do ludzi.
- Spinka: asystent wspomagający obsługę aplikacji, opcjonalna integracja ElevenLabs. Własny agent (np. Claude): połączenie przez MCP z uprawnieniami użytkownika i zakresem dostępu zatwierdzonym w SprintSpaces. Domyślnie zaznaczony jest tylko odczyt zwykłych zgłoszeń; dodatkowe zakresy użytkownik włącza osobno. Potwierdzenie operacji w rozmowie opisujemy jako zachowanie Spinki, nie jako wspólną cechę wszystkich klientów MCP.

## Zakres strony

Strona i publiczny profil organizacji nie ujawniają kodu prywatnej aplikacji, klientów ani rzeczywistych danych. Zrzuty wykonano na izolowanej kopii aktualnej aplikacji z fikcyjnymi osobami, projektami i zadaniami; nie retuszowano interfejsu. Źródłowe PNG i zoptymalizowane WebP są w assets/screenshots/.
