/**
 * Polls `probe` every `intervalMs` until it returns a truthy value (passed to onFound), or until
 * `maxChecks` checks have run (onGiveUp). stop() bumps a generation counter, so a probe that is
 * still in flight when polling stops (or restarts) is ignored. A probe that throws counts as "not yet".
 * `timers` is injectable for tests.
 */
export function createPoller({ intervalMs, maxChecks, probe, onProgress, onFound, onGiveUp, timers = globalThis }) {
  let generation = 0;
  let timer = null;

  function stop() {
    generation++;
    if (timer !== null) timers.clearInterval(timer);
    timer = null;
  }

  function start() {
    stop();
    const mine = generation;
    let checks = 0;
    onProgress(0);
    timer = timers.setInterval(async () => {
      checks++;
      let found = null;
      try {
        found = await probe();
      } catch {
        found = null;
      }
      if (mine !== generation) return;
      if (found) {
        stop();
        onFound(found);
      } else if (checks >= maxChecks) {
        stop();
        onGiveUp();
      } else {
        onProgress(checks);
      }
    }, intervalMs);
  }

  return { start, stop };
}
