import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compass, ensembleMembers, dayHourIndices, rainChance, northFlowProbability, spread, dayRow, ensembleFoehnDaily, longRangeRows } from '../lib/longrange.js';
import { romeHourly } from '../lib/time.js';
import { LONG_RANGE_VARS, longRangeUrl } from '../lib/urls.js';

// GMT fixture: UTC 24 Oct 22:00 to 25 Oct 22:00 is exactly the Italian 25 Oct (CEST then CET, 25 wall hours).
const utc = [];
for (let ms = Date.UTC(2026, 9, 24, 22); ms <= Date.UTC(2026, 9, 25, 22); ms += 3600000) utc.push(new Date(ms).toISOString().slice(0, 16));
const n = utc.length;
const fill = (f) => utc.map((_, i) => f(i, utc[i]));

test('compass names, wrapping at north', () => {
  assert.equal(compass(0), 'N');
  assert.equal(compass(350), 'N');
  assert.equal(compass(22.5), 'NNE');
  assert.equal(compass(180), 'S');
  assert.equal(compass(270), 'W');
  assert.equal(compass(-90), 'W');
  assert.equal(compass(null), null);
});

test('ensemble members: control and memberNN, only the requested names', () => {
  const hourly = { time: ['x'], wind_speed_850hPa: [1], wind_speed_850hPa_member01: [2], wind_direction_850hPa_member01: [3], precipitation_probability: [4] };
  const m = ensembleMembers(hourly, ['wind_speed_850hPa', 'wind_direction_850hPa']);
  assert.deepEqual([...m.keys()], ['control', 'member01']);
  assert.deepEqual(m.get('control'), { wind_speed_850hPa: [1] });
  assert.deepEqual(m.get('member01'), { wind_speed_850hPa: [2], wind_direction_850hPa: [3] });
});

test('rain chance: share of members at 1 mm or more, unknowns left out', () => {
  assert.equal(rainChance([0, 0.5, 1, 2, null]), 0.5, '1 mm counts, 0.5 does not');
  assert.equal(rainChance([null]), null);
});

test('north-flow probability: 15 km/h within 60 degrees of north, at 850 or 700 hPa', () => {
  const p = northFlowProbability([
    { speed850: 20, dir850: 10, speed700: null, dir700: null }, // yes
    { speed850: 20, dir850: 90, speed700: 25, dir700: 350 }, // yes through 700 hPa
    { speed850: 14, dir850: 0, speed700: 5, dir700: 0 }, // too slow
    { speed850: null, dir850: null, speed700: null, dir700: null }, // no data, skipped
  ]);
  assert.equal(p, 2 / 3);
  assert.equal(northFlowProbability([{ speed850: null, speed700: null }]), null);
});

test('spread: linear p10, p50, p90 of a pooled sample', () => {
  assert.deepEqual(spread([1, 2, 3, 4, 5]), { p10: 1.4, p50: 3, p90: 4.6 });
  assert.equal(spread([null]), null);
});

test('day buckets across the 25 Oct clock change: window is local 09–17, the day has 25 hours', () => {
  const h = romeHourly({ time: utc });
  const window = dayHourIndices(h.time, '2026-10-25');
  assert.equal(window.length, 25, 'local 00:00 to 23:00 with the repeated 02:00');
  assert.equal(h.time[window.find((i) => h.time[i] === '2026-10-25T09:00')], '2026-10-25T09:00');
  // UTC 07:00 on 25 Oct is 08:00 CET, outside the window; UTC 08:00 is 09:00 and inside.
  assert.equal(h.time[utc.indexOf('2026-10-25T07:00')], '2026-10-25T08:00');
  assert.equal(h.time[utc.indexOf('2026-10-25T08:00')], '2026-10-25T09:00');
});

