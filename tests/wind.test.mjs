import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windBand, formatSpeed, northComponent, median, circularMean, kmhToKt } from '../lib/wind.js';

test('wind bands follow the club edges (kt)', () => {
  const kt = (k) => k * 1.852;
  assert.equal(windBand('wind', kt(3.9)), 0);
  assert.equal(windBand('wind', kt(4.1)), 1);
  assert.equal(windBand('wind', kt(13.9)), 4);
  assert.equal(windBand('wind', kt(14.1)), 5);
  assert.equal(windBand('gust', kt(16.5)), 5);
  assert.equal(windBand('aloft', 0), 0);
});

test('unit switch does not change the band (bands are in knots)', () => {
  const kmh = 10 * 1.852;
  assert.equal(formatSpeed(kmh, 'kt'), 10);
  assert.equal(formatSpeed(kmh, 'kmh'), 19);
  assert.equal(formatSpeed(null, 'kmh'), null);
});

test('kmh to kt', () => {
  assert.ok(Math.abs(kmhToKt(18.52) - 10) < 1e-9);
});

test('northerly component: positive for wind from the north', () => {
  assert.ok(Math.abs(northComponent(20, 0) - 20) < 1e-9);
  assert.ok(Math.abs(northComponent(20, 180) + 20) < 1e-9);
  assert.ok(Math.abs(northComponent(20, 90)) < 1e-9);
  assert.equal(northComponent(null, 0), null);
});

test('median ignores nulls and averages the middle pair', () => {
  assert.equal(median([3, null, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(median([null]), null);
});

test('circular mean wraps around north', () => {
  const m = circularMean([350, 10]);
  assert.ok(Math.abs(m - 0) < 1e-6 || Math.abs(m - 360) < 1e-6);
  assert.ok(Math.abs(circularMean([90, 90]) - 90) < 1e-9);
  assert.equal(circularMean([null]), null);
});
