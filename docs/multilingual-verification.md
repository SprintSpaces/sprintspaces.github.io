# Polish / English site verification — 2026-10-26

The Polish landing page remains at `/`; the English page is `/en/`. Privacy and
brand pages have equivalent language links. No automatic browser-language redirect
is used. Both landing pages contain their full text and metadata in static HTML.

## Automated checks

- `python3 tools/build-locales.py --check`: generated English HTML and the runtime
  dictionary match their sources.
- `python3 -m unittest discover -s test -p '*_test.py'`: 6 passing checks for
  generation, missing translations, reciprocal canonical/hreflang links, language
  switches, local assets and anchors, shared demo/form configuration and sitemap.
- `node --test test/*.test.mjs`: 41 passing tests, including translated demo
  failures, interpolation parity and API configuration for both languages.
- `git diff --check`: clean.

## Local Chromium checks

Used Playwright with `node tools/mock-demo-api.mjs 4187`. Formspree requests were
intercepted with synthetic responses. No contact message or real demo was created.

- Both landing pages at widths 320, 375, 768, 901, 1024, 1150 and 1440: no page
  overflow or overlapping header controls. Desktop and mobile screenshots reviewed.
- All six gallery tabs load their images and localized captions; zoom opens and
  closes; mobile navigation opens and closes with Escape.
- Language switching preserves the section fragment. With JavaScript disabled,
  both pages retain their full copy and the language switch still navigates.
- Contact form success and error responses are localized in both languages;
  success clears the form and errors preserve the message.
- Privacy and brand pages checked at 375 px.
- English demo scenarios: ready, full, rate limited, waiting for resources, failed
  startup, rejected demo URL and offline. Progress, status and retry copy is English.
- Password starts hidden; show/hide and clipboard feedback are localized.
- Switching EN → PL → EN while a demo is ready retains the same stored job,
  restores credentials and does not reopen the initial readiness dialog. Expiry
  removes the displayed password and URL.
- No uncaught browser exceptions or missing local resources during these checks.
- English social card reviewed at its native 1200 × 630 size.

The application screenshots intentionally retain the original Polish UI, disclosed
in the English captions. The downloadable full brand specification remains Polish
and is labeled accordingly. This change does not alter the demo application's
language settings. Production deployment and search indexing are not covered by
these local checks.
