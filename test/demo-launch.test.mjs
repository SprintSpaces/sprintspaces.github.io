import test from 'node:test';
import assert from 'node:assert/strict';
import { launchView, LAUNCH_SECONDS, LAUNCH_TOLERANCE_SECONDS, LAUNCH_ESTIMATE } from '../demo-launch.mjs';

test('estimate uses the recorded real 34-second launch with a three-second tolerance', () => {
  assert.equal(LAUNCH_SECONDS, 34);
  assert.equal(LAUNCH_TOLERANCE_SECONDS, 3);
  assert.equal(LAUNCH_ESTIMATE, 'Około 34 s (±3 s)');
  assert.equal(launchView(14000).remaining, 20);
});

test('estimated fill advances between backend polls, never announcing readiness by the clock', () => {
  let previous = 0;
  for (let elapsed = 0; elapsed <= 180000; elapsed += 250) {
    const view = launchView(elapsed, 50);
    assert.ok(view.progress >= previous);
    assert.ok(view.progress < 100);
    assert.ok(view.remaining >= 0);
    previous = view.progress;
  }
  assert.ok(launchView(15000, 50).progress > launchView(14000, 50).progress);
  assert.ok(launchView(180000, 100).progress <= 96);
});

test('the tolerance boundary switches to an honest overrun state instead of a negative ETA', () => {
  assert.equal(launchView(37000).delayed, false);
  assert.equal(launchView(37250).delayed, true);
  assert.equal(launchView(37250).remaining, 0);
});

test('resource waiting has no countdown and invalid elapsed input stays bounded', () => {
  assert.deepEqual(launchView(100000, 80, true), { progress: 6, remaining: null, delayed: false, waiting: true });
  for (const elapsed of [-1000, NaN, undefined, Infinity]) {
    const view = launchView(elapsed);
    assert.ok(view.progress >= 0 && view.progress < 100);
    assert.ok(view.remaining >= 0);
  }
});
