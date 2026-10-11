import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWindow, hourStrip, linePath, niceMax, rangeBox, barPct, speedIn, ceilingHundreds, minMax } from '../lib/layout.js';
import { statusLine } from '../lib/status.js';

test('verdict window: hh:mm ranges with hyphen or en dash, junk gives null', () => {
  assert.deepEqual(parseWindow('11:00–15:00'), { from: 11, to: 15 });
  assert.deepEqual(parseWindow('9-12'), { from: 9, to: 12 });
  assert.deepEqual(parseWindow('10:30–12:15'), { from: 10.5, to: 12.25 });
  assert.equal(parseWindow('15:00–11:00'), null, 'end before start');
  assert.equal(parseWindow('afternoon'), null);
  assert.equal(parseWindow(null), null);
});

test('hour strip: an hour is in the window when it starts inside [from, to)', () => {
  const seg = hourStrip([9, 10, 11, 12, 13, 14, 15, 16, 17], ['green', 'amber', 'green', 'green', 'red', null, 'green', 'green', 'amber'], { from: 11, to: 15 });
  assert.deepEqual(
    seg.map((s) => s.inWindow),
    [false, false, true, true, true, true, false, false, false]
  );
  assert.equal(seg[1].score, 'amber');
  assert.equal(seg[5].score, null);
  assert.ok(hourStrip([9], ['red'], null)[0].inWindow === false, 'no window, nothing highlighted');
});

test('line path: one move per run, nulls lift the pen, values clamp to the axis', () => {
  const d = linePath([10, null, 30, 60], [9, 10, 11, 12], { w: 100, h: 50, pad: 0, yMax: 40 });
  assert.equal(d.match(/M/g).length, 2, 'a null splits the line into two runs');
  assert.ok(d.startsWith('M0.0 37.5'), 'first point at x=0, value 10 of 40 on a 50 px plot');
  assert.ok(d.includes('L100.0 0.0'), 'value above yMax is clamped to the top');
  assert.equal(linePath([], [], { w: 10, h: 10, pad: 0, yMax: 1 }), '');
});

test('axis maximum rounds up to the step', () => {
  assert.equal(niceMax([3, 17.2, null], 5), 20);
  assert.equal(niceMax([1], 5), 5, 'at least one step');
  assert.equal(niceMax([], 5), 5);
  assert.equal(niceMax([10], 5), 10, 'exact multiple stays');
});

test('range box: p10 to p90 with the median tick, on a 0–100 track, clamped', () => {
  assert.deepEqual(rangeBox({ p10: 10, p50: 20, p90: 40 }, 80), { lo: 12.5, hi: 50, mid: 25 });
  assert.deepEqual(rangeBox({ p10: 0, p50: 50, p90: 200 }, 100), { lo: 0, hi: 100, mid: 50 });
  assert.equal(rangeBox(null, 80), null);
  assert.equal(rangeBox({ p10: 1, p50: 2, p90: 3 }, 0), null, 'no scale');
});

test('bar width: proportional, clamped, null for unknown', () => {
  assert.equal(barPct(0.6, 1), 60);
  assert.equal(barPct(2, 1), 100);
  assert.equal(barPct(null, 1), null);
});

test('speed in the chosen unit', () => {
  assert.equal(speedIn(18.52, 'kmh'), 18.52);
  assert.ok(Math.abs(speedIn(18.52, 'kt') - 10) < 1e-9);
});

test('ceiling in hundreds of metres, and min/max of a list', () => {
  assert.equal(ceilingHundreds(1460), 15);
  assert.equal(ceilingHundreds(null), null);
  assert.deepEqual(minMax([4, null, -2, 9]), { min: -2, max: 9 });
  assert.equal(minMax([null]), null);
});

test('status line: verdict age and live time, with the failure states', () => {
  const now = Date.parse('2026-10-11T10:00:00Z');
  const ok = { state: 'ok', generatedAt: Date.parse('2026-10-11T07:20:00Z') };
  const live = { state: 'ok', at: Date.parse('2026-10-11T08:05:00Z') };
  assert.equal(statusLine(ok, live, now), 'Verdict written 09:20 (2 h ago) · live 10:05');
  assert.equal(statusLine({ state: 'missing' }, { state: 'loading' }, now), 'No Claude verdict yet · live loading…');
  assert.equal(statusLine({ state: 'error' }, { state: 'error' }, now), 'Verdict unavailable · live unavailable');
  assert.equal(
    statusLine({ state: 'error', generatedAt: ok.generatedAt }, live, now),
    'Verdict refresh failed, showing the one written 09:20 · live 10:05'
  );
  assert.equal(statusLine({ state: 'loading' }, { state: 'loading' }, now), 'Loading verdict… · live loading…');
});
