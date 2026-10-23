import { SITE, TEMP_HEIGHTS_M, TEMP_LEVELS_HPA } from './config.js';
import { median, circularMean, northComponent } from './wind.js';

/** First level with a speed, in preference order. */
export function pickLaunch(levels) {
  for (const l of levels) {
    if (Number.isFinite(l.speed)) return { speed: l.speed, dir: Number.isFinite(l.dir) ? l.dir : null };
  }
  return null;
}

/**
 * Temperature at height z (m AMSL), linear between the two pressure levels around it.
 * levels: [{ z, t }] in any order; levels missing z or t are skipped. Null outside the levels (no extrapolation).
 */
export function tempAtHeight(levels, z) {
  const pts = levels.filter((l) => Number.isFinite(l.z) && Number.isFinite(l.t)).sort((a, b) => a.z - b.z);
  for (let k = 0; k + 1 < pts.length; k++) {
    const lo = pts[k];
    const hi = pts[k + 1];
    if (z >= lo.z && z <= hi.z) {
      return hi.z === lo.z ? lo.t : lo.t + ((hi.t - lo.t) * (z - lo.z)) / (hi.z - lo.z);
    }
  }
  return null;
}

/** One model's values at hourly index i. Missing values are null. */
export function modelHour(hourly, model, i) {
  const v = (name) => {
    const arr = hourly[`${name}_${model}`];
    const x = Array.isArray(arr) ? arr[i] : null;
    return Number.isFinite(x) ? x : null;
  };
  const level = (p) => ({ speed: v(`wind_speed_${p}`), dir: v(`wind_direction_${p}`) });
  const l850 = level('850hPa');
  return {
    model,
    ws10: v('wind_speed_10m'),
    wd10: v('wind_direction_10m'),
    gust: v('wind_gusts_10m'),
    launch: pickLaunch([level('900hPa'), level('925hPa'), l850]),
    aloft850: l850,
    aloft700: level('700hPa'),
    rh850: v('relative_humidity_850hPa'),
    precipMm: v('precipitation'),
    cape: v('cape'),
    cloudLow: v('cloud_cover_low'),
    wx: v('weather_code'),
    blh: v('boundary_layer_height'),
    t2: v('temperature_2m'),
    td2: v('dew_point_2m'),
  };
}

/**
 * The temperatures at TEMP_HEIGHTS_M for hourly index i of the temperature response (lib/urls.js
 * temperatureUrl): each model interpolated from its own pressure levels, then the median per height.
 * Null entries where no model reaches the height.
 */
export function temperatureColumn(hourly, models, i) {
  const v = (name, m) => {
    const arr = hourly?.[`${name}_${m}`];
    const x = Array.isArray(arr) ? arr[i] : null;
    return Number.isFinite(x) ? x : null;
  };
  const perModel = models.map((m) => {
    const levels = TEMP_LEVELS_HPA.map((p) => ({ z: v(`geopotential_height_${p}hPa`, m), t: v(`temperature_${p}hPa`, m) }));
    return TEMP_HEIGHTS_M.map((z) => tempAtHeight(levels, z));
  });
  return TEMP_HEIGHTS_M.map((_, k) => median(perModel.map((temps) => temps[k])));
}

/** Lower of the GFS boundary-layer top and the spread cloud base, AMSL, metres. */
export function ceilingAmsl({ t2, td2, blh }, ground = SITE.launch.elevation) {
  const candidates = [];
  if (Number.isFinite(blh)) candidates.push(ground + blh);
  if (Number.isFinite(t2) && Number.isFinite(td2)) candidates.push(ground + Math.max(0, t2 - td2) * 125);
  return candidates.length ? Math.round(Math.min(...candidates)) : null;
}

/**
 * Consensus of the consensus models for one hour.
 * Speeds and humidity: median. Directions: circular mean. Gusts: maximum, as in fetch_bassano.py.
 * Precipitation: median (one wet model alone does not make the hour red). CAPE: the maximum (conservative).
 * Ceiling blh comes from the GFS model only.
 */
/** Second-highest finite value (the only one when there is one), null when none. */
export function secondHighest(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => b - a);
  return v.length ? v[Math.min(1, v.length - 1)] : null;
}

export function consensusHour(models) {
  const med = (f) => median(models.map(f));
  const circ = (f) => circularMean(models.map(f));
  const maxOf = (f) => {
    const v = models.map(f).filter(Number.isFinite);
    return v.length ? Math.max(...v) : null;
  };
  const c = {
    ws10: med((m) => m.ws10),
    wd10: circ((m) => m.wd10),
    gust: secondHighest(models.map((m) => m.gust)), // two models must agree on a gust, as fetch_bassano.py
    gustMax: maxOf((m) => m.gust),
    launch: { speed: med((m) => m.launch?.speed), dir: circ((m) => m.launch?.dir) },
    aloft850: { speed: med((m) => m.aloft850.speed), dir: circ((m) => m.aloft850.dir) },
    aloft700: { speed: med((m) => m.aloft700.speed), dir: circ((m) => m.aloft700.dir) },
    rh850: med((m) => m.rh850),
    precipMm: med((m) => m.precipMm),
    cape: models.map((m) => m.cape).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0),
    cloudLow: med((m) => m.cloudLow),
    t2: med((m) => m.t2),
    td2: med((m) => m.td2),
    blh: models.find((m) => m.model === 'gfs_seamless')?.blh ?? null,
    wx: (models.find((m) => m.model === 'icon_seamless') ?? models.find((m) => Number.isFinite(m.wx)))?.wx ?? null,
  };
  // North component of the consensus wind at 850 and 700 hPa, the higher of the two (as fetch_bassano.py).
  const norths = [c.aloft850, c.aloft700].map((w) => northComponent(w.speed, w.dir)).filter(Number.isFinite);
  c.north = norths.length ? Math.max(...norths) : null;
  c.ceiling = ceilingAmsl(c);
  return c;
}
