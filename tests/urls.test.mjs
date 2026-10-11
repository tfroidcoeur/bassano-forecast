import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRefreshUrl, forecastUrl, foehnUrl, ensembleUrl } from '../lib/urls.js';
import { ALL_MODELS } from '../lib/config.js';

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
