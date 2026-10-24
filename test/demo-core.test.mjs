import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemo, newKey, safeDemoUrl, formatRemaining, PROFILES } from '../demo-core.mjs';

const API = 'https://demo.example.test';
const KEY = /^[0-9a-f]{32}$/;

function memory() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), dump: () => [...m.values()].join('\n') };
}
function reply(status, data, headers = {}) {
  return { status, headers: { get: k => headers[k] ?? null }, json: async () => { if (data === undefined) throw new Error('no body'); return data; } };
}
// a service that answers from a script, and remembers what it was asked
function service(script) {
  const calls = [];
  const f = async (url, init = {}) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null, init });
    const next = script.shift();
    if (typeof next === 'function') return next(url, init);
    if (next === 'down') throw new TypeError('network');
    return next;
  };
  f.calls = calls;
  return f;
}
let counter = 0;
const random = b => { counter++; b.forEach((_, i) => { b[i] = (i * 17 + counter * 29) & 255; }); };
function make(script, extra = {}) {
  const storage = extra.storage || memory();
  const seen = [];
  const f = service(script);
  const demo = createDemo({ api: API, fetch: f, storage, randomBytes: random, now: extra.now || (() => Date.parse('2026-10-23T12:00:00Z')), onChange: s => seen.push(s), ...extra.options });
  return { demo, storage, f, seen };
}
const ready = (extra = {}) => reply(200, { state: 'ready', progress: 100, url: 'https://rzutki-pingwin.byst.re/', username: 'demo@demo-1.demo.invalid', password: 'p'.repeat(20), expires_at: '2026-10-23T12:15:00Z', profile: 'plain', first_login: [], ...extra });

test('without a service address the section says it is unavailable and asks nothing', async () => {
  const f = service([]);
  const demo = createDemo({ api: '', fetch: f, storage: memory(), randomBytes: random });
  assert.equal(demo.state.phase, 'unavailable');
  await demo.start('plain'); await demo.refreshStats();
  assert.equal(f.calls.length, 0);
});

test('a demo is requested with a random key and a profile, followed to ready, and the secrets never reach storage', async () => {
  const { demo, storage, f } = make([reply(202, { job: 'j'.repeat(64), state: 'starting' }), reply(200, { state: 'starting', progress: 25 }), ready({ profile: 'strict', first_login: ['change_password', 'enrol_2fa'] })]);
  await demo.start('strict');
  assert.equal(demo.state.phase, 'starting');
  assert.match(f.calls[0].body.key, KEY);
  assert.equal(f.calls[0].body.profile, 'strict');
  assert.equal(f.calls[0].init.credentials, 'omit');
  assert.equal(f.calls[0].init.referrerPolicy, 'no-referrer');
  let wait = await demo.step();
  assert.equal(demo.state.progress, 25);
  assert.ok(wait >= 1000 && wait <= 5000);
  wait = await demo.step();
  assert.equal(demo.state.phase, 'ready');
  assert.deepEqual(demo.state.creds, { url: 'https://rzutki-pingwin.byst.re/', username: 'demo@demo-1.demo.invalid', password: 'p'.repeat(20) });
  assert.deepEqual(demo.state.firstLogin, ['change_password', 'enrol_2fa']);
  assert.ok(wait >= 1000 && wait <= 30000);
  const kept = storage.dump();
  assert.ok(!kept.includes('ppppp') && !kept.includes('demo@') && !kept.includes('byst.re'), 'the credentials were stored: ' + kept);
  assert.ok(kept.includes('j'.repeat(64)));
});

test('an unknown profile is the plain one', async () => {
  const { demo, f } = make([reply(202, { job: 'j'.repeat(64) })]);
  await demo.start('root');
  assert.equal(f.calls[0].body.profile, 'plain');
  assert.deepEqual(PROFILES.map(p => p.id), ['plain', 'password', 'mfa', 'strict']);
});

test('a full pool is told as it is, the counter is refreshed, and no demo is remembered', async () => {
  const { demo, storage } = make([reply(503, { error: 'full', active: 10, max: 10 }), reply(200, { active: 10, max: 10, total_ready: 41, full: true })]);
  await demo.start('plain');
  assert.equal(demo.state.phase, 'full');
  assert.deepEqual(demo.state.stats, { active: 10, max: 10, total: 41, full: true });
  assert.ok(!JSON.parse(storage.getItem('sprintspaces-demo') || '{}').job);
});

