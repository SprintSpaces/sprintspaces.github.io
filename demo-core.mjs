// The logic of the "Wypróbuj" section, without the page: what is asked of the demo service, what the answers mean, what is remembered.
// It is a module so that it can be tested without a browser (test/demo-core.test.mjs).
//
// What is remembered in the browser tab (sessionStorage): the idempotency key of this visitor's request and the private job token the
// service returned. Never the address, the user name or the password: those are asked of the service again whenever the page needs
// them, and the service shows them only while the demo is ready and only to the holder of the token.

export const PROFILES = [
  { id: 'plain', label: 'Proste wejście', text: 'Logujesz się podanym hasłem. Drugi składnik jest opcjonalny.' },
  { id: 'password', label: 'Zmiana hasła', text: 'Przy pierwszym logowaniu ustawiasz własne hasło. Drugi składnik jest opcjonalny.' },
  { id: 'mfa', label: 'Drugi składnik wymagany', text: 'Przy pierwszym logowaniu konfigurujesz aplikację uwierzytelniającą (TOTP). Hasło zostaje to, które widzisz.' },
  { id: 'strict', label: 'Hasło i drugi składnik', text: 'Najpierw ustawiasz własne hasło, potem konfigurujesz drugi składnik.' },
];

export const FIRST_LOGIN = {
  change_password: 'Zostaniesz poproszony(-a) o ustawienie własnego hasła.',
  enrol_2fa: 'Zostaniesz poproszony(-a) o skonfigurowanie drugiego składnika (aplikacja uwierzytelniająca, kod TOTP).',
};

const STORE_KEY = 'sprintspaces-demo';
// the free names the demo service registers; a link to any other host is not shown as a link
const HOSTS = /\.(byst\.re|bieda\.it|toadres\.pl)$/;

export function newKey(randomBytes) {
  const b = new Uint8Array(16);
  randomBytes(b);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function safeDemoUrl(raw, hostPattern = HOSTS) {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !hostPattern.test(u.hostname)) return '';
    return u.origin + '/';
  } catch { return ''; }
}

