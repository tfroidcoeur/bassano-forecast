// Windy-style colour bands, in knots (as the club plugin does), so the unit switch never changes a colour.
export const EDGES = {
  wind: [4, 7, 10, 12, 14],
  gust: [7, 10, 13, 14.5, 16],
  aloft: [5, 9, 13, 15.5, 18],
};

export function kmhToKt(kmh) {
  return kmh / 1.852;
}

/** Band 0-5. A value equal to an edge stays in the lower band. */
export function windBand(row, kmh) {
  const kt = kmhToKt(kmh);
  return EDGES[row].filter((edge) => kt > edge).length;
}

export function formatSpeed(kmh, unit) {
  if (!Number.isFinite(kmh)) return null;
  return unit === 'kt' ? Math.round(kmhToKt(kmh)) : Math.round(kmh);
}

/** Northerly component (positive = wind from the north), km/h. */
export function northComponent(speed, dirFrom) {
  if (!Number.isFinite(speed) || !Number.isFinite(dirFrom)) return null;
  return speed * Math.cos((dirFrom * Math.PI) / 180);
}

export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** Mean direction in degrees (0-360), direction the wind comes from. */
export function circularMean(dirs) {
  let x = 0;
  let y = 0;
  let n = 0;
  for (const d of dirs) {
    if (!Number.isFinite(d)) continue;
    x += Math.sin((d * Math.PI) / 180);
    y += Math.cos((d * Math.PI) / 180);
    n++;
  }
  if (!n) return null;
  return (((Math.atan2(x, y) * 180) / Math.PI) + 360) % 360;
}
