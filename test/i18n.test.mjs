import test from 'node:test';
import assert from 'node:assert/strict';
import { createTranslator } from '../i18n.mjs';
import english from '../locales/runtime-en.mjs';
import { createDemo } from '../demo-core.mjs';

test('runtime translations preserve every interpolation parameter', () => {
  const parameters = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
  for (const [source, translated] of Object.entries(english)) {
    assert.ok(translated.trim(), source);
    assert.deepEqual(parameters(translated), parameters(source), source);
  }
  const key = 'Aktywne demo: {active} z {max}. Uruchomiono łącznie: {total}.';
  assert.equal(createTranslator('en-GB')(key, { active: 1, max: 3, total: 42 }), 'Active demos: 1 of 3. Launched in total: 42.');
  assert.equal(createTranslator('pl')(key, { active: 1, max: 3, total: 42 }), 'Aktywne demo: 1 z 3. Uruchomiono łącznie: 42.');
});

test('demo errors are localized before they reach the view, with Polish still the default', async () => {
  for (const [status, data, expected] of [
    [503, { error: 'full' }, /All demo slots/],
    [429, {}, /Too many attempts/],
    [409, {}, /A demo is already running/],
    [400, {}, /request could not be accepted/],
    [500, {}, /temporarily having trouble/],
    [202, {}, /unexpected response/],
    [0, null, /Cannot connect/],
  ]) {
    for (const locale of ['en', undefined]) {
      const values = new Map();
      const demo = createDemo({ locale, api: 'https://fixture.invalid', randomBytes: b => b.fill(1),
        storage: { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) },
        fetch: async () => ({ status, headers: { get: () => null }, json: async () => data }),
      });
      await demo.start('plain');
      if (locale === 'en') assert.match(demo.state.message, expected);
      else assert.doesNotMatch(demo.state.message, expected);
      assert.equal(demo.state.creds, null);
    }
  }
});