export function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const total = Math.floor(ms / 1000), h = Math.floor(total / 3600), m = Math.floor(total % 3600 / 60), s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function createDemo({ api, fetch: doFetch, storage, now = () => Date.now(), randomBytes, timeoutMs = 10000, hostPattern = HOSTS, onChange = () => {} }) {
  const state = {
    phase: api ? 'idle' : 'unavailable', // idle | starting | ready | ended | full | rate | offline | error | unavailable
    progress: 0, stats: null, creds: null, expiresAt: 0, profile: 'plain', firstLogin: [], retryAt: 0, message: '',
  };
  const emit = () => onChange({ ...state, stats: state.stats && { ...state.stats }, creds: state.creds && { ...state.creds } });
  const set = patch => { Object.assign(state, patch); emit(); };

  const load = () => { try { return JSON.parse(storage.getItem(STORE_KEY) || 'null') || {}; } catch { return {}; } };
  const save = v => { try { storage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* a tab that cannot remember still works */ } };
  const forget = () => { try { storage.removeItem(STORE_KEY); } catch { /* ignore */ } };

  async function call(method, path, body) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await doFetch(api + path, {
        method, mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: ctl.signal,
        headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
      });
      let data = null;
      try { data = await res.json(); } catch { /* an answer without a body */ }
      return { status: res.status, data, retryAfter: Number(res.headers && res.headers.get && res.headers.get('Retry-After')) || 0 };
    } catch {
      return { status: 0, data: null, retryAfter: 0 };
    } finally { clearTimeout(timer); }
  }

  async function refreshStats() {
    if (!api) return;
    const r = await call('GET', '/v1/stats');
    if (r.status === 200 && r.data && Number.isSafeInteger(r.data.active) && Number.isSafeInteger(r.data.max)
        && r.data.max >= 1 && r.data.max <= 10 && r.data.active >= 0 && r.data.active <= r.data.max
        && Number.isSafeInteger(r.data.total_ready) && r.data.total_ready >= 0) {
      set({ stats: { active: r.data.active, max: r.data.max, total: r.data.total_ready, full: r.data.active >= r.data.max } });
    }
  }

  // start asks for a demo. The same visitor, the same tab, the same key: a retry or a refresh reaches the same demo.
  async function start(profile) {
    if (!api) return;
    if (!PROFILES.some(p => p.id === profile)) profile = 'plain';
    let mem = load();
    if (!mem.key || mem.ended) mem = { key: newKey(randomBytes), profile };
    // An uncertain response may already have reserved this key. Retrying it
    // must keep the sign-in policy the visitor originally selected, too.
    if (PROFILES.some(p => p.id === mem.profile)) profile = mem.profile;
    mem.profile = profile;
    save(mem);
    set({ phase: 'starting', progress: 2, profile, message: '', creds: null, firstLogin: [] });
    const r = await call('POST', '/v1/demos', { key: mem.key, profile });
    switch (true) {
      case r.status === 200 || r.status === 202: {
        if (!r.data || typeof r.data.job !== 'string') return set({ phase: 'error', message: 'Usługa odpowiedziała niezrozumiale. Spróbuj ponownie.' });
        mem.job = r.data.job;
        save(mem);
        return;
      }
      case r.status === 503 && r.data && r.data.error === 'full':
        forget();
        await refreshStats();
        return set({ phase: 'full', message: 'Wszystkie miejsca są teraz zajęte. Każde demo kończy się samo po 15 minutach — spróbuj za chwilę.' });
      case r.status === 429:
        forget();
        return set({ phase: 'rate', retryAt: now() + (r.retryAfter || 60) * 1000, message: 'Za dużo prób z tego adresu. Poczekaj chwilę i spróbuj ponownie.' });
      case r.status === 409:
        if (mem.job) return; // this tab already has one: keep following it
        forget();
        return set({ phase: 'error', message: 'Z tego adresu działa już demo. Wróć do karty, w której je uruchomiono, albo poczekaj, aż się skończy.' });
      case r.status === 400:
        forget();
        return set({ phase: 'error', message: 'Nie udało się przyjąć prośby. Odśwież stronę i spróbuj ponownie.' });
      case r.status === 0:
        return set({ phase: 'offline', message: 'Brak połączenia z usługą demo. Sprawdź sieć i spróbuj ponownie.' });
      default:
        return set({ phase: 'error', message: 'Usługa demo ma chwilowy kłopot. Spróbuj ponownie za chwilę.' });
    }
  }

  // expireIfDue ends the demo by the clock: the moment the service named is the end of access, whether or not the network answers, the tab
  // was asleep, or the service hangs. It clears the address, the login and the password from the state.
  function expireIfDue() {
    if (state.phase === 'ready' && state.expiresAt && now() >= state.expiresAt) {
      forget();
      set({ phase: 'ended', creds: null, firstLogin: [], progress: 100, message: 'Czas demo minął. Możesz uruchomić nowe.' });
      return true;
    }
    return false;
  }

  // step follows the demo once and says when to look again (milliseconds), or null when there is nothing more to wait for.
  async function step() {
    if (expireIfDue()) return null;
    const mem = load();
    if (!api || !mem.job) return null;
    const r = await call('GET', '/v1/demos/' + encodeURIComponent(mem.job));
    if (expireIfDue()) return null; // time may have passed while the request was out
    if (r.status === 0) { set({ phase: state.phase === 'ready' ? 'ready' : 'offline', message: 'Brak połączenia z usługą demo — próbuję ponownie.' }); return 5000; }
    if (r.status === 404) { forget(); set({ phase: 'ended', creds: null, message: 'To demo już nie istnieje. Możesz uruchomić nowe.' }); return null; }
    if (r.status !== 200 || !r.data) { set({ phase: state.phase === 'ready' ? 'ready' : 'error', message: 'Usługa demo ma chwilowy kłopot — próbuję ponownie.' }); return 8000; }
    const d = r.data;
    const firstLogin = Array.isArray(d.first_login) ? d.first_login.filter(k => k in FIRST_LOGIN) : [];
    if (d.state === 'ready') {
      const url = safeDemoUrl(d.url, hostPattern);
      if (!url || typeof d.username !== 'string' || typeof d.password !== 'string') {
        set({ phase: 'error', message: 'Demo jest gotowe, ale odpowiedź usługi jest niepełna. Uruchom je ponownie.' });
        return null;
      }
      // access without a deadline is not shown: the service names the moment, and the page must be able to end it
      const expiresAt = typeof d.expires_at === 'string' && d.expires_at ? Date.parse(d.expires_at) : NaN;
      if (!Number.isFinite(expiresAt) || expiresAt > now() + 25 * 3600 * 1000) {
        set({ phase: 'error', creds: null, message: 'Demo jest gotowe, ale usługa nie podała, kiedy się kończy. Uruchom je ponownie.' });
        return null;
      }
      if (expiresAt <= now()) { forget(); set({ phase: 'ended', creds: null, message: 'Czas tego demo minął. Możesz uruchomić nowe.' }); return null; }
      set({ phase: 'ready', progress: 100, message: '', creds: { url, username: d.username, password: d.password }, expiresAt, firstLogin });
      return Math.max(1000, Math.min(30000, expiresAt - now()));
    }
    if (d.state === 'ended') {
      forget();
      set({ phase: 'ended', creds: null, progress: 100, message: 'Czas demo minął. Możesz uruchomić nowe.' });
      return null;
    }
    set({ phase: 'starting', progress: Math.min(95, Math.max(state.progress, Number(d.progress) || 0)), firstLogin });
    return state.progress < 20 ? 1500 : 2500;
  }

  // resume is for a page that was opened or refreshed: if this tab has a demo, follow it.
  function resume() {
    const mem = load();
    if (mem.job) { set({ phase: 'starting', progress: 5, profile: mem.profile || 'plain' }); return true; }
    return false;
  }

  function reset() { forget(); set({ phase: api ? 'idle' : 'unavailable', progress: 0, creds: null, expiresAt: 0, message: '', firstLogin: [] }); }

  return { state, start, step, refreshStats, resume, reset, expireIfDue, remaining: () => (state.expiresAt ? state.expiresAt - now() : 0) };
}
