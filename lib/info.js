// Texts of the model-info notes (the blue "i" buttons): which models feed each part of the page.
// Pure: no DOM. The model lists come from config.js, so a change of models changes the notes too.
import { CONSENSUS_MODELS, EXTRA_MODELS, FOEHN_MODELS, MODEL_NAMES, MODEL_SOURCES } from './config.js';
import { t, getLang, LOCALE } from './i18n.js';

// One note per part of the page; each has the key info.<key> in both dictionaries.
export const INFO_KEYS = ['foehnCard', 'verdict', 'strip', 'grid', 'compare', 'outlook', 'longRange', 'foehnChart'];

/** "ICON (DWD), ECMWF (IFS) and GFS (NOAA)" for Open-Meteo model ids, in the language's list style. */
export function modelList(models, lang = getLang()) {
  const names = models.map((m) => `${MODEL_NAMES[m]} (${MODEL_SOURCES[m]})`);
  return new Intl.ListFormat(LOCALE[lang], { type: 'conjunction' }).format(names);
}

/** The note for one part of the page, in the current language (or lang). */
export function infoText(key, lang = getLang()) {
  return t(
    `info.${key}`,
    { models: modelList(CONSENSUS_MODELS, lang), extra: modelList(EXTRA_MODELS, lang), foehn: modelList(FOEHN_MODELS, lang) },
    lang
  );
}
