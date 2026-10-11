// WMO weather code -> icon group, and the icon shapes (ported from the club plugin's sprite).
// Shapes are plain descriptors: { t: tag, a: attributes, c: children }. ui/dom.js turns them into SVG nodes.

export const WMO_GROUPS = {
  0: 'clear',
  1: 'clear',
  2: 'partly',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  56: 'drizzle',
  57: 'drizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  66: 'rain',
  67: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'showers',
  81: 'showers',
  82: 'showers',
  85: 'snow',
  86: 'snow',
  95: 'thunder',
  96: 'thunder',
  99: 'thunder',
};

export const WMO_LABELS = {
  clear: 'Sunny',
  partly: 'Partly cloudy',
  overcast: 'Overcast',
  fog: 'Fog',
  drizzle: 'Drizzle',
  rain: 'Rain',
  showers: 'Showers',
  snow: 'Snow',
  thunder: 'Thunderstorm',
};

/** Group name for a WMO code, or null. */
export function wmoGroup(code) {
  if (!Number.isFinite(code)) return null;
  return WMO_GROUPS[code] ?? null;
}

const SUN_RAYS = {
  t: 'path',
  a: {
    d: 'M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5',
    fill: 'none',
    stroke: '#f5b400',
    'stroke-width': '1.6',
    'stroke-linecap': 'round',
  },
};
const SUN = [{ t: 'circle', a: { cx: 12, cy: 12, r: 4.5, fill: '#f5b400' } }, SUN_RAYS];
const SMALL_SUN = { t: 'g', a: { transform: 'translate(-3 -4) scale(.75)' }, c: SUN };
const CLOUD_D = 'M6.5 19h11a4.5 4.5 0 0 0 .6-8.96A6 6 0 0 0 6.6 11 4 4 0 0 0 6.5 19z';
const CLOUD = { t: 'path', a: { d: CLOUD_D, fill: '#d5dbe2', stroke: '#8a96a3', 'stroke-width': '1' } };
const DARK_CLOUD = { t: 'path', a: { d: CLOUD_D, fill: '#9aa5b1', stroke: '#5f6b78', 'stroke-width': '1' } };
const CLOUD_HIGH = { t: 'g', a: { transform: 'translate(0 -4)' }, c: [CLOUD] };
const RAIN_LINES = {
  t: 'path',
  a: { d: 'M8.5 17.5l-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3', fill: 'none', stroke: '#2b7bd6', 'stroke-width': '1.6', 'stroke-linecap': 'round' },
};
const DROPS = {
  t: 'g',
  a: { fill: '#2b7bd6' },
  c: [
    { t: 'circle', a: { cx: 8.5, cy: 18.5, r: 1 } },
    { t: 'circle', a: { cx: 12.5, cy: 19.5, r: 1 } },
    { t: 'circle', a: { cx: 16.5, cy: 18.5, r: 1 } },
  ],
};
const FLAKES = {
  t: 'g',
  a: { fill: '#7fb2e5' },
  c: [
    { t: 'circle', a: { cx: 8.5, cy: 18.5, r: 1.3 } },
    { t: 'circle', a: { cx: 12.5, cy: 20, r: 1.3 } },
    { t: 'circle', a: { cx: 16.5, cy: 18.5, r: 1.3 } },
  ],
};

export const WMO_SHAPES = {
  clear: SUN,
  partly: [SMALL_SUN, CLOUD],
  overcast: [CLOUD],
  fog: [{ t: 'path', a: { d: 'M4 8h16M6 12h12M4 16h16', fill: 'none', stroke: '#8a96a3', 'stroke-width': '1.8', 'stroke-linecap': 'round' } }],
  drizzle: [CLOUD_HIGH, DROPS],
  rain: [CLOUD_HIGH, RAIN_LINES],
  showers: [SMALL_SUN, CLOUD_HIGH, RAIN_LINES],
  snow: [CLOUD_HIGH, FLAKES],
  thunder: [
    { t: 'g', a: { transform: 'translate(0 -4)' }, c: [DARK_CLOUD] },
    { t: 'path', a: { d: 'M12.5 13l-3 5h2.5l-1.5 4.5 4.5-6h-2.6l1.6-3.5z', fill: '#f5b400' } },
  ],
};
