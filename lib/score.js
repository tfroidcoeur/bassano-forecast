import { LIMITS, FOEHN, CAPE_EDGES } from './config.js';

const RANK = { good: 0, marginal: 1, no: 2 };
const RAIN_GROUPS = new Set(['rain', 'drizzle', 'showers', 'thunder', 'snow']);
const SHOWER_GROUPS = new Set(['showers', 'thunder']);

/** good / marginal / no for a value against {good, marginal} limits. Null when unknown. */
export function levelFor(value, limit) {
  if (!Number.isFinite(value)) return null;
  if (value <= limit.good) return 'good';
  if (value <= limit.marginal) return 'marginal';
  return 'no';
}

/** Colour band 0-5 for CAPE in J/kg. A value equal to an edge stays in the lower band. Null when unknown. */
export function capeBand(jkg) {
  if (!Number.isFinite(jkg)) return null;
  return CAPE_EDGES.filter((edge) => jkg > edge).length;
}

/** Foehn class from a Bozen−Innsbruck ΔP in hPa. Only negative (north) values count. */
export function foehnClass(dp) {
  if (!Number.isFinite(dp)) return null;
  if (dp >= 0) return 'none';
  const m = -dp;
  if (m < FOEHN.weakFrom) return 'none';
  if (m < FOEHN.moderateFrom) return 'weak';
  if (m <= FOEHN.strongAbove) return 'moderate';
  return 'strong';
}

/** Shortest angle between a bearing and north, degrees (0..180). */
function angleFromNorth(dir) {
  const d = ((dir % 360) + 360) % 360;
  return Math.min(d, 360 - d);
}

/** North flow at one level ({speed, dir} consensus, km/h): at least the speed, from within the degrees of north. */
export function hasNorthFlow(level) {
  return (
    Number.isFinite(level?.speed) &&
    Number.isFinite(level?.dir) &&
    level.speed >= FOEHN.northFlowKmh &&
    angleFromNorth(level.dir) <= FOEHN.northFlowDeg
  );
}

/** North flow at ridge level, as in fetch_bassano.py: 850 hPa only. North wind at 700 hPa alone is reported, not counted. */
export function hasRidgeNorthFlow(h) {
  return hasNorthFlow(h.aloft850);
}

/** Lee signature, as in fetch_bassano.py: north flow at 850 hPa and consensus rh850 below the threshold. */
export function isLee(h) {
  return hasRidgeNorthFlow(h) && Number.isFinite(h.rh850) && h.rh850 < FOEHN.leeRhBelow;
}

/**
 * Score for one hour. Inputs are consensus values in km/h.
 * h: { launch, aloft850, aloft700, north, gust, rh850, precipMm, cape, wxGroup }
 *   launch: speed; aloft850 and aloft700: { speed, dir } consensus levels.
 * dayFoehn: foehn class for the day ('none' | 'weak' | 'moderate' | 'strong' | null).
 * Returns 'green' | 'amber' | 'red', or null when the wind is unknown.
 */
export function scoreHour(h, dayFoehn) {
  if (!Number.isFinite(h.launch) && !Number.isFinite(h.aloft850?.speed)) return null;
  const levels = [
    levelFor(h.launch, LIMITS.launch),
    levelFor(h.aloft850?.speed, LIMITS.aloft850),
    levelFor(h.aloft700?.speed, LIMITS.aloft700),
    levelFor(h.north, LIMITS.north),
    levelFor(h.gust, LIMITS.gust),
  ];
  const rain = (h.precipMm ?? 0) >= FOEHN.rainMm || RAIN_GROUPS.has(h.wxGroup);
  if (rain) levels.push('no');
  const convective = (h.cape ?? 0) > FOEHN.convectiveCape && ((h.precipMm ?? 0) > 0 || SHOWER_GROUPS.has(h.wxGroup));
  if (convective) levels.push('no');
  if (dayFoehn === 'strong') levels.push('no');
  // Moderate: red with the lee signature, amber with north flow at ridge level, nothing from the class alone.
  if (dayFoehn === 'moderate' && hasRidgeNorthFlow(h)) levels.push(isLee(h) ? 'no' : 'marginal');
  const worst = levels.filter(Boolean).reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'good');
  return { good: 'green', marginal: 'amber', no: 'red' }[worst];
}