test('a rate limit says when to try again', async () => {
  const { demo } = make([reply(429, { error: 'rate_limited' }, { 'Retry-After': '90' })]);
  await demo.start('plain');
  assert.equal(demo.state.phase, 'rate');
  assert.equal(demo.state.retryAt, Date.parse('2026-10-23T12:00:00Z') + 90000);
});

test('"you already have one" follows the demo this tab has, and explains itself when it has none', async () => {
  const a = make([reply(202, { job: 'a'.repeat(64) }), reply(409, { error: 'already_have_one' })]);
  await a.demo.start('plain'); await a.demo.start('plain');
  assert.equal(a.demo.state.phase, 'starting');
  const b = make([reply(409, { error: 'already_have_one' })]);
  await b.demo.start('plain');
  assert.equal(b.demo.state.phase, 'error');
  assert.match(b.demo.state.message, /działa już demo/);
});

test('offline: the same key is used when the visitor tries again, so a retry never makes a second demo', async () => {
  const { demo, f } = make(['down', reply(202, { job: 'j'.repeat(64) })]);
  await demo.start('plain');
  assert.equal(demo.state.phase, 'offline');
  await demo.start('plain');
  assert.equal(f.calls[0].body.key, f.calls[1].body.key);
  assert.equal(demo.state.phase, 'starting');
});

test('a request that never answers ends as offline instead of hanging', async () => {
  const hang = (_u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
  const { demo } = make([hang], { options: { timeoutMs: 30 } });
  await demo.start('plain');
  assert.equal(demo.state.phase, 'offline');
});

test('a refreshed page follows the demo of its tab and gets the credentials again from the service', async () => {
  const storage = memory();
  const first = make([reply(202, { job: 'j'.repeat(64) })], { storage });
  await first.demo.start('plain');
  const second = make([ready()], { storage });
  assert.equal(second.demo.resume(), true);
  await second.demo.step();
  assert.equal(second.demo.state.phase, 'ready');
  assert.match(second.f.calls[0].url, /\/v1\/demos\/j{64}$/);
  assert.equal(make([], { storage: memory() }).demo.resume(), false);
});

test('a demo the service no longer knows ends cleanly and the next request gets a new key', async () => {
  const storage = memory();
  const a = make([reply(202, { job: 'j'.repeat(64) }), reply(404, { error: 'not_found' })], { storage });
  await a.demo.start('plain');
  const key1 = a.f.calls[0].body.key;
  assert.equal(await a.demo.step(), null);
  assert.equal(a.demo.state.phase, 'ended');
  assert.equal(storage.getItem('sprintspaces-demo'), null);
  const b = make([reply(202, { job: 'k'.repeat(64) })], { storage });
  await b.demo.start('plain');
  assert.notEqual(b.f.calls[0].body.key, key1);
});

test('the time running out ends the demo, whether the service says so or the clock does', async () => {
  const a = make([reply(202, { job: 'j'.repeat(64) }), reply(200, { state: 'ended', progress: 100 })]);
  await a.demo.start('plain');
  assert.equal(await a.demo.step(), null);
  assert.equal(a.demo.state.phase, 'ended');
  assert.equal(a.demo.state.creds, null);
  const b = make([reply(202, { job: 'j'.repeat(64) }), ready({ expires_at: '2026-10-23T11:59:59Z' })]);
  await b.demo.start('plain');
  await b.demo.step();
  assert.equal(b.demo.state.phase, 'ended');
  assert.equal(b.demo.state.creds, null);
});

test('an address that is not one of the free demo names is never shown', async () => {
  for (const bad of ['http://x.byst.re/', 'https://evil.example/', 'https://x.byst.re.evil.example/', 'https://u:p@x.byst.re/', 'https://x.byst.re:8443/', 'javascript:alert(1)', '', 'https://byst.re/']) {
    const { demo } = make([reply(202, { job: 'j'.repeat(64) }), ready({ url: bad })]);
    await demo.start('plain'); await demo.step();
    assert.equal(demo.state.phase, 'error', bad);
    assert.equal(demo.state.creds, null, bad);
  }
  assert.equal(safeDemoUrl('https://x.byst.re/path?q=1'), 'https://x.byst.re/');
  assert.equal(safeDemoUrl('https://a.b.toadres.pl'), 'https://a.b.toadres.pl/');
});

test('the counter accepts only numbers', async () => {
  const { demo } = make([reply(200, { active: '3; drop', max: 10 }), reply(200, { active: 3, max: 10, total_ready: 7, full: false })]);
  await demo.refreshStats();
  assert.equal(demo.state.stats, null);
  await demo.refreshStats();
  assert.deepEqual(demo.state.stats, { active: 3, max: 10, total: 7, full: false });
});

test('helpers: random keys, the countdown', () => {
  assert.match(newKey(random), KEY);
  const real = newKey(b => globalThis.crypto.getRandomValues(b));
  assert.match(real, KEY);
  assert.equal(formatRemaining(0), '0:00');
  assert.equal(formatRemaining(61000), '1:01');
  assert.equal(formatRemaining(3 * 3600000 + 5 * 60000 + 7000), '3:05:07');
});

test('the known end of access ends the view whatever the network does, and clears the access from the state', async () => {
  for (const next of ['down', reply(500, {}), reply(503, undefined), (_u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('hang'))))]) {
    let t = Date.parse('2026-10-23T12:00:00Z');
    const { demo } = make([reply(202, { job: 'j'.repeat(64) }), ready({ expires_at: '2026-10-23T12:00:30Z' }), next], { now: () => t, options: { timeoutMs: 30 } });
    await demo.start('plain'); await demo.step();
    assert.equal(demo.state.phase, 'ready');
    t = Date.parse('2026-10-23T12:00:31Z');
    assert.equal(await demo.step(), null);
    assert.equal(demo.state.phase, 'ended');
    assert.equal(demo.state.creds, null);
  }
  // a tab that wakes up after its demo ended: the clock alone decides
  let t = Date.parse('2026-10-23T12:00:00Z');
  const { demo, storage } = make([reply(202, { job: 'j'.repeat(64) }), ready({ expires_at: '2026-10-23T12:00:30Z' })], { now: () => t });
  await demo.start('plain'); await demo.step();
  t += 3600 * 1000;
  assert.equal(demo.expireIfDue(), true);
  assert.equal(demo.state.creds, null);
  assert.equal(storage.getItem('sprintspaces-demo'), null);
});

