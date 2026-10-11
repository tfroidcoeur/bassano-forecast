import { SITE } from './config.js';
import { median, circularMean, northComponent } from './wind.js';

/** First level with a speed, in preference order. */
export function pickLaunch(levels) {
  for (const l of levels) {
    if (Number.isFinite(l.speed)) return { speed: l.speed, dir: Number.isFinite(l.dir) ? l.dir : null };
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
    gust: maxOf((m) => m.gust),
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
