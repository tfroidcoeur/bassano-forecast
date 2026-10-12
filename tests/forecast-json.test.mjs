import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeForecast, localizedText, verdictLabel, foehnLabel } from '../lib/forecast-json.js';
import { setLang } from '../lib/i18n.js';

const base = { generated_at: '2030-01-06T05:20:00Z', summary: 's', days: [], outlook: [] };

test('HTML in fetched strings is kept as plain text (the UI uses textContent)', () => {
  const evil = '<script>alert(1)</script><img src=x onerror=alert(2)>';
  const f = normalizeForecast({
    ...base,
    summary: evil,
    days: [{ date: '2030-01-06', verdict: 'good', headline: evil, window: '11:00–15:00', foehn: 'none', foehn_text: evil, text: evil, main_risk: evil }],
  });
  assert.equal(f.summary.en, evil);
  assert.equal(f.days[0].headline.en, evil);
  assert.equal(f.days[0].text.en, evil);
  assert.equal(f.days[0].mainRisk.en, evil);
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

test('a plain string is English only: { en, nl: "" }', () => {
  const f = normalizeForecast({ ...base, summary: 'Good day.', days: [{ date: '2030-01-06', verdict: 'good', headline: 'Head', foehn_text: 'Föhn', text: 'Body', main_risk: 'Wind' }] });
  assert.deepEqual(f.summary, { en: 'Good day.', nl: '' });
  assert.deepEqual(f.days[0].headline, { en: 'Head', nl: '' });
  assert.deepEqual(f.days[0].text, { en: 'Body', nl: '' });
});

test('the object form keeps both languages, each cut to the same length as a string', () => {
  const long = 'x'.repeat(1500);
  const f = normalizeForecast({ ...base, summary: { en: 'Summary', nl: 'Samenvatting' }, outlook: [{ date: '2030-01-25', verdict: 'likely', text: { en: long, nl: long } }] });
  assert.deepEqual(f.summary, { en: 'Summary', nl: 'Samenvatting' });
  assert.equal(f.outlook[0].text.en.length, 600);
  assert.equal(f.outlook[0].text.nl.length, 600);
});

test('a missing or non-string language is empty, and unknown language keys are dropped', () => {
  const f = normalizeForecast({ ...base, summary: { en: 'Only English', fr: 'Seulement', nl: 42 } });
  assert.deepEqual(f.summary, { en: 'Only English', nl: '' });
  assert.deepEqual(normalizeForecast({ ...base, summary: 7 }).summary, { en: '', nl: '' });
});

test('display picks the chosen language, then the other one, then empty', () => {
  const loc = { en: 'English', nl: 'Nederlands' };
  assert.equal(localizedText(loc, 'nl'), 'Nederlands');
  assert.equal(localizedText(loc, 'en'), 'English');
  assert.equal(localizedText({ en: 'Only English', nl: '' }, 'nl'), 'Only English', 'missing nl falls back to en');
  assert.equal(localizedText({ en: '', nl: 'Alleen Nederlands' }, 'en'), 'Alleen Nederlands');
  assert.equal(localizedText({ en: '', nl: '' }, 'nl'), '');
  assert.equal(localizedText(undefined, 'en'), '');
});

test('hostile content in the object form is still plain text', () => {
  const evil = '<img src=x onerror=alert(1)>';
  const f = normalizeForecast({ ...base, summary: { en: evil, nl: evil }, days: [{ date: '2030-01-06', verdict: 'no', headline: { en: evil, nl: evil } }] });
  assert.equal(f.summary.en, evil);
  assert.equal(f.summary.nl, evil);
  assert.equal(f.days[0].headline.nl, evil);
  assert.equal(localizedText(f.days[0].headline, 'nl'), evil, 'returned as a string, rendered with textContent');
});

test('labels follow the language, and are English by default', () => {
  assert.equal(verdictLabel('good'), 'Good');
  setLang('nl');
  try {
    assert.equal(verdictLabel('good'), 'Goed');
    assert.equal(verdictLabel('marginal'), 'Marginaal');
    assert.equal(foehnLabel('strong'), 'Sterke föhn');
  } finally {
    setLang('en');
  }
});
