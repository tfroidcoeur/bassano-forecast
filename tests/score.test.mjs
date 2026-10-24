import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelFor, foehnClass, scoreHour, isLee, isBreezeHour, capeBand } from '../lib/score.js';
import { LIMITS } from '../lib/config.js';

const calm = {
  launch: 10,
  aloft850: { speed: 20, dir: 200 },
  aloft700: { speed: 30, dir: 250 },
  north: 0,
  gust: 20,
  rh850: 70,
  precipMm: 0,
  cape: 0,
  cloudLow: 10,
  cloudMid: 20,
  dirSpread: 0,
  speedSpread: 0,
};

test('levelFor: edges stay in the better level', () => {
  assert.equal(levelFor(15, LIMITS.launch), 'good');
  assert.equal(levelFor(15.1, LIMITS.launch), 'marginal');
  assert.equal(levelFor(22, LIMITS.launch), 'marginal');
  assert.equal(levelFor(22.1, LIMITS.launch), 'no');
  assert.equal(levelFor(null, LIMITS.launch), null);
});

test('limits per level match the reference table', () => {
  assert.equal(levelFor(35, LIMITS.aloft850), 'marginal');
  assert.equal(levelFor(30, LIMITS.north), 'marginal');
  assert.equal(levelFor(35, LIMITS.gust), 'marginal');
  assert.equal(levelFor(35.5, LIMITS.gust), 'no');
});

test('foehn classes from the north magnitude', () => {
  assert.equal(foehnClass(-1.9), 'none');
  assert.equal(foehnClass(-2), 'weak');
  assert.equal(foehnClass(-2.9), 'weak');
  assert.equal(foehnClass(-3), 'moderate');
  assert.equal(foehnClass(-6), 'moderate');
  assert.equal(foehnClass(-6.1), 'strong');
  assert.equal(foehnClass(+8), 'none', 'south side is not north foehn');
  assert.equal(foehnClass(null), null);
});

test('calm hour is green', () => {
  assert.equal(scoreHour(calm, 'none'), 'green');
});

test('a limit breach gives red, and marginal limits give amber', () => {
  assert.equal(scoreHour({ ...calm, gust: 40 }, 'none'), 'red');
  assert.equal(scoreHour({ ...calm, launch: 18 }, 'none'), 'amber');
});

test('rain: median precipitation of at least 0.2 mm gives red', () => {
  assert.equal(scoreHour({ ...calm, precipMm: 0.2 }, 'none'), 'red');
  assert.equal(scoreHour({ ...calm, precipMm: 0.1 }, 'none'), 'green');
});

test('convective: CAPE above 800 with precipitation gives red, without it it does not', () => {
  assert.equal(scoreHour({ ...calm, cape: 1000, precipMm: 0.1 }, 'none'), 'red');
  assert.equal(scoreHour({ ...calm, cape: 800, precipMm: 0.1 }, 'none'), 'green');
  assert.equal(scoreHour({ ...calm, cape: 1000 }, 'none'), 'green');
});

test('foehn: only strong is red; moderate is amber with the lee signature and adds nothing without it', () => {
  assert.equal(scoreHour(calm, 'strong'), 'red');
  assert.equal(scoreHour(calm, 'moderate'), 'green');
  assert.equal(scoreHour({ ...calm, aloft850: { speed: 20, dir: 0 } }, 'moderate'), 'green', 'north flow at 850 hPa, moist');
  const lee = { ...calm, aloft850: { speed: 20, dir: 0 }, rh850: 35 };
  assert.equal(isLee(lee), true);
  assert.equal(scoreHour(lee, 'moderate'), 'amber');
  assert.equal(scoreHour(lee, 'strong'), 'red');
  assert.equal(scoreHour(calm, 'weak'), 'green');
});

test('lee: north flow at 850 hPa (>= 20 km/h, within 60 degrees of north) and rh850 below 40', () => {
  const north = (speed, dir) => ({ ...calm, aloft850: { speed, dir }, rh850: 35 });
  assert.equal(isLee(north(20, 0)), true);
  assert.equal(isLee(north(20, 300)), true, 'boundary: speed 20 and 60 degrees west of north');
  assert.equal(isLee(north(20, 60)), true, 'boundary: 60 degrees east of north');
  assert.equal(isLee(north(19.9, 0)), false, 'too weak');
  assert.equal(isLee(north(20, 61)), false, 'more than 60 degrees from north');
  assert.equal(isLee(north(20, 180)), false, 'southerly');
  assert.equal(isLee({ ...north(20, 0), rh850: 40 }), false, 'rh850 must be below 40');
  assert.equal(isLee({ ...north(20, 0), rh850: null }), false);
});

