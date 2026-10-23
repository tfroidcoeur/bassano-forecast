import { test } from 'node:test';
import assert from 'node:assert/strict';
import { romeWallFromUtc, romeHourly, wallFor } from '../lib/time.js';
import { foehnSeries, dayIndices, dayFoehnDp, dayExtremes } from '../lib/foehn.js';
import { foehnClass } from '../lib/score.js';

// Open-Meteo with timezone=GMT: times are UTC. Rome is CEST (+2) until 25 Oct 01:00 UTC, then CET (+1).
// Fixture: every UTC hour from 24 Oct 06:00 to 25 Oct 18:00; the value is the UTC hour index (0 = 24 Oct 06:00).
const utcHours = [];
for (let ms = Date.UTC(2026, 9, 24, 6); ms <= Date.UTC(2026, 9, 25, 18); ms += 3600000) {
  utcHours.push(new Date(ms).toISOString().slice(0, 16));
}
const utcValue = (utc) => utcHours.indexOf(utc);
const fixture = (values) => ({ hourly: { time: [...utcHours], wind_speed_10m_icon_seamless: utcHours.map((_, i) => values(i)) } });

test('UTC to Italian local time: the clock change is applied per hour, not per response', () => {
  assert.equal(romeWallFromUtc('2026-10-24T07:00'), '2026-10-24T09:00', 'CEST, +2');
  assert.equal(romeWallFromUtc('2026-10-25T08:00'), '2026-10-25T09:00', 'CET, +1, after the change');
  assert.equal(romeWallFromUtc('2026-10-25T07:00'), '2026-10-25T08:00');
  assert.equal(romeWallFromUtc('2026-03-29T01:00'), '2026-03-29T03:00', 'spring change');
  assert.throws(() => romeWallFromUtc('not-a-time'));
});

test('romeHourly keeps every array aligned and converts only the time labels', () => {
  const h = romeHourly({ time: ['2026-10-24T07:00', '2026-10-25T08:00'], wind_speed_10m_x: [1, 2] });
  assert.deepEqual(h.time, ['2026-10-24T09:00', '2026-10-25T09:00']);
  assert.deepEqual(h.wind_speed_10m_x, [1, 2]);
});

test('09 local on both sides of the change maps to the right UTC hour', () => {
  const local = romeHourly(fixture((i) => i).hourly);
  const index = new Map(local.time.map((t, i) => [t, i]));
  const at = (wall) => local.wind_speed_10m_icon_seamless[index.get(wall)];
  assert.equal(at(wallFor('2026-10-24', 9)), utcValue('2026-10-24T07:00'));
  assert.equal(at(wallFor('2026-10-25', 9)), utcValue('2026-10-25T08:00'));
  assert.equal(at(wallFor('2026-10-25', 17)), utcValue('2026-10-25T16:00'));
});

test('the 09-17 window of 25 Oct is nine local hours, i.e. UTC 08:00 to 16:00', () => {
  const s = romeHourly(fixture(() => 0).hourly);
  const idx = dayIndices(s.time, '2026-10-25');
  assert.equal(idx.length, 9);
  assert.equal(s.time[idx[0]], '2026-10-25T09:00');
  assert.equal(s.time[idx[8]], '2026-10-25T17:00');
});

test('day foehn across the change: the window is read from the converted labels', () => {
  // Bozen minus Innsbruck: -4 hPa at UTC 07:00 on 24 Oct (09 local), -2 hPa at UTC 08:00 on 25 Oct (09 local).
  const bzVals = utcHours.map((utc) => (utc === '2026-10-24T07:00' ? 1016 : utc === '2026-10-25T08:00' ? 1018 : 1020));
  const ibVals = utcHours.map(() => 1020);
  const bz = { hourly: romeHourly({ time: utcHours, pressure_msl_ecmwf_ifs025: bzVals, pressure_msl_icon_seamless: bzVals }) };
  const ib = { hourly: romeHourly({ time: utcHours, pressure_msl_ecmwf_ifs025: ibVals, pressure_msl_icon_seamless: ibVals }) };
  const flat = { hourly: romeHourly({ time: utcHours, pressure_msl_ecmwf_ifs025: utcHours.map(() => 1000) }) };
  const s = foehnSeries([bz, ib, flat, flat]);
  // The 09-local dip lands on the right day on both sides of the change (the class uses the mean, see foehn tests).
  assert.equal(dayExtremes(s, '2026-10-24').biEcmwfMin, -4);
  assert.equal(dayExtremes(s, '2026-10-25').biEcmwfMin, -2);
  assert.ok(dayFoehnDp(s, '2026-10-24') < 0 && dayFoehnDp(s, '2026-10-24') > -4, 'the mean, not the dip');
});
