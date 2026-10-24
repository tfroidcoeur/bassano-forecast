import { LIMITS, FOEHN, CAPE_EDGES, SPREAD, BREEZE } from './config.js';

const RANK = { good: 0, marginal: 1, no: 2 };

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
 * Breeze hour, as fetch_bassano.py breeze_hour: from BREEZE.fromHour on, weak wind at launch and 850 hPa,
 * low and mid cloud at most BREEZE.cloudMaxPct, no precipitation, no north flow at 850 hPa, no strong foehn.
 * The plain and upslope breeze then dominates, so the models' direction spread is expected. Missing data is not breeze.
 */
export function isBreezeHour(h, dayFoehn, hour) {
  if (!Number.isFinite(hour) || hour < BREEZE.fromHour || dayFoehn === 'strong') return false;
  if (!Number.isFinite(h.cloudLow) || !Number.isFinite(h.cloudMid)) return false;
  if (Math.max(h.cloudLow, h.cloudMid) > BREEZE.cloudMaxPct) return false;
  if (!Number.isFinite(h.launch) || h.launch > BREEZE.launchKmh) return false;
  if (!Number.isFinite(h.aloft850?.speed) || h.aloft850.speed > BREEZE.aloft850Kmh) return false;
  return (h.precipMm ?? 0) <= 0 && !hasRidgeNorthFlow(h);
}

/**
 * Score for one hour, the same rules as fetch_bassano.py score_hour. Inputs are consensus values in km/h.
 * h: { launch, aloft850, north, gust, rh850, precipMm, cape, cloudLow, cloudMid, dirSpread, speedSpread }
 *   launch: speed; aloft850: { speed, dir } consensus level; north: north component at 850 hPa.
 * dayFoehn: foehn class for the day ('none' | 'weak' | 'moderate' | 'strong' | null).
 * hour: local hour, for the breeze rule.
 * 3000 m (700 hPa) is not scored. Only a strong foehn is red; a moderate one is amber with the lee signature.
 * Returns 'green' | 'amber' | 'red', or null when the wind is unknown.
 */
export function scoreHour(h, dayFoehn, hour = null) {
  if (!Number.isFinite(h.launch) && !Number.isFinite(h.aloft850?.speed)) return null;
  const levels = [
    levelFor(h.launch, LIMITS.launch),
    levelFor(h.aloft850?.speed, LIMITS.aloft850),
    levelFor(h.north, LIMITS.north),
    levelFor(h.gust, LIMITS.gust),
  ];
  if ((h.precipMm ?? 0) >= FOEHN.rainMm) levels.push('no');
  if ((h.cape ?? 0) > FOEHN.convectiveCape && (h.precipMm ?? 0) > 0) levels.push('no');
  if (dayFoehn === 'strong') levels.push('no');
  if (dayFoehn === 'moderate' && isLee(h)) levels.push('marginal');
  if ((h.dirSpread ?? 0) > SPREAD.dirDeg && (h.launch ?? 0) >= SPREAD.minKmhForDir && !isBreezeHour(h, dayFoehn, hour)) {
    levels.push('marginal');
  }
  if ((h.speedSpread ?? 0) > SPREAD.speedKmh) levels.push('marginal');
  const worst = levels.filter(Boolean).reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'good');
  return { good: 'green', marginal: 'amber', no: 'red' }[worst];
}
