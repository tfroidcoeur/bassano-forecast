import { SITE, FOEHN_STATIONS, ALL_MODELS, CONSENSUS_MODELS, FOEHN_MODELS, ENSEMBLE_MODEL, API_TIMEZONE, TEMP_LEVELS_HPA } from './config.js';

export const HOURLY_VARS = [
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'wind_speed_900hPa',
  'wind_direction_900hPa',
  'wind_speed_925hPa',
  'wind_direction_925hPa',
  'wind_speed_850hPa',
  'wind_direction_850hPa',
  'wind_speed_700hPa',
  'wind_direction_700hPa',
  'relative_humidity_850hPa',
  'precipitation',
  'precipitation_probability',
  'cape',
  'cloud_cover_low',
  'cloud_cover_mid',
  'weather_code',
  'boundary_layer_height',
  'temperature_2m',
  'dew_point_2m',
];

/** Deterministic hourly data at the launch point, one request for all models. */
export function forecastUrl() {
  const params = new URLSearchParams({
    latitude: String(SITE.launch.lat),
    longitude: String(SITE.launch.lon),
    elevation: String(SITE.launch.elevation), // downscale to the launch point, as fetch_bassano.py does
    hourly: HOURLY_VARS.join(','),
    models: ALL_MODELS.join(','),
    wind_speed_unit: 'kmh',
    timezone: API_TIMEZONE,
    forecast_days: '7',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** Variables of the temperature rows: each pressure level's temperature and height. */
export const TEMP_VARS = [
  ...TEMP_LEVELS_HPA.flatMap((p) => [`temperature_${p}hPa`, `geopotential_height_${p}hPa`]),
];

/**
 * The pressure levels for the 1000/1500/3000 m temperature rows (lib/model.js), consensus models only.
 * A separate request, so the main one stays small: a larger main request made Open-Meteo time out.
 * The 2 m temperature at the launch comes from the main request.
 */
export function temperatureUrl() {
  const params = new URLSearchParams({
    latitude: String(SITE.launch.lat),
    longitude: String(SITE.launch.lon),
    elevation: String(SITE.launch.elevation),
    hourly: TEMP_VARS.join(','),
    models: CONSENSUS_MODELS.join(','),
    timezone: API_TIMEZONE,
    forecast_days: '7',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** Multi-location MSLP for the foehn stations, in FOEHN_STATIONS order. */
export function foehnUrl() {
  const params = new URLSearchParams({
    latitude: FOEHN_STATIONS.map((s) => String(s.lat)).join(','),
    longitude: FOEHN_STATIONS.map((s) => String(s.lon)).join(','),
    hourly: 'pressure_msl',
    models: FOEHN_MODELS.join(','),
    timezone: API_TIMEZONE,
    forecast_days: '7',
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

/** Ensemble MSLP for Bolzano and Innsbruck, for the outlook band. */
export function ensembleUrl() {
  const pair = FOEHN_STATIONS.slice(0, 2);
  const params = new URLSearchParams({
    latitude: pair.map((s) => String(s.lat)).join(','),
    longitude: pair.map((s) => String(s.lon)).join(','),
    hourly: 'pressure_msl',
    models: ENSEMBLE_MODEL,
    timezone: API_TIMEZONE,
    forecast_days: '15',
  });
  return `https://ensemble-api.open-meteo.com/v1/ensemble?${params}`;
}

/** Ensemble hourly variables for the long-range table (lib/longrange.js). */
export const LONG_RANGE_VARS = [
  'precipitation',
  'temperature_2m',
  'wind_speed_850hPa',
  'wind_direction_850hPa',
  'wind_speed_700hPa',
  'wind_direction_700hPa',
];

/** ECMWF ensemble at the launch point, 15 days, one request for all members. */
export function longRangeUrl() {
  const params = new URLSearchParams({
    latitude: String(SITE.launch.lat),
    longitude: String(SITE.launch.lon),
    elevation: String(SITE.launch.elevation), // launch point, as in forecastUrl
    hourly: LONG_RANGE_VARS.join(','),
    models: ENSEMBLE_MODEL,
    wind_speed_unit: 'kmh',
    timezone: API_TIMEZONE,
    forecast_days: '15',
  });
  return `https://ensemble-api.open-meteo.com/v1/ensemble?${params}`;
}

/**
 * Accepts only an https://claude.ai/ URL. Returns the normalised href, or null.
 * @param {unknown} input
 * @returns {string|null}
 */
export function validateRefreshUrl(input) {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s.startsWith('https://claude.ai/')) return null;
  let u;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.hostname !== 'claude.ai' || u.username || u.password) return null;
  return u.href;
}
