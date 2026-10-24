import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INFO_KEYS, infoText, modelList } from '../lib/info.js';
import { DICT } from '../lib/i18n.js';
import { CONSENSUS_MODELS, EXTRA_MODELS, FOEHN_MODELS, MODEL_NAMES, MODEL_SOURCES, ALL_MODELS } from '../lib/config.js';

test('every model has a source for the notes', () => {
  for (const m of ALL_MODELS) assert.ok(MODEL_SOURCES[m], m);
});

test('model lists use the language list style', () => {
  assert.equal(modelList(FOEHN_MODELS, 'en'), 'ECMWF (IFS) and ICON (DWD)');
  assert.equal(modelList(FOEHN_MODELS, 'nl'), 'ECMWF (IFS) en ICON (DWD)');
  assert.ok(modelList(CONSENSUS_MODELS, 'en').startsWith('ICON (DWD), ECMWF (IFS), GFS (NOAA)'));
});

test('every note exists in both languages with its placeholders filled', () => {
  for (const key of INFO_KEYS) {
    for (const lang of Object.keys(DICT)) {
      assert.ok(DICT[lang][`info.${key}`], `${lang}.info.${key}`);
      assert.doesNotMatch(infoText(key, lang), /\{\w+\}/, `${lang}.info.${key}`);
    }
  }
});

test('the notes name the models that feed their part', () => {
  for (const lang of Object.keys(DICT)) {
    for (const key of ['grid', 'strip', 'compare', 'verdict']) {
      for (const m of CONSENSUS_MODELS) assert.ok(infoText(key, lang).includes(MODEL_NAMES[m]), `${lang} ${key} ${m}`);
    }
    for (const m of EXTRA_MODELS) assert.ok(infoText('compare', lang).includes(MODEL_NAMES[m]), `${lang} compare ${m}`);
    for (const key of ['foehnCard', 'foehnChart', 'strip']) {
      for (const m of FOEHN_MODELS) assert.ok(infoText(key, lang).includes(MODEL_NAMES[m]), `${lang} ${key} ${m}`);
    }
    assert.ok(infoText('longRange', lang).includes('ECMWF'), lang);
  }
});
