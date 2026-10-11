import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPoller } from '../lib/poll.js';

// Fake timers: the test fires ticks by hand.
function fakeTimers() {
  const ticks = [];
  const cleared = [];
  return {
    ticks,
    cleared,
    timers: {
      setInterval(fn) {
        ticks.push(fn);
        return ticks.length;
      },
      clearInterval(id) {
        cleared.push(id);
      },
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('a probe that finds the new verdict stops polling and reports it once', async () => {
  const fake = fakeTimers();
  const found = [];
  const probes = [null, { generatedAt: 5 }];
  const poller = createPoller({
    intervalMs: 1,
    maxChecks: 5,
    probe: async () => probes.shift() ?? null,
    onProgress: () => {},
    onFound: (d) => found.push(d),
    onGiveUp: () => assert.fail('should not give up'),
    timers: fake.timers,
  });
  poller.start();
  await fake.ticks[0]();
  await fake.ticks[0]();
  assert.deepEqual(found, [{ generatedAt: 5 }]);
  assert.equal(fake.cleared.length, 1, 'interval cleared');
});

test('gives up after maxChecks with no new verdict', async () => {
  const fake = fakeTimers();
  const progress = [];
  let gaveUp = 0;
  const poller = createPoller({
    intervalMs: 1,
    maxChecks: 3,
    probe: async () => null,
    onProgress: (n) => progress.push(n),
    onFound: () => assert.fail('nothing new'),
    onGiveUp: () => gaveUp++,
    timers: fake.timers,
  });
  poller.start();
  for (let i = 0; i < 3; i++) await fake.ticks[0]();
  assert.deepEqual(progress, [0, 1, 2]);
  assert.equal(gaveUp, 1);
});

test('a probe still in flight when polling is stopped is ignored', async () => {
  const fake = fakeTimers();
  const pending = deferred();
  let found = 0;
  let gaveUp = 0;
  const poller = createPoller({
    intervalMs: 1,
    maxChecks: 1,
    probe: () => pending.promise,
    onProgress: () => {},
    onFound: () => found++,
    onGiveUp: () => gaveUp++,
    timers: fake.timers,
  });
  poller.start();
  const tick = fake.ticks[0]();
  poller.stop();
  pending.resolve({ generatedAt: 9 });
  await tick;
  assert.equal(found, 0, 'late result must not replace the verdict');
  assert.equal(gaveUp, 0, 'and must not report a give-up');
});

test('a probe from before a restart does not affect the new poll', async () => {
  const fake = fakeTimers();
  const old = deferred();
  const found = [];
  let calls = 0;
  const poller = createPoller({
    intervalMs: 1,
    maxChecks: 5,
    probe: () => (++calls === 1 ? old.promise : Promise.resolve(null)),
    onProgress: () => {},
    onFound: (d) => found.push(d),
    onGiveUp: () => {},
    timers: fake.timers,
  });
  poller.start();
  const oldTick = fake.ticks[0]();
  poller.start(); // restart while the first probe is in flight
  old.resolve({ generatedAt: 1 }); // stale result from the first poll
  await oldTick;
  assert.deepEqual(found, [], 'stale result ignored');
  await fake.ticks[1]();
  assert.deepEqual(found, [], 'the new poll is still waiting');
});

test('a probe that throws counts as not yet and polling continues', async () => {
  const fake = fakeTimers();
  const found = [];
  let n = 0;
  const poller = createPoller({
    intervalMs: 1,
    maxChecks: 5,
    probe: async () => {
      if (n++ === 0) throw new Error('offline');
      return { generatedAt: 2 };
    },
    onProgress: () => {},
    onFound: (d) => found.push(d),
    onGiveUp: () => assert.fail('no give-up'),
    timers: fake.timers,
  });
  poller.start();
  await fake.ticks[0]();
  assert.deepEqual(found, []);
  await fake.ticks[0]();
  assert.deepEqual(found, [{ generatedAt: 2 }]);
});

test('start reports progress 0 at once', () => {
  const fake = fakeTimers();
  const progress = [];
  createPoller({
    intervalMs: 1,
    maxChecks: 2,
    probe: async () => null,
    onProgress: (n) => progress.push(n),
    onFound: () => {},
    onGiveUp: () => {},
    timers: fake.timers,
  }).start();
  assert.deepEqual(progress, [0]);
});