test('day row: rain window, pooled wind, mean direction, north flow, temperature min and max', () => {
  const rainA = fill((i, t) => (t >= '2026-10-25T08:00' && t <= '2026-10-25T16:00' ? 0.2 : t === '2026-10-25T07:00' ? 5 : 0));
  const hourly = romeHourly({
    time: utc,
    precipitation: rainA,
    precipitation_member01: fill(() => 0.05),
    wind_speed_850hPa: fill(() => 20),
    wind_direction_850hPa: fill(() => 10),
    wind_speed_850hPa_member01: fill(() => 20),
    wind_direction_850hPa_member01: fill(() => 350),
    wind_speed_700hPa: fill(() => 5),
    wind_direction_700hPa: fill(() => 180),
    temperature_2m: fill((i) => i),
    temperature_2m_member01: fill((i) => i),
  });
  const row = dayRow(ensembleMembers(hourly, LONG_RANGE_VARS), hourly.time, '2026-10-25');
  assert.equal(row.rain, 0.5, 'member A 9 × 0.2 = 1.8 mm (the 5 mm at 08 CET is outside), member B 0.45 mm');
  assert.equal(row.aloft850.p50, 20);
  assert.ok(Math.abs(row.aloft850.dir) < 1e-6 || Math.abs(row.aloft850.dir - 360) < 1e-6, 'mean of 10 and 350 is north');
  assert.equal(row.aloft700.p50, 5);
  assert.equal(row.north, 1, 'all member-hours north at 850 hPa');
  assert.deepEqual(row.temp, { min: 0, max: 24 });
});

test('day row: a date with no data gives nulls, not NaN', () => {
  const hourly = romeHourly({ time: utc, precipitation: fill(() => 1), wind_speed_850hPa: fill(() => 10), wind_direction_850hPa: fill(() => 0) });
  const row = dayRow(ensembleMembers(hourly, LONG_RANGE_VARS), hourly.time, '2026-11-02');
  assert.deepEqual(row, { date: '2026-11-02', rain: null, aloft850: null, aloft700: null, north: null, temp: null });
});

test('foehn range per day: member 09–17 minimum of Bozen minus Innsbruck, then p10/p50/p90 over members', () => {
  const bz = romeHourly({ time: utc, pressure_msl: fill(() => 1000), pressure_msl_member01: fill(() => 1000) });
  const ib = romeHourly({ time: utc, pressure_msl: fill(() => 1004), pressure_msl_member01: fill(() => 1000) });
  const daily = ensembleFoehnDaily([{ hourly: bz }, { hourly: ib }], ['2026-10-25', '2026-10-30']);
  // member A −4 hPa, member B 0 hPa
  const d = daily.get('2026-10-25');
  assert.ok(Math.abs(d.p10 + 3.6) < 1e-9 && Math.abs(d.p50 + 2) < 1e-9 && Math.abs(d.p90 + 0.4) < 1e-9, JSON.stringify(d));
  assert.equal(daily.get('2026-10-30'), null);
});

test('long-range rows: one per date, foehn attached by date, missing dates null', () => {
  const hourly = romeHourly({ time: utc, precipitation: fill(() => 0), wind_speed_850hPa: fill(() => 10), wind_direction_850hPa: fill(() => 0) });
  const foehn = new Map([['2026-10-25', { p10: -1, p50: -2, p90: -3 }]]);
  const rows = longRangeRows(hourly, ['2026-10-25', '2026-10-30'], foehn);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].foehn, { p10: -1, p50: -2, p90: -3 });
  assert.equal(rows[1].foehn, null);
  assert.equal(rows[0].rain, 0);
});

test('long-range URL: ensemble at the launch point, GMT, 15 days, the six variables', () => {
  const u = new URL(longRangeUrl());
  assert.equal(u.origin, 'https://ensemble-api.open-meteo.com');
  assert.equal(u.searchParams.get('latitude'), '45.82');
  assert.equal(u.searchParams.get('longitude'), '11.77');
  assert.equal(u.searchParams.get('elevation'), '830');
  assert.equal(u.searchParams.get('models'), 'ecmwf_ifs025');
  assert.equal(u.searchParams.get('timezone'), 'GMT');
  assert.equal(u.searchParams.get('forecast_days'), '15');
  assert.equal(u.searchParams.get('wind_speed_unit'), 'kmh');
  assert.deepEqual(u.searchParams.get('hourly').split(','), LONG_RANGE_VARS);
  assert.equal(LONG_RANGE_VARS.length, 6);
});
