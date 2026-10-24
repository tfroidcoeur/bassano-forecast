import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickLaunch, modelHour, ceilingAmsl, consensusHour, tempAtHeight, temperatureColumn } from '../lib/model.js';

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

test('consensus gust is the second-gustiest model, precipitation stays the median', () => {
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
  assert.equal(c.gust, 25, 'second-highest: one gusty model does not set it');
  assert.equal(c.gustMax, 30, 'the maximum is kept for information');
  assert.equal(c.precipMm, 0, 'median precipitation');
  assert.equal(consensusHour([mk('icon_seamless', null, 0)]).gust, null);
});

test('tempAtHeight interpolates between the levels around the height, without extrapolating', () => {
  const levels = [
    { z: 3151, t: 1.4 },
    { z: 856, t: 14.1 },
    { z: 1564, t: 9.8 },
    { z: null, t: 7.0 }, // a level the model does not have
  ];
  assert.ok(Math.abs(tempAtHeight(levels, 1000) - (14.1 + ((9.8 - 14.1) * (1000 - 856)) / (1564 - 856))) < 1e-9);
  assert.ok(Math.abs(tempAtHeight(levels, 3000) - (9.8 + ((1.4 - 9.8) * (3000 - 1564)) / (3151 - 1564))) < 1e-9);
  assert.equal(tempAtHeight(levels, 856), 14.1);
  assert.equal(tempAtHeight(levels, 500), null, 'below the lowest level');
  assert.equal(tempAtHeight(levels, 4000), null, 'above the highest level');
  assert.equal(tempAtHeight([], 1000), null);
});

test('temperatureColumn: 1000/1500/3000 m per model, then the median; ECMWF-style missing levels skipped', () => {
  const h = { time: ['2030-01-06T12:00'] };
  const put = (m, p, z, t) => {
    h[`geopotential_height_${p}hPa_${m}`] = [z];
    h[`temperature_${p}hPa_${m}`] = [t];
  };
  // ECMWF: no 900 or 800 hPa.
  put('ecmwf_ifs025', 925, 854, 13.5);
  put('ecmwf_ifs025', 900, null, null);
  put('ecmwf_ifs025', 850, 1562, 10.0);
  put('ecmwf_ifs025', 700, 3153, 1.7);
  put('ecmwf_ifs025', 600, 4379, -5.2);
  put('icon_seamless', 925, 856, 14.1);
  put('icon_seamless', 900, 1087, 12.6);
  put('icon_seamless', 850, 1564, 9.8);
  put('icon_seamless', 800, 2065, 7.0);
  put('icon_seamless', 700, 3151, 1.4);
  const lin = (z, a, b) => a.t + ((b.t - a.t) * (z - a.z)) / (b.z - a.z);
  const at = (z, pairs) => {
    for (const [a, b] of pairs) if (z >= a.z && z <= b.z) return lin(z, a, b);
  };
  const ecmwf = [[{ z: 854, t: 13.5 }, { z: 1562, t: 10.0 }], [{ z: 1562, t: 10.0 }, { z: 3153, t: 1.7 }]];
  const icon = [[{ z: 856, t: 14.1 }, { z: 1087, t: 12.6 }], [{ z: 1087, t: 12.6 }, { z: 1564, t: 9.8 }],
    [{ z: 1564, t: 9.8 }, { z: 2065, t: 7.0 }], [{ z: 2065, t: 7.0 }, { z: 3151, t: 1.4 }]];

  const temps = temperatureColumn(h, ['ecmwf_ifs025', 'icon_seamless', 'gfs_seamless'], 0);
  [1000, 1500, 3000].forEach((z, k) => {
    assert.ok(Math.abs(temps[k] - (at(z, ecmwf) + at(z, icon)) / 2) < 1e-9, `${z} m; GFS has no data`);
  });
  assert.deepEqual(temperatureColumn({ time: ['x'] }, ['icon_seamless'], 0), [null, null, null]);
  assert.deepEqual(temperatureColumn(null, ['icon_seamless'], 0), [null, null, null]);
});

test('consensus: median CAPE and cloud, north component at 850 hPa only, launch-level spread', () => {
  const mk = (model, cape, speed, dir) => ({
    model,
    ws10: 10,
    wd10: 180,
    gust: 20,
    launch: { speed, dir },
    aloft850: { speed: 10, dir: 90 },
    aloft700: { speed: 40, dir: 0 },
    rh850: 60,
    precipMm: 0,
    cape,
    cloudLow: 10,
    cloudMid: cape / 10,
    wx: 2,
    blh: null,
    t2: null,
    td2: null,
  });
  const c = consensusHour([mk('icon_seamless', 630, 5, 10), mk('ecmwf_ifs025', 430, 14, 80), mk('gfs_seamless', 190, 20, 350)]);
  assert.equal(c.cape, 430, 'median, not the maximum');
  assert.equal(c.cloudMid, 43);
  assert.ok(Math.abs(c.north) < 1e-9, 'north at 3000 m does not count: 850 hPa is from the east');
  assert.equal(c.speedSpread, 15);
  assert.equal(c.dirSpread, 90, 'between 350 and 80 degrees');
});
