import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLaunch, modelHour, ceilingAmsl, consensusHour } from '../lib/model.js';

test('launch wind falls back 900 -> 925 -> 850', () => {
  const at900 = { speed: 12, dir: 200 };
  const at925 = { speed: 14, dir: 210 };
  const at850 = { speed: 18, dir: 220 };
  assert.deepEqual(pickLaunch([at900, at925, at850]), at900);
  assert.deepEqual(pickLaunch([{ speed: null, dir: null }, at925, at850]), at925);
  assert.deepEqual(pickLaunch([{ speed: null, dir: null }, { speed: null, dir: null }, at850]), at850);
  assert.equal(pickLaunch([{ speed: null, dir: null }]), null);
});

test('modelHour uses the fallback when a model has no 900 hPa (ECMWF style)', () => {
  const hourly = {
    time: ['2030-01-06T10:00'],
    wind_speed_900hPa_ecmwf_ifs025: [null],
    wind_direction_900hPa_ecmwf_ifs025: [null],
    wind_speed_925hPa_ecmwf_ifs025: [16],
    wind_direction_925hPa_ecmwf_ifs025: [190],
    wind_speed_850hPa_ecmwf_ifs025: [20],
    wind_direction_850hPa_ecmwf_ifs025: [200],
  };
  const m = modelHour(hourly, 'ecmwf_ifs025', 0);
  assert.deepEqual(m.launch, { speed: 16, dir: 190 });
  assert.equal(m.ws10, null);
  assert.equal(m.aloft700.speed, null);
});

test('ceiling: lower of GFS boundary layer top and spread cloud base, AMSL', () => {
  // ground 830; spread (15-5)*125 = 1250 -> 2080; blh 1000 -> 1830
  assert.equal(ceilingAmsl({ t2: 15, td2: 5, blh: 1000 }), 1830);
  // spread (15-12)*125 = 375 -> 1205; blh 2000 -> 2830
  assert.equal(ceilingAmsl({ t2: 15, td2: 12, blh: 2000 }), 1205);
  // only spread
  assert.equal(ceilingAmsl({ t2: 10, td2: 9, blh: null }), 955);
  assert.equal(ceilingAmsl({ t2: null, td2: null, blh: null }), null);
});

test('consensus: median speeds, median precipitation, GFS boundary layer', () => {
  const mk = (model, ws10, precipMm, blh) => ({
    model,
    ws10,
    wd10: 180,
    gust: 20,
    launch: { speed: 10, dir: 180 },
    aloft850: { speed: 20, dir: 0 },
    aloft700: { speed: 30, dir: 270 },
    rh850: 60,
    precipMm,
    cape: 0,
    cloudLow: 10,
    wx: 2,
    blh,
    t2: 15,
    td2: 5,
  });
  const c = consensusHour([
    mk('icon_seamless', 8, 0, 500),
    mk('ecmwf_ifs025', 10, 0.4, 900),
    mk('gfs_seamless', 12, 0, 1000),
  ]);
  assert.equal(c.ws10, 10);
  assert.equal(c.precipMm, 0); // one wet model of three: median stays dry
  assert.equal(c.ceiling, 1830);
  assert.ok(c.north > 19.9 && c.north < 20.1, 'north at 850 from wind from 0 degrees');
});

test('consensus gust is the maximum across models, precipitation stays the median', () => {
  const mk = (model, gust, precipMm) => ({
    model,
    ws10: 10,
    wd10: 180,
    gust,
    launch: { speed: 10, dir: 180 },
    aloft850: { speed: 20, dir: 180 },
    aloft700: { speed: 30, dir: 270 },
    rh850: 60,
    precipMm,
    cape: 0,
    cloudLow: 10,
    wx: 2,
    blh: null,
    t2: null,
    td2: null,
  });
  const c = consensusHour([mk('icon_seamless', 20, 0), mk('ecmwf_ifs025', 30, 0), mk('gfs_seamless', 25, 0.4)]);
  assert.equal(c.gust, 30, 'maximum, not the median (25)');
  assert.equal(c.precipMm, 0, 'median precipitation');
  assert.equal(consensusHour([mk('icon_seamless', null, 0)]).gust, null);
});
