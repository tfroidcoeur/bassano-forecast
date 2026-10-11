import { wallFor } from './time.js';

const DAY_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const num = (x) => (Number.isFinite(x) ? x : null);

/**
 * ΔP series from the multi-location MSLP response, locations in FOEHN_STATIONS order
 * (Bolzano, Innsbruck, Zurich, Lugano). Bozen−Innsbruck: negative = north foehn.
 */
export function foehnSeries(locations) {
  const [bz, ib, zh, lu] = locations;
  const time = bz.hourly.time;
  const diff = (a, b, key) =>
    time.map((_, k) => {
      const x = num(a.hourly[key]?.[k]);
      const y = num(b.hourly[key]?.[k]);
      return x === null || y === null ? null : x - y;
    });
  return {
    time,
    biEcmwf: diff(bz, ib, 'pressure_msl_ecmwf_ifs025'),
    biIcon: diff(bz, ib, 'pressure_msl_icon_seamless'),
    zlEcmwf: diff(zh, lu, 'pressure_msl_ecmwf_ifs025'),
  };
}

/** Linear-interpolated percentile (p in 0..1). Null when no values. */
export function percentile(values, p) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const h = (v.length - 1) * p;
  const lo = Math.floor(h);
  const hi = Math.ceil(h);
  return v[lo] + (v[hi] - v[lo]) * (h - lo);
}

/**
 * Per-hour percentiles of the member Bozen−Innsbruck ΔP. Keys are 'pressure_msl' (control)
 * and 'pressure_msl_member01' … (optionally with a model suffix), in both locations.
 */
export function ensembleSeries([bz, ib]) {
  const time = bz.hourly.time;
  const keyPattern = /^pressure_msl(?:_member\d+)?(?:_|$)/;
  const memberKeys = Object.keys(bz.hourly).filter((k) => keyPattern.test(k) && Array.isArray(ib.hourly[k]));
  const stats = { time, p10: [], p50: [], p90: [] };
  for (let k = 0; k < time.length; k++) {
    const dps = memberKeys.map((key) => {
      const x = num(bz.hourly[key][k]);
      const y = num(ib.hourly[key][k]);
      return x === null || y === null ? null : x - y;
    });
    stats.p10.push(percentile(dps, 0.1));
    stats.p50.push(percentile(dps, 0.5));
    stats.p90.push(percentile(dps, 0.9));
  }
  return stats;
}

/** Indices of a day's 09–17 hours in a time array. */
export function dayIndices(time, dateKey, hours = DAY_HOURS) {
  const wanted = new Set(hours.map((h) => wallFor(dateKey, h)));
  const out = [];
  time.forEach((t, i) => {
    if (wanted.has(t)) out.push(i);
  });
  return out;
}

/**
 * Day foehn ΔP as in fetch_bassano.py: per model the minimum Bozen−Innsbruck in the 09–17 window,
 * then the most negative of the models. Null when unknown.
 */
export function dayFoehnDp(series, dateKey) {
  const ex = dayExtremes(series, dateKey);
  const vals = [ex.biEcmwfMin, ex.biIconMin].filter(Number.isFinite);
  return vals.length ? Math.min(...vals) : null;
}

/** Per-model extremes in the day window, for the text summary. */
export function dayExtremes(series, dateKey) {
  const idx = dayIndices(series.time, dateKey);
  const pick = (arr, fn) => {
    const vals = idx.map((i) => arr[i]).filter(Number.isFinite);
    return vals.length ? vals.reduce((a, b) => fn(a, b)) : null;
  };
  return {
    biEcmwfMin: pick(series.biEcmwf, Math.min),
    biIconMin: pick(series.biIcon, Math.min),
    zlEcmwfMax: pick(series.zlEcmwf, Math.max),
  };
}
