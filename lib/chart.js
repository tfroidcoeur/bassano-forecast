// Pure geometry for the foehn chart. The SVG itself is built in ui/chart.js.

/** Linear maps from hours (x) and hPa (y) to the plot box. y is symmetric around 0. */
export function makeScale({ t0, t1, yMax, x0, x1, y0, y1 }) {
  return {
    x: (t) => x0 + ((t - t0) / (t1 - t0)) * (x1 - x0),
    y: (dp) => y0 + ((yMax - dp) / (2 * yMax)) * (y1 - y0),
  };
}

const f = (n) => Number(n).toFixed(1);

/** SVG path data from [x, y] points; a null point lifts the pen. */
export function pathFromPoints(points) {
  let d = '';
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    d += `${pen ? 'L' : 'M'}${f(p[0])} ${f(p[1])}`;
    pen = true;
  }
  return d;
}

/** Closed band: top points left to right, bottom points right to left. */
export function bandPath(top, bottom) {
  if (!top.length || !bottom.length) return '';
  const back = [...bottom].reverse();
  return `${pathFromPoints(top)}${pathFromPoints(back).replace(/^M/, 'L')}Z`;
}
