import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForecast, verdictLabel, foehnLabel } from '../lib/forecast-json.js';

const base = { generated_at: '2030-01-06T05:20:00Z', summary: 's', days: [], outlook: [] };

test('HTML in fetched strings is kept as plain text (the UI uses textContent)', () => {
  const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const f = normalizeForecast({
    ...base,
    summary: evil,
    days: [{ date: '2030-01-06', verdict: 'good', headline: evil, window: '11:00–15:00', foehn: 'none', foehn_text: evil, text: evil, main_risk: evil }],
  });
  assert.equal(f.summary, evil);
  assert.equal(f.days[0].headline, evil);
  assert.equal(f.days[0].text, evil);
  assert.equal(f.days[0].mainRisk, evil);
});

test('enums outside the schema become null, dates must look like dates', () => {
  const f = normalizeForecast({
    ...base,
    days: [
      { date: '2030-01-06', verdict: 'javascript:alert(1)', foehn: 'extreme', headline: 'h' },
      { date: 'tomorrow', verdict: 'good' },
    ],
    outlook: [{ date: '2030-01-25', verdict: 'likely', confidence: 'very_low', foehn: 'weak', text: 't' }],
  });
  assert.equal(f.days.length, 1);
  assert.equal(f.days[0].verdict, null);
  assert.equal(f.days[0].foehn, null);
  assert.equal(f.outlook[0].confidence, 'very_low');
});

test('a bad generated_at or non-object is rejected', () => {
  assert.equal(normalizeForecast(null), null);
  assert.equal(normalizeForecast([]), null);
  assert.equal(normalizeForecast({ ...base, generated_at: 'soon' }), null);
  assert.equal(normalizeForecast({ ...base, generated_at: '2030-01-06T05:20:00Z' }).generatedAt, Date.parse('2030-01-06T05:20:00Z'));
});

test('labels fall back for unknown values', () => {
  assert.equal(verdictLabel('good'), 'Good');
  assert.equal(verdictLabel(null), 'No verdict');
  assert.equal(foehnLabel(null), 'Foehn unknown');
});