test('a ready answer needs a believable end: absent, empty, malformed, past or days away is refused', async () => {
  for (const expires_at of [undefined, '', 'not-a-date', null, 12345, '2026-10-22T00:00:00Z', '2026-12-01T00:00:00Z']) {
    const { demo } = make([reply(202, { job: 'j'.repeat(64) }), ready({ expires_at })]);
    await demo.start('plain'); await demo.step();
    assert.notEqual(demo.state.phase, 'ready', String(expires_at));
    assert.equal(demo.state.creds, null, String(expires_at));
  }
});

test('the graphical counter rejects impossible capacity and progress stays finite', async () => {
 for (const stats of [
  {active:-1,max:10,total_ready:1}, {active:2,max:1,total_ready:2},
  {active:0,max:1000000,total_ready:0}, {active:0,max:10,total_ready:-1},
 ]) {
  const {demo}=make([reply(200,stats)]);await demo.refreshStats();assert.equal(demo.state.stats,null);
 }
 const {demo}=make([reply(202,{job:'j'.repeat(64)}),reply(200,{state:'starting',progress:'broken'})]);
 await demo.start('plain');await demo.step();assert.ok(Number.isFinite(demo.state.progress));
});

test('an offline retry preserves the original profile as well as its idempotency key', async () => {
 const {demo,f}=make(['down',reply(202,{job:'j'.repeat(64)})]);
 await demo.start('strict');await demo.start('plain');
 assert.equal(f.calls[1].body.profile,'strict');
 assert.equal(demo.state.profile,'strict');
 assert.equal(f.calls[0].body.key,f.calls[1].body.key);
});


test('a legacy four-hour backend cannot reveal access behind the fifteen-minute offer', async () => {
  const { demo } = make([reply(202, { job: 'j'.repeat(64) }), ready({ expires_at: '2026-10-23T16:00:00Z' })]);
  await demo.start('plain');
  await demo.step();
  assert.equal(demo.state.phase, 'error');
  assert.equal(demo.state.creds, null);
});
