import { createDemo, PROFILES, FIRST_LOGIN, formatRemaining } from './demo-core.mjs';

const root = document.querySelector('#demo');
if (root) {
  const $ = sel => root.querySelector(sel);
  const api = (document.querySelector('meta[name="demo-api"]')?.content || '').replace(/\/+$/, '');
  const el = {
    form: $('#demo-form'), profiles: $('#demo-profiles'), start: $('#demo-start'), note: $('#demo-note'), status: $('#demo-status'),
    bar: $('#demo-bar'), barWrap: $('#demo-progress'), result: $('#demo-result'), resultTitle: $('#demo-result-title'), url: $('#demo-url'),
    user: $('#demo-user'), pass: $('#demo-pass'), toggle: $('#demo-toggle'), left: $('#demo-left'), steps: $('#demo-steps'),
    meter: $('#demo-meter'), cells: $('#demo-cells'), active: $('#demo-active'), total: $('#demo-total'), again: $('#demo-again'),
  };

  PROFILES.forEach((p, i) => {
    const label = document.createElement('label');
    label.className = 'demo-profile';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'profile'; input.value = p.id; input.checked = i === 0;
    const body = document.createElement('span');
    const t = document.createElement('strong'); t.textContent = p.label;
    const d = document.createElement('small'); d.textContent = p.text;
    body.append(t, d);
    label.append(input, body);
    el.profiles.append(label);
  });

  const demo = createDemo({ api, fetch: window.fetch.bind(window), storage: window.sessionStorage, randomBytes: b => crypto.getRandomValues(b), onChange: render });
  let following = false, revealed = false, tick = 0, rateTimer = 0;

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

  function renderMeter(s) {
    const st = s.stats;
    el.cells.replaceChildren();
    const max = st ? st.max : 10;
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
    const busy = s.phase === 'starting';
    el.start.disabled = busy || s.phase === 'unavailable' || s.phase === 'ready' || (s.phase === 'rate' && s.retryAt > Date.now());
    el.form.querySelectorAll('input[name="profile"]').forEach(i => { i.disabled = busy || s.phase === 'ready'; });
    el.barWrap.hidden = !busy;
    el.bar.style.width = `${s.progress}%`;
    el.barWrap.setAttribute('aria-valuenow', String(s.progress));
    el.result.hidden = s.phase !== 'ready';
    el.again.hidden = s.phase !== 'ended';
    switch (s.phase) {
      case 'unavailable': setStatus('Demo jest chwilowo niedostępne. Napisz do nas, a pokażemy aplikację na żywo.'); el.note.hidden = true; break;
      case 'idle': setStatus(''); break;
      case 'starting': setStatus(`Przygotowuję demo… ${s.progress}%. Zwykle trwa to około minuty.`); break;
      case 'ready': setStatus('Demo jest gotowe.'); break;
      case 'ended': setStatus(s.message || 'Czas demo minął.'); break;
      default: setStatus(s.message || 'Coś poszło nie tak. Spróbuj ponownie.');
    }
    el.start.textContent = s.phase === 'ready' ? 'Demo działa' : (s.phase === 'full' || s.phase === 'offline' || s.phase === 'error' ? 'Spróbuj ponownie' : 'Uruchom demo');
    if (s.phase === 'rate') armRate(s.retryAt);
    if (s.phase === 'ready' && s.creds) {
      el.url.textContent = s.creds.url.replace(/^https:\/\//, '').replace(/\/$/, '');
      el.url.href = s.creds.url;
      el.user.textContent = s.creds.username;
      el.pass.textContent = revealed ? s.creds.password : '•'.repeat(s.creds.password.length);
      el.pass.dataset.value = s.creds.password;
      el.steps.replaceChildren();
      s.firstLogin.forEach(k => { const li = document.createElement('li'); li.textContent = FIRST_LOGIN[k]; el.steps.append(li); });
      el.steps.hidden = s.firstLogin.length === 0;
      startCountdown();
      if (!el.result.dataset.shown) { el.result.dataset.shown = '1'; el.resultTitle.focus(); }
    } else { delete el.result.dataset.shown; revealed = false; el.toggle.setAttribute('aria-pressed', 'false'); el.toggle.textContent = 'Pokaż'; }
  }

  function armRate(at) {
    clearTimeout(rateTimer);
    rateTimer = setTimeout(() => { el.start.disabled = false; setStatus('Możesz spróbować ponownie.'); }, Math.max(0, at - Date.now()));
  }

  function startCountdown() {
    clearInterval(tick);
    const draw = () => { el.left.textContent = formatRemaining(demo.remaining()); };
    draw();
    tick = setInterval(() => { if (demo.state.phase !== 'ready') clearInterval(tick); else draw(); }, 1000);
  }

  el.form.addEventListener('submit', async event => {
    event.preventDefault();
    const choice = el.form.querySelector('input[name="profile"]:checked')?.value || 'plain';
    await demo.start(choice);
    if (demo.state.phase === 'starting') follow();
  });
  el.again.addEventListener('click', () => { demo.reset(); el.form.querySelector('input[name="profile"]').focus(); });

  el.toggle.addEventListener('click', () => {
    revealed = !revealed;
    el.toggle.setAttribute('aria-pressed', String(revealed));
    el.toggle.textContent = revealed ? 'Ukryj' : 'Pokaż';
    el.pass.textContent = revealed ? el.pass.dataset.value : '•'.repeat((el.pass.dataset.value || '').length);
  });
  root.querySelectorAll('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const source = btn.dataset.copy === 'pass' ? el.pass.dataset.value : el[btn.dataset.copy].textContent;
    const done = ok => { const old = btn.textContent; btn.textContent = ok ? 'Skopiowano' : 'Zaznacz i skopiuj ręcznie'; setTimeout(() => { btn.textContent = old; }, 2000); };
    try { await navigator.clipboard.writeText(source); done(true); } catch { done(false); }
  }));

  async function loopStats() {
    await demo.refreshStats();
    setTimeout(loopStats, document.hidden ? 60000 : 15000);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) demo.refreshStats(); });

  render(demo.state);
  if (api) {
    loopStats();
    if (demo.resume()) follow();
  }
}
