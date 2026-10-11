// forecast.json (schema in README.md). Values are copied as plain strings and numbers only.
// Rendering uses textContent, so nothing here is HTML-escaped and nothing is trusted as markup.

const VERDICTS = ['good', 'marginal', 'no'];
const FOEHNS = ['none', 'weak', 'moderate', 'strong'];
const OUTLOOK_VERDICTS = ['likely', 'possible', 'unlikely'];
const CONFIDENCES = ['low', 'very_low'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const pick = (value, allowed) => (allowed.includes(value) ? value : null);
const text = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

/**
 * Normalise the raw JSON. Returns null when the file is not a forecast at all.
 * @returns {{generatedAt:number, summary:string, days:Array, outlook:Array}|null}
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
      headline: text(d.headline, 300),
      window: typeof d.window === 'string' ? d.window.slice(0, 60) : null,
      foehn: pick(d.foehn, FOEHNS),
      foehnText: text(d.foehn_text, 600),
      text: text(d.text, 2000),
      mainRisk: text(d.main_risk, 400),
    }));
  const outlook = list(raw.outlook)
    .filter((d) => DATE_PATTERN.test(d.date))
    .map((d) => ({
      date: d.date,
      verdict: pick(d.verdict, OUTLOOK_VERDICTS),
      confidence: pick(d.confidence, CONFIDENCES),
      foehn: pick(d.foehn, FOEHNS),
      text: text(d.text, 600),
    }));
  return { generatedAt, summary: text(raw.summary, 1200), days, outlook };
}

export function verdictLabel(v) {
  return { good: 'Good', marginal: 'Marginal', no: 'No' }[v] ?? 'No verdict';
}

export function outlookLabel(v) {
  return { likely: 'Likely', possible: 'Possible', unlikely: 'Unlikely' }[v] ?? 'Unknown';
}

export function confidenceLabel(c) {
  return { low: 'low confidence', very_low: 'very low confidence' }[c] ?? '';
}

export function foehnLabel(f) {
  return { none: 'No foehn', weak: 'Weak foehn', moderate: 'Moderate foehn', strong: 'Strong foehn' }[f] ?? 'Foehn unknown';
}
