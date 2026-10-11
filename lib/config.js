// Site, stations, limits and models. Limits in km/h, as in the reference table.
// Every value here is editable; the reasoning lives in README.md.

export const SITE = {
  launch: { lat: 45.82, lon: 11.77, elevation: 830 },
  low: { lat: 45.807, lon: 11.785, elevation: 130 },
  summit: { lat: 45.86, lon: 11.80, elevation: 1550 },
};

// Order matters: the foehn URL and the ΔP maths use this order.
export const FOEHN_STATIONS = [
  { name: 'Bolzano', lat: 46.5, lon: 11.35 },
  { name: 'Innsbruck', lat: 47.26, lon: 11.4 },
  { name: 'Zurich', lat: 47.38, lon: 8.54 },
  { name: 'Lugano', lat: 46.0, lon: 8.95 },
];

export const LIMITS = {
  launch: { good: 15, marginal: 22 }, // launch-height wind (900 hPa, falls back to 925, 850)
  aloft850: { good: 25, marginal: 35 },
  aloft700: { good: 40, marginal: 55 },
  north: { good: 15, marginal: 30 }, // northerly component at 850 or 700 hPa
  gust: { good: 25, marginal: 35 }, // 10 m gusts
};

export const FOEHN = {
  weakFrom: 2, // |ΔP| north, hPa
  moderateFrom: 3,
  strongAbove: 6,
  leeRhBelow: 40, // 850 hPa relative humidity, %
  northFlowKmh: 15, // north flow aloft: at least this speed (850 or 700 hPa)
  northFlowDeg: 60, // ... from within this many degrees of north
  rainMm: 0.2, // hourly precipitation (median of the models) that counts as rain; matches fetch_bassano.py
  convectiveCape: 800, // J/kg, only with showers
};

export const CONSENSUS_MODELS = [
  'icon_seamless',
  'ecmwf_ifs025',
  'gfs_seamless',
  'meteofrance_seamless',
  'italia_meteo_arpae_icon_2i',
];

// Shown in the comparison table; 10 m data only for the last three.
export const EXTRA_MODELS = [
  'icon_d2',
  'meteoswiss_icon_ch1',
  'meteoswiss_icon_ch2',
  'meteofrance_arome_france_hd',
];

export const ALL_MODELS = [...CONSENSUS_MODELS, ...EXTRA_MODELS];

export const MODEL_NAMES = {
  icon_seamless: 'ICON',
  ecmwf_ifs025: 'ECMWF',
  gfs_seamless: 'GFS',
  meteofrance_seamless: 'AROME',
  italia_meteo_arpae_icon_2i: 'ICON-2I',
  icon_d2: 'ICON-D2',
  meteoswiss_icon_ch1: 'ICON-CH1',
  meteoswiss_icon_ch2: 'ICON-CH2',
  meteofrance_arome_france_hd: 'AROME HD',
};

export const FOEHN_MODELS = ['ecmwf_ifs025', 'icon_seamless'];
export const ENSEMBLE_MODEL = 'ecmwf_ifs025';

export const DATA_URL =
  'https://api.github.com/repos/tfroidcoeur/bassano-forecast/contents/data/forecast.json?ref=claude/forecast-data';
export const DATA_URL_FALLBACK =
  'https://raw.githubusercontent.com/tfroidcoeur/bassano-forecast/claude/forecast-data/data/forecast.json';

export const TIMEZONE = 'Europe/Rome'; // display: local time of the site
export const API_TIMEZONE = 'GMT'; // requests: one offset per response breaks across the clock change, so convert in lib/time.js
