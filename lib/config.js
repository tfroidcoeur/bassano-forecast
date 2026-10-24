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
  north: { good: 15, marginal: 30 }, // northerly component at 850 hPa (ridge level)
  // 3000 m (700 hPa) is not scored: thermals rarely reach it. Its row in the grid shows it, coloured.
  gust: { good: 25, marginal: 35 }, // 10 m gusts
};

export const FOEHN = {
  weakFrom: 2, // |ΔP| north, hPa
  moderateFrom: 3,
  strongAbove: 6,
  leeRhBelow: 40, // 850 hPa relative humidity, %
  northFlowKmh: 20, // north flow at ridge level: at least this speed at 850 hPa (700 hPa alone does not count)
  northFlowDeg: 60, // ... from within this many degrees of north
  rainMm: 0.2, // hourly precipitation (median of the models) that counts as rain; matches fetch_bassano.py
  convectiveCape: 800, // J/kg, only with showers
};

// Amber when the consensus models disagree this much on the launch-level wind, as fetch_bassano.py.
// Direction spread only counts from minKmhForDir, and not in a breeze hour.
export const SPREAD = { dirDeg: 45, speedKmh: 8, minKmhForDir: 10 };

// Breeze hour, as fetch_bassano.py: weak wind and sun from fromHour on, no north flow at 850 hPa and no
// strong foehn. The plain and upslope breeze then dominates, so the models' direction spread is expected.
export const BREEZE = { fromHour: 11, launchKmh: 12, aloft850Kmh: 20, cloudMaxPct: 50 };

// CAPE colour bands in the hour grid (J/kg): 0 below 50, then one band per edge passed.
// 800 is FOEHN.convectiveCape, so orange and red mark the CAPE the score counts with showers.
export const CAPE_EDGES = [50, 200, 400, 800, 1500];

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

// Who runs each model (ECMWF: its IFS model), for the model-info notes (lib/info.js).
export const MODEL_SOURCES = {
  icon_seamless: 'DWD',
  ecmwf_ifs025: 'IFS',
  gfs_seamless: 'NOAA',
  meteofrance_seamless: 'Météo-France',
  italia_meteo_arpae_icon_2i: 'ItaliaMeteo-ARPAE',
  icon_d2: 'DWD',
  meteoswiss_icon_ch1: 'MeteoSwiss',
  meteoswiss_icon_ch2: 'MeteoSwiss',
  meteofrance_arome_france_hd: 'Météo-France',
};

// Temperatures in the hour grid, at the heights of the wind rows: 2 m at the launch, and these
// heights AMSL, interpolated per model from the pressure levels below (temperature and geopotential height).
export const TEMP_HEIGHTS_M = [1000, 1500, 3000];
export const TEMP_LEVELS_HPA = [925, 900, 850, 800, 700, 600];

export const FOEHN_MODELS = ['ecmwf_ifs025', 'icon_seamless'];
export const ENSEMBLE_MODEL = 'ecmwf_ifs025';

export const DATA_URL =
  'https://api.github.com/repos/tfroidcoeur/bassano-forecast/contents/data/forecast.json?ref=claude/forecast-data';
export const DATA_URL_FALLBACK =
  'https://raw.githubusercontent.com/tfroidcoeur/bassano-forecast/claude/forecast-data/data/forecast.json';

export const TIMEZONE = 'Europe/Rome'; // display: local time of the site
export const API_TIMEZONE = 'GMT'; // requests: one offset per response breaks across the clock change, so convert in lib/time.js
