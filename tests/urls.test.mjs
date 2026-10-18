import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRefreshUrl, forecastUrl, foehnUrl, ensembleUrl, temperatureUrl } from '../lib/urls.js';
import { ALL_MODELS, CONSENSUS_MODELS } from '../lib/config.js';

test('refresh URL: only https://claude.ai/ is accepted', () => {
  assert.equal(validateRefreshUrl('https://claude.ai/code/routines/abc'), 'https://claude.ai/code/routines/abc');
  assert.equal(validateRefreshUrl('  https://claude.ai/x  '), 'https://claude.ai/x');
  assert.equal(validateRefreshUrl('http://claude.ai/x'), null);
  assert.equal(validateRefreshUrl('javascript:alert(1)'), null);
  assert.equal(validateRefreshUrl('https://claude.ai.evil.example/x'), null);
  assert.equal(validateRefreshUrl('https://evil.example/https://claude.ai/x'), null);
  assert.equal(validateRefreshUrl('https://user:pw@claude.ai/x'), null);
  assert.equal(validateRefreshUrl(''), null);
  assert.equal(validateRefreshUrl(undefined), null);
});

test('Open-Meteo URLs: relative numbers only, no undefined values', () => {
  for (const u of [forecastUrl(), foehnUrl(), ensembleUrl()]) {
    assert.ok(!u.includes('undefined'), u);
    assert.ok(!u.includes('NaN'), u);
  }
  const f = new URL(forecastUrl());
  assert.equal(f.searchParams.get('models'), ALL_MODELS.join(','));
  assert.equal(f.searchParams.get('wind_speed_unit'), 'kmh');
  assert.equal(f.searchParams.get('timezone'), 'GMT', 'one offset per response breaks at the clock change');
  assert.equal(f.searchParams.get('elevation'), '830', 'launch point elevation, as fetch_bassano.py');
  assert.equal(new URL(foehnUrl()).searchParams.get('latitude'), '46.5,47.26,47.38,46');
  assert.equal(new URL(foehnUrl()).searchParams.get('timezone'), 'GMT');
  assert.equal(new URL(ensembleUrl()).searchParams.get('forecast_days'), '15');
  assert.equal(new URL(ensembleUrl()).searchParams.get('timezone'), 'GMT');
});

test('only the launch-point forecast carries an elevation', () => {
  assert.equal(new URL(foehnUrl()).searchParams.get('elevation'), null);
  assert.equal(new URL(ensembleUrl()).searchParams.get('elevation'), null);
});

test('temperature URL: landing point, consensus models, GMT, 2 m and the pressure-level profile', () => {
  const u = new URL(temperatureUrl());
  assert.equal(u.hostname, 'api.open-meteo.com');
  assert.equal(u.searchParams.get('elevation'), '130');
  assert.equal(u.searchParams.get('models'), CONSENSUS_MODELS.join(','));
  assert.equal(u.searchParams.get('timezone'), 'GMT');
  const hourly = u.searchParams.get('hourly').split(',');
  assert.ok(hourly.includes('temperature_2m'));
  for (const p of [925, 850, 700, 600]) {
    assert.ok(hourly.includes(`temperature_${p}hPa`), p);
    assert.ok(hourly.includes(`geopotential_height_${p}hPa`), p);
  }
});

test('the main forecast stays without the profile: a larger request made Open-Meteo time out', () => {
  const hourly = new URL(forecastUrl()).searchParams.get('hourly');
  assert.ok(!hourly.includes('geopotential_height'));
  assert.ok(!/temperature_\d+hPa/.test(hourly));
});
