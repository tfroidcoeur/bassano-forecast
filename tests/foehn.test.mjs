import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foehnSeries, ensembleSeries, percentile, dayFoehnDp, dayExtremes, dayIndices } from '../lib/foehn.js';
import { foehnClass } from '../lib/score.js';

const time = ['2030-01-06T00:00', '2030-01-06T09:00', '2030-01-07T09:00'];
const loc = (p) => ({ hourly: { time, ...p } });
const multi = [
  loc({ pressure_msl_ecmwf_ifs025: [1020, 1018, 1010], pressure_msl_icon_seamless: [1021, 1017, 1011] }), // Bolzano
  loc({ pressure_msl_ecmwf_ifs025: [1019, 1022, 1015], pressure_msl_icon_seamless: [1019, 1021, 1014] }), // Innsbruck
  loc({ pressure_msl_ecmwf_ifs025: [1025, 1024, 1020] }), // Zurich
  loc({ pressure_msl_ecmwf_ifs025: [1019, 1018, 1019] }), // Lugano
];

test('Bozen minus Innsbruck and Zurich minus Lugano from a multi-location response', () => {
  const s = foehnSeries(multi);
  assert.deepEqual(s.biEcmwf.map((x) => Math.round(x * 10) / 10), [1, -4, -5]);
  assert.deepEqual(s.biIcon.map((x) => Math.round(x * 10) / 10), [2, -4, -3]);
  assert.deepEqual(s.zlEcmwf.map((x) => Math.round(x * 10) / 10), [6, 6, 1]);
});

test('missing values give null, not NaN', () => {
  const broken = [...multi];
  broken[1] = loc({ pressure_msl_ecmwf_ifs025: [null, 1022, 1015], pressure_msl_icon_seamless: [1019, 1021, 1014] });
  const s = foehnSeries(broken);
  assert.equal(s.biEcmwf[0], null);
});

test('percentile interpolates linearly', () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 0.5), 3);
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentile([0, 10], 0.9), 9);
  assert.equal(percentile([null], 0.5), null);
});

test('ensemble: members paired by id, control has no member part, percentiles per hour', () => {
  const bz = {
    hourly: {
      time: ['2030-01-06T00:00'],
      pressure_msl_ecmwf_ifs025_ensemble: [1020],
      pressure_msl_member01_ecmwf_ifs025_ensemble: [1010],
      pressure_msl_member02_ecmwf_ifs025_ensemble: [1030],
    },
  };
  const ib = {
    hourly: {
      time: ['2030-01-06T00:00'],
      pressure_msl_ecmwf_ifs025_ensemble: [1018],
      pressure_msl_member01_ecmwf_ifs025_ensemble: [1012],
      pressure_msl_member02_ecmwf_ifs025_ensemble: [1020],
    },
  };
  const e = ensembleSeries([bz, ib]);
  // deltas: control 2, member01 -2, member02 10 -> sorted -2, 2, 10
  assert.equal(e.p50[0], 2);
  assert.equal(e.p10[0], -1.2);
  assert.equal(e.p90[0], 8.4);
});

test('day window indices and day extremes', () => {
  const s = foehnSeries(multi);
  assert.deepEqual(dayIndices(s.time, '2030-01-06'), [1]);
  assert.equal(dayFoehnDp(s, '2030-01-06'), -4);
  const ex = dayExtremes(s, '2030-01-06');
  assert.equal(ex.biEcmwfMin, -4);
  assert.equal(ex.biIconMin, -4);
  assert.equal(ex.zlEcmwfMax, 6);
  assert.equal(dayFoehnDp(s, '2030-01-08'), null);
});

test('day foehn: most negative per-model minimum in 09-17, not a mean of the models', () => {
  // 09: ECMWF -3.5, ICON -1 (mean -2.25, weak). 10: ECMWF 0, ICON -1. The day is moderate: ECMWF sets it.
  const t = ['2030-01-06T09:00', '2030-01-06T10:00', '2030-01-06T18:00'];
  const s = foehnSeries([
    { hourly: { time: t, pressure_msl_ecmwf_ifs025: [1016.5, 1020, 1000], pressure_msl_icon_seamless: [1019, 1019, 1000] } },
    { hourly: { time: t, pressure_msl_ecmwf_ifs025: [1020, 1020, 1000], pressure_msl_icon_seamless: [1020, 1020, 1000] } },
    { hourly: { time: t } },
    { hourly: { time: t } },
  ]);
  assert.equal(dayFoehnDp(s, '2030-01-06'), -3.5);
  assert.equal(foehnClass(dayFoehnDp(s, '2030-01-06')), 'moderate');
});

test('day foehn: an extreme outside 09-17 is ignored; a positive day is none', () => {
  const t = ['2030-01-06T08:00', '2030-01-06T09:00'];
  const s = foehnSeries([
    { hourly: { time: t, pressure_msl_ecmwf_ifs025: [1010, 1020], pressure_msl_icon_seamless: [1010, 1020] } },
    { hourly: { time: t, pressure_msl_ecmwf_ifs025: [1020, 1020], pressure_msl_icon_seamless: [1020, 1020] } },
    { hourly: { time: t, pressure_msl_ecmwf_ifs025: [1, 1] } },
    { hourly: { time: t, pressure_msl_ecmwf_ifs025: [1, 1] } },
  ]);
  assert.equal(dayFoehnDp(s, '2030-01-06'), 0);
  assert.equal(foehnClass(dayFoehnDp(s, '2030-01-06')), 'none');
});

test('ensemble keys: plain control and memberNN keys, as the live API returns them', () => {
  const bz = { hourly: { time: ['2030-01-06T00:00'], pressure_msl: [1020], pressure_msl_member01: [1010], time2: [0] } };
  const ib = { hourly: { time: ['2030-01-06T00:00'], pressure_msl: [1018], pressure_msl_member01: [1012] } };
  const e = ensembleSeries([bz, ib]);
  assert.equal(e.p50[0], 0, 'two members: deltas 2 and -2, median 0');
});
