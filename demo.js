import { createDemo, FIRST_LOGIN, formatRemaining } from './demo-core.mjs?v=20261025-domains1';
import { launchView, LAUNCH_ESTIMATE } from './demo-launch.mjs?v=20261025-domains1';

const root = document.querySelector('#demo');
if (root) {
  const $ = sel => root.querySelector(sel);
  const api = (document.querySelector('meta[name="demo-api"]')?.content || '').replace(/\/+$/, '');
  const el = {
    form: $('#demo-form'), start: $('#demo-start'), note: $('#demo-note'), status: $('#demo-status'),
    bar: $('#demo-bar'), barWrap: $('#demo-progress'), loading: $('#demo-loading'), estimate: $('#demo-estimate'),
    stage: $('#demo-stage'), eta: $('#demo-eta'), loadingNote: $('#demo-loading-note'),
    result: $('#demo-result'), resultTitle: $('#demo-result-title'), url: $('#demo-url'),
    user: $('#demo-user'), pass: $('#demo-pass'), toggle: $('#demo-toggle'), left: $('#demo-left'), steps: $('#demo-steps'),
    until: $('#demo-until'), meter: $('#demo-meter'), cells: $('#demo-cells'), active: $('#demo-active'), total: $('#demo-total'), again: $('#demo-again'),
    feedback: $('#demo-copy-feedback'), dialog: $('#demo-ready-dialog'), close: $('#demo-ready-close'), continue: $('#demo-ready-continue'),
  };
  const copies = [...root.querySelectorAll('[data-copy]')];
  const copyLabels = { url: 'adres dema', user: 'login', pass: 'hasło' };
  const copyTimers = new Map();
  const demo = createDemo({ api, fetch: window.fetch.bind(window), storage: window.sessionStorage, randomBytes: b => crypto.getRandomValues(b), onChange: render });
  let following = false, revealed = false, tick = 0, rateTimer = 0;
  let launchTimer = 0, launchedAt = null, displayedProgress = 0, celebrateOnReady = false, waitingForResources = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function follow() {
    if (following) return;
    following = true;
    try {
      for (;;) {
        const wait = await demo.step();
        if (wait == null) break;
        await sleep(document.hidden ? Math.max(wait, 10000) : wait);
      }
    } finally { following = false; }
  }

  function setStatus(text) { if (el.status.textContent !== text) el.status.textContent = text; }
  function setPasswordVisibility(show) {
    revealed = show;
    el.pass.type = show ? 'text' : 'password';
    el.toggle.setAttribute('aria-pressed', String(show));
    el.toggle.setAttribute('aria-label', show ? 'Ukryj hasło' : 'Pokaż hasło');
    el.toggle.title = show ? 'Ukryj hasło' : 'Pokaż hasło';
  }

  function drawLaunch() {
    if (demo.state.phase !== 'starting') return;
    const waiting = demo.state.stage === 'waiting';
    if (waitingForResources && !waiting) launchedAt = performance.now();
    waitingForResources = waiting;
    const view = launchView(performance.now() - launchedAt, demo.state.progress, waiting);
    displayedProgress = Math.max(displayedProgress, view.progress);
    el.bar.style.width = `${displayedProgress.toFixed(1)}%`;
    el.barWrap.setAttribute('aria-valuenow', String(Math.round(displayedProgress)));
    el.barWrap.setAttribute('aria-valuetext', view.waiting ? 'Oczekiwanie na zasoby serwera' : view.delayed ? 'Końcowa weryfikacja uruchomienia' : `Szacowany postęp ${Math.round(displayedProgress)}%. Pozostało około ${view.remaining} sekund.`);
    el.stage.textContent = view.waiting ? 'Czekamy na wolne zasoby' : view.delayed ? 'Jeszcze chwila…' : 'Przygotowujemy Twoją przestrzeń';
    el.eta.textContent = view.waiting ? 'W kolejce' : view.delayed ? 'Weryfikujemy' : view.remaining > 0 ? `Jeszcze około ${view.remaining} s` : 'Za chwilę';
    el.loadingNote.textContent = view.waiting ? `Gdy zwolnią się zasoby, przygotowanie zajmuje zwykle ${LAUNCH_ESTIMATE.toLowerCase()}.` : view.delayed ? 'Uruchomienie trwa dłużej niż zwykle. Czekamy na potwierdzenie aplikacji i adresu HTTPS.' : 'Uruchamiamy aplikację z przykładowymi danymi i sprawdzamy adres HTTPS.';
  }

  function renderMeter(s) {
    const st = s.stats;
    el.cells.replaceChildren();
    const max = st ? st.max : 3;
    for (let i = 0; i < max; i++) {
      const c = document.createElement('span');
      c.className = 'demo-cell' + (st && i < st.active ? ' on' : '');
      c.setAttribute('aria-hidden', 'true');
      el.cells.append(c);
    }
    el.active.textContent = st ? `${st.active} / ${st.max}` : '— / —';
    el.total.textContent = st ? String(st.total) : '—';
    el.meter.setAttribute('aria-label', st ? `Aktywne demo: ${st.active} z ${st.max}. Uruchomiono łącznie: ${st.total}.` : 'Licznik demo jest chwilowo niedostępny.');
  }

  function render(s) {
    renderMeter(s);
    const busy = s.phase === 'starting' || s.phase === 'checking';
    el.start.disabled = busy || s.phase === 'unavailable' || s.phase === 'ready' || (s.phase === 'rate' && s.retryAt > Date.now());
    el.loading.hidden = s.phase !== 'starting';
    el.estimate.hidden = s.phase === 'ready' || s.phase === 'unavailable';
    el.estimate.textContent = `${LAUNCH_ESTIMATE} na przygotowanie Twojej instancji.`;
    if (s.phase === 'starting') {
      if (launchedAt === null) launchedAt = performance.now();
      if (!launchTimer) launchTimer = setInterval(drawLaunch, 250);
      drawLaunch();
    } else {
      clearInterval(launchTimer); launchTimer = 0;
      if (s.phase === 'ready') {
        el.bar.style.width = '100%'; el.barWrap.setAttribute('aria-valuenow', '100');
      }
    }
    el.result.hidden = s.phase !== 'ready';
    el.again.hidden = s.phase !== 'ended';
    switch (s.phase) {
      case 'unavailable': setStatus('Demo jest chwilowo niedostępne. Napisz do nas, a pokażemy aplikację na żywo.'); el.note.hidden = true; break;
      case 'idle': setStatus(''); break;
      case 'starting': setStatus('Przygotowujemy Twoje demo.'); break;
      case 'ready': setStatus('Demo jest gotowe.'); break;
      case 'checking': setStatus('Sprawdzam, czy Twoja instancja jest nadal aktywna…'); break;
      case 'ended': setStatus(s.message || 'Czas demo minął.'); break;
      default: setStatus(s.message || 'Coś poszło nie tak. Spróbuj ponownie.');
    }
    el.start.textContent = s.phase === 'ready' ? 'Demo działa' : (s.phase === 'full' || s.phase === 'offline' || s.phase === 'error' ? 'Spróbuj ponownie' : 'Uruchom darmowe demo');
    if (s.phase === 'rate') armRate(s.retryAt);
    if (s.phase === 'ready' && s.creds) {
      el.url.textContent = s.creds.url.replace(/^https:\/\//, '').replace(/\/$/, '');
      el.url.href = s.creds.url;
      if (el.user.value !== s.creds.username) el.user.value = s.creds.username;
      if (el.pass.value !== s.creds.password) el.pass.value = s.creds.password;
      copies.forEach(button => { button.disabled = false; }); el.toggle.disabled = false;
      el.steps.replaceChildren();
      s.firstLogin.forEach(k => { const li = document.createElement('li'); li.textContent = FIRST_LOGIN[k]; el.steps.append(li); });
      el.steps.hidden = s.firstLogin.length === 0;
      el.until.textContent = new Date(s.expiresAt).toLocaleString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
      startCountdown();
      if (celebrateOnReady) {
        celebrateOnReady = false;
        el.dialog.showModal();
        el.continue.focus();
      }
    } else {
      // Access is removed, rather than retained in hidden elements or the dialog.
      setPasswordVisibility(false);
      if (el.dialog.open) el.dialog.close();
      el.url.textContent = ''; el.url.removeAttribute('href'); el.user.value = ''; el.pass.value = '';
      el.left.textContent = '—'; el.until.textContent = '—'; el.steps.replaceChildren(); el.feedback.textContent = '';
      copies.forEach(button => {
        button.disabled = true; button.classList.remove('is-copied');
        button.setAttribute('aria-label', `Kopiuj ${copyLabels[button.dataset.copy]}`);
        clearTimeout(copyTimers.get(button));
      });
      el.toggle.disabled = true;
    }
  }

  function armRate(at) {
    clearTimeout(rateTimer);
    const draw = () => {
      const seconds = Math.max(0, Math.ceil((at - Date.now()) / 1000));
      el.start.disabled = seconds > 0;
      setStatus(seconds > 0 ? `Za dużo prób. Możesz spróbować ponownie za ${formatRemaining(seconds * 1000)}.` : 'Możesz spróbować ponownie.');
      if (seconds > 0) rateTimer = setTimeout(draw, 1000);
    };
    draw();
  }

  function startCountdown() {
    clearInterval(tick);
    const draw = () => { if (!demo.expireIfDue()) el.left.textContent = formatRemaining(demo.remaining()); };
    draw();
    tick = setInterval(() => { if (demo.state.phase !== 'ready') clearInterval(tick); else draw(); }, 1000);
  }

  el.form.addEventListener('submit', async event => {
    event.preventDefault();
    if (demo.state.phase === 'starting' || demo.state.phase === 'checking' || demo.state.phase === 'ready') return;
    launchedAt = performance.now(); displayedProgress = 0; waitingForResources = false; celebrateOnReady = true;
    await demo.start('plain');
    if (demo.state.phase === 'starting') follow();
  });
  el.again.addEventListener('click', () => { launchedAt = null; displayedProgress = 0; waitingForResources = false; celebrateOnReady = false; demo.reset(); el.start.focus(); });

  el.toggle.addEventListener('click', () => {
    demo.expireIfDue();
    if (demo.state.phase === 'ready') setPasswordVisibility(!revealed);
  });
  copies.forEach(button => button.addEventListener('click', async () => {
    demo.expireIfDue();
    if (demo.state.phase !== 'ready' || !demo.state.creds) return;
    const kind = button.dataset.copy;
    const source = kind === 'pass' ? demo.state.creds.password : kind === 'user' ? demo.state.creds.username : demo.state.creds.url;
    try {
      await navigator.clipboard.writeText(source);
      if (demo.state.phase !== 'ready') return;
      button.classList.add('is-copied'); button.setAttribute('aria-label', `Skopiowano ${copyLabels[kind]}`);
      el.feedback.textContent = `Skopiowano ${copyLabels[kind]}.`;
      clearTimeout(copyTimers.get(button));
      copyTimers.set(button, setTimeout(() => { button.classList.remove('is-copied'); button.setAttribute('aria-label', `Kopiuj ${copyLabels[kind]}`); }, 2000));
    } catch {
      el.feedback.textContent = 'Nie udało się skopiować. Zaznacz dane i skopiuj je ręcznie.';
    }
  }));

  el.close.addEventListener('click', () => el.dialog.close());
  el.continue.addEventListener('click', () => el.dialog.close());
  el.dialog.addEventListener('close', () => {
    if (demo.state.phase === 'ready') {
      el.result.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      el.user.focus({ preventScroll: true });
    }
  });
  el.dialog.addEventListener('click', event => {
    if (event.target !== el.dialog) return;
    const box = el.dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) el.dialog.close();
  });

  async function loopStats() {
    await demo.refreshStats();
    setTimeout(loopStats, document.hidden ? 60000 : 15000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { demo.expireIfDue(); demo.refreshStats(); } });

  render(demo.state);
  if (api) {
    loopStats();
    if (demo.resume()) follow();
  }
}