test('lee: a north flow at 700 hPa alone does not count, nor a north component without the direction test', () => {
  const h = { ...calm, aloft850: { speed: 20, dir: 180 }, aloft700: { speed: 25, dir: 10 }, rh850: 30 };
  assert.equal(isLee(h), false);
  assert.equal(scoreHour(h, 'moderate'), 'green', 'north at 3000 m with dry air: not scored');
  // 850 hPa is 20 km/h from 90 degrees: its north component is 0; 700 hPa is 20 km/h from 0: north component 20
  assert.equal(isLee({ ...calm, aloft850: { speed: 20, dir: 90 }, aloft700: { speed: 20, dir: 90 }, rh850: 30 }), false);
});

test('moderate foehn without north flow at 850 hPa adds nothing; the north component limit still applies', () => {
  const northBreeze = { ...calm, north: 20, aloft850: { speed: 20, dir: 200 }, rh850: 35 };
  assert.equal(scoreHour(northBreeze, 'moderate'), 'amber', 'amber from the north component limit (> 15), not from the foehn class');
  assert.equal(scoreHour({ ...northBreeze, north: 10 }, 'moderate'), 'green');
});

test('unknown wind gives null, a missing gust alone does not', () => {
  assert.equal(scoreHour({ ...calm, launch: null, aloft850: { speed: null, dir: null } }, 'none'), null);
  assert.equal(scoreHour({ ...calm, gust: null }, 'none'), 'green');
});

test('capeBand: one band per edge passed, edges stay in the lower band', () => {
  assert.equal(capeBand(null), null);
  assert.equal(capeBand(0), 0);
  assert.equal(capeBand(50), 0);
  assert.equal(capeBand(51), 1);
  assert.equal(capeBand(400), 2);
  assert.equal(capeBand(680), 3);
  assert.equal(capeBand(800), 3); // 800 = FOEHN.convectiveCape: orange starts above it
  assert.equal(capeBand(860), 4);
  assert.equal(capeBand(2000), 5);
});

test('3000 m is not scored: strong wind there leaves the hour green', () => {
  assert.equal(scoreHour({ ...calm, aloft700: { speed: 70, dir: 0 } }, 'none', 13), 'green');
});

test('model spread: speed spread above 8 km/h is amber; direction spread above 45 degrees from 10 km/h at launch', () => {
  assert.equal(scoreHour({ ...calm, speedSpread: 9 }, 'none', 13), 'amber');
  assert.equal(scoreHour({ ...calm, speedSpread: 8 }, 'none', 13), 'green');
  const cloudy = { ...calm, cloudLow: 80, dirSpread: 90 };
  assert.equal(scoreHour(cloudy, 'none', 13), 'amber');
  assert.equal(scoreHour({ ...cloudy, launch: 9 }, 'none', 13), 'green', 'calm: direction spread does not count');
});

test('breeze hour: weak wind and sun from 11:00 ignore the direction spread only', () => {
  const sunny = { ...calm, dirSpread: 90 };
  assert.equal(isBreezeHour(sunny, 'none', 13), true);
  assert.equal(scoreHour(sunny, 'none', 13), 'green');
  assert.equal(scoreHour(sunny, 'none', 10), 'amber', 'before 11:00');
  assert.equal(scoreHour(sunny, 'none'), 'amber', 'hour unknown');
  assert.equal(scoreHour({ ...sunny, speedSpread: 9 }, 'none', 13), 'amber', 'speed spread still counts');
  assert.equal(isBreezeHour(sunny, 'moderate', 13), true);
  assert.equal(isBreezeHour(sunny, 'strong', 13), false);
  assert.equal(isBreezeHour({ ...sunny, cloudMid: 60 }, 'none', 13), false);
  assert.equal(isBreezeHour({ ...sunny, cloudMid: null }, 'none', 13), false, 'missing cloud is not breeze');
  assert.equal(isBreezeHour({ ...sunny, launch: 13 }, 'none', 13), false);
  assert.equal(isBreezeHour({ ...sunny, aloft850: { speed: 21, dir: 200 } }, 'none', 13), false);
  assert.equal(isBreezeHour({ ...sunny, aloft850: { speed: 20, dir: 0 } }, 'none', 13), false, 'north flow at 850 hPa');
  assert.equal(isBreezeHour({ ...sunny, precipMm: 0.1 }, 'none', 13), false);
});
