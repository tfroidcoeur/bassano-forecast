import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICT, t, tn, setLang, getLang, detectLang, formatDecimal } from '../lib/i18n.js';
import { dayLabel, weekdayShort } from '../lib/time.js';
import { statusLine } from '../lib/status.js';

const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

test('every key in en exists in nl, and the other way round', () => {
  const en = Object.keys(DICT.en);
  const nl = Object.keys(DICT.nl);
  assert.deepEqual(en.filter((k) => !nl.includes(k)), [], 'missing in nl');
  assert.deepEqual(nl.filter((k) => !en.includes(k)), [], 'missing in en');
});

test('no value is empty, every value is a string', () => {
  for (const lang of Object.keys(DICT)) {
    for (const [key, value] of Object.entries(DICT[lang])) {
      assert.equal(typeof value, 'string', `${lang}.${key}`);
      assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
    }
  }
});

test('each translation uses the same {placeholders} as the English', () => {
  for (const [key, en] of Object.entries(DICT.en)) {
    assert.equal(placeholders(DICT.nl[key]), placeholders(en), key);
  }
});

test('t() fills {name} placeholders and keeps unknown ones', () => {
  assert.equal(t('banner.offline', { time: '09:20' }, 'en'), 'Offline — data from 09:20');
  assert.equal(t('banner.offline', { time: '09:20' }, 'nl'), 'Offline — gegevens van 09:20');
  assert.equal(t('banner.offline', {}, 'en'), 'Offline — data from {time}', 'missing param stays visible');
  assert.equal(t('card.window', { window: '11:00–15:00' }, 'nl'), 'Venster: 11:00–15:00');
});

test('t() returns the key for an unknown key', () => {
  assert.equal(t('no.such.key'), 'no.such.key');
});

test('tn() picks the plural form and fills n', () => {
  assert.equal(tn('status.hoursAgo', 1, {}, 'en'), '1 h ago');
  assert.equal(tn('status.hoursAgo', 2, {}, 'en'), '2 h ago');
  assert.equal(tn('status.hoursAgo', 0, {}, 'en'), '0 h ago');
  assert.equal(tn('status.hoursAgo', 3, {}, 'nl'), '3 u geleden');
});

test('language: any nl* browser language is Dutch, anything else English', () => {
  assert.equal(detectLang(['nl-BE', 'en']), 'nl');
  assert.equal(detectLang(['en-GB', 'nl']), 'nl');
  assert.equal(detectLang(['nl']), 'nl');
  assert.equal(detectLang(['de-AT', 'fr']), 'en');
  assert.equal(detectLang([]), 'en');
  assert.equal(detectLang(undefined), 'en');
});

test('setLang ignores unknown languages', () => {
  assert.equal(setLang('de'), getLang());
  assert.equal(getLang(), 'en');
});

test('dates: weekday and day in each locale, Italian calendar', () => {
  assert.equal(dayLabel('2026-10-17', 'en'), 'Sat 17 Oct');
  assert.equal(dayLabel('2026-10-17', 'nl'), 'za 17 okt');
  assert.equal(weekdayShort('2026-10-12', 'nl'), 'ma');
  assert.equal(weekdayShort('2026-10-12', 'en'), 'Mon');
});

test('numbers use the locale decimal separator', () => {
  assert.equal(formatDecimal(2.34, 1, 'en'), '2.3');
  assert.equal(formatDecimal(2.34, 1, 'nl'), '2,3');
});

test('status line in Dutch, through the same function as the English one', () => {
  const now = Date.parse('2026-10-11T10:00:00Z');
  const ok = { state: 'ok', generatedAt: Date.parse('2026-10-11T07:20:00Z') };
  const live = { state: 'ok', at: Date.parse('2026-10-11T08:05:00Z') };
  setLang('nl');
  try {
    assert.equal(statusLine(ok, live, now), 'Verdict geschreven 09:20 (2 u geleden) · live 10:05');
    assert.equal(statusLine({ state: 'missing' }, { state: 'loading' }, now), 'Nog geen Claude-verdict · live laden…');
  } finally {
    setLang('en');
  }
});
