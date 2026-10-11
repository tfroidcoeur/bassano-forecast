// Layout helpers for the mobile screens: geometry and small pure mappings, no DOM.
import { pathFromPoints } from './chart.js';
import { kmhToKt, circularMean } from './wind.js';

/** 'HH:MM–HH:MM' (or 'HH–HH', hyphen or en dash) to fractional hours { from, to }. Null when unreadable. */
export function parseWindow(text) {
  if (typeof text !== 'string') return null;
  const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*[–-]\s*(\d{1,2})(?::(\d{2}))?\s*$/.exec(text);
  if (!m) return null;
  const from = Number(m[1]) + Number(m[2] ?? 0) / 60;
  const to = Number(m[3]) + Number(m[4] ?? 0) / 60;
  if (!(from >= 0 && to <= 24 && from < to)) return null;
  return { from, to };
}

/**
 * One segment per hour for the strip. An hour is inside the window when it starts within [from, to).
 * hours: [9, …, 17]; scores: 'green' | 'amber' | 'red' | null per hour.
 */
export function hourStrip(hours, scores, window) {
  return hours.map((hour, k) => ({
    hour,
    score: scores[k] ?? null,
    inWindow: window ? hour >= window.from && hour < window.to : false,
  }));
}

/** Speed in the chosen unit, not rounded. */
export function speedIn(kmh, unit) {
  return unit === 'kt' ? kmhToKt(kmh) : kmh;
}

/** Axis maximum: the largest finite value rounded up to a multiple of step, at least one step. */
export function niceMax(values, step) {
  const v = values.filter(Number.isFinite);
  const top = v.length ? Math.max(...v) : 0;
  return Math.max(step, Math.ceil(top / step) * step);
}

/**
 * SVG path for a line over hours. values[k] is drawn at hours[k]; a null value lifts the pen.
 * geo: { w, h, pad, yMax }. Values below zero are drawn at zero.
 */
export function linePath(values, hours, { w, h, pad, yMax }) {
  const span = hours.length > 1 ? hours[hours.length - 1] - hours[0] : 1;
  const x = (hour) => pad + ((hour - hours[0]) / span) * (w - 2 * pad);
  const y = (v) => h - pad - (Math.min(Math.max(0, v), yMax) / yMax) * (h - 2 * pad);
  return pathFromPoints(values.map((v, k) => (Number.isFinite(v) ? [x(hours[k]), y(v)] : null)));
}

/** Range bar geometry on a 0–100 scale: lo = p10, hi = p90, mid = p50 (clamped). Null when there is no level. */
export function rangeBox(level, max) {
  if (!level || !Number.isFinite(level.p50) || !(max > 0)) return null;
  const at = (v) => Math.min(100, Math.max(0, (v / max) * 100));
  return { lo: at(level.p10), hi: at(level.p90), mid: at(level.p50) };
}

/** Width in percent of a 0–100 track for a value in [0, max]. Null for unknown values. */
export function barPct(value, max) {
  if (!Number.isFinite(value) || !(max > 0)) return null;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

/** Cloud base in hundreds of metres for the compact grid. */
export function ceilingHundreds(m) {
  return Number.isFinite(m) ? Math.round(m / 100) : null;
}

/**
 * Direction spread: the largest angular distance (degrees, 0–180) of any bearing from their circular mean.
 * Null when no bearing is finite.
 */
export function maxAngleDeviation(dirs) {
  const mean = circularMean(dirs);
  if (mean === null) return null;
  let max = 0;
  for (const d of dirs) {
    if (!Number.isFinite(d)) continue;
    max = Math.max(max, Math.abs((((d - mean) % 360) + 540) % 360 - 180));
  }
  return max;
}

/** Smallest and largest finite value, or null. */
export function minMax(values) {
  const v = values.filter(Number.isFinite);
  return v.length ? { min: Math.min(...v), max: Math.max(...v) } : null;
}
