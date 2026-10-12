// forecast.json (schema in README.md). Values are copied as plain strings and numbers only.
// Rendering uses textContent, so nothing here is HTML-escaped and nothing is trusted as markup.
import { t, getLang } from './i18n.js';

const VERDICTS = ['good', 'marginal', 'no'];
const FOEHNS = ['none', 'weak', 'moderate', 'strong'];
const OUTLOOK_VERDICTS = ['likely', 'possible', 'unlikely'];
const CONFIDENCES = ['low', 'very_low'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const pick = (value, allowed) => (allowed.includes(value) ? value : null);
const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');
/** A text field: a plain string (English only) or { en, nl }. Both languages are kept, each cut to max. */
const localized = (value, max) => {
  if (typeof value === 'string') return { en: text(value, max), nl: '' };
  if (isObject(value)) return { en: text(value.en, max), nl: text(value.nl, max) };
  return { en: '', nl: '' };
};

/**
 * Normalise the raw JSON. Returns null when the file is not a forecast at all.
 * Text fields come back as { en, nl } (see localized); use localizedText to pick one for display.
 * @returns {{generatedAt:number, summary:{en:string,nl:string}, days:Array, outlook:Array}|null}
 */
export function normalizeForecast(raw) {
  if (!isObject(raw)) return null;
  const generatedAt = Date.parse(raw.generated_at);
  if (!Number.isFinite(generatedAt)) return null;
  const list = (x) => (Array.isArray(x) ? x.filter(isObject) : []);
  const days = list(raw.days)
    .filter((d) => DATE_PATTERN.test(d.date))
    .map((d) => ({
      date: d.date,
      verdict: pick(d.verdict, VERDICTS),
      headline: localized(d.headline, 300),
      window: typeof d.window === 'string' ? d.window.slice(0, 60) : null,
      foehn: pick(d.foehn, FOEHNS),
      foehnText: localized(d.foehn_text, 600),
      text: localized(d.text, 2000),
      mainRisk: localized(d.main_risk, 400),
    }));
  const outlook = list(raw.outlook)
    .filter((d) => DATE_PATTERN.test(d.date))
    .map((d) => ({
      date: d.date,
      verdict: pick(d.verdict, OUTLOOK_VERDICTS),
      confidence: pick(d.confidence, CONFIDENCES),
      foehn: pick(d.foehn, FOEHNS),
      text: localized(d.text, 600),
    }));
  return { generatedAt, summary: localized(raw.summary, 1200), days, outlook };
}

/** The text in the chosen language, else the other one, else ''. */
export function localizedText(loc, lang = getLang()) {
  const other = lang === 'nl' ? 'en' : 'nl';
  return loc?.[lang] || loc?.[other] || '';
}

export function verdictLabel(v) {
  return { good: t('verdict.good'), marginal: t('verdict.marginal'), no: t('verdict.no') }[v] ?? t('verdict.none');
}

export function outlookLabel(v) {
  return { likely: t('outlook.likely'), possible: t('outlook.possible'), unlikely: t('outlook.unlikely') }[v] ?? t('outlook.unknown');
}

export function confidenceLabel(c) {
  return { low: t('confidence.low'), very_low: t('confidence.veryLow') }[c] ?? '';
}

export function foehnLabel(f) {
  return { none: t('foehn.badge.none'), weak: t('foehn.badge.weak'), moderate: t('foehn.badge.moderate'), strong: t('foehn.badge.strong') }[f] ?? t('foehn.badge.unknown');
}
