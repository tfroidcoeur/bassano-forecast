import { makeScale, pathFromPoints, bandPath } from '../lib/chart.js';
import { wallHours, romeWall, addDays, dayLabel } from '../lib/time.js';
import { svgEl, el } from './dom.js';
import { t } from '../lib/i18n.js';

const W = 420;
const H = 260;
const PAD = { l: 36, r: 8, t: 10, b: 42 };
const sign = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);

/**
 * Foehn index chart between two wall-clock times ('YYYY-MM-DDTHH:MM').
 * opt: { from, to, series, ensemble, ensembleAfter, compact, idPrefix }
 *  - series: { time, biEcmwf, biIcon, zlEcmwf }
 *  - ensemble: { time, p10, p50, p90 } or null; drawn only after `ensembleAfter`
 */
export function foehnChartSvg(opt) {
  const t0 = wallHours(opt.from);
  const t1 = wallHours(opt.to);
  const inRange = (wall) => {
    const t = wallHours(wall);
    return t >= t0 && t <= t1;
  };
  const pts = (time, values) => time.map((w, i) => (inRange(w) && Number.isFinite(values[i]) ? [w, values[i]] : null));

  const lines = {
    biEcmwf: pts(opt.series.time, opt.series.biEcmwf),
    biIcon: pts(opt.series.time, opt.series.biIcon),
    zlEcmwf: pts(opt.series.time, opt.series.zlEcmwf),
  };
  const ens = opt.ensemble;
  const ensIdx = ens ? ens.time.map((w, i) => i).filter((i) => inRange(ens.time[i]) && ens.time[i] > opt.ensembleAfter && Number.isFinite(ens.p50[i])) : [];

  let maxAbs = 7;
  for (const arr of [lines.biEcmwf, lines.biIcon, lines.zlEcmwf]) {
    for (const p of arr) if (p) maxAbs = Math.max(maxAbs, Math.abs(p[1]));
  }
  for (const i of ensIdx) maxAbs = Math.max(maxAbs, Math.abs(ens.p10[i]), Math.abs(ens.p90[i]));
  const yMax = Math.ceil(maxAbs);

  const sc = makeScale({ t0, t1, yMax, x0: PAD.l, x1: W - PAD.r, y0: PAD.t, y1: H - PAD.b });
  const prefix = opt.idPrefix;
  const svg = svgEl('svg', {
    class: 'chart',
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-labelledby': `${prefix}-title ${prefix}-desc`,
  });
  svg.append(svgEl('title', { id: `${prefix}-title` }));
  svg.firstChild.textContent = t('chart.title');
  const desc = svgEl('desc', { id: `${prefix}-desc` });
  desc.textContent = t('chart.desc');
  svg.append(desc);

  const plotTop = sc.y(yMax);
  const plotBottom = sc.y(-yMax);
  // Shaded bands for |ΔP| 3 and 6 hPa. North (negative) is the stronger shade.
  svg.append(svgEl('rect', { class: 'band-north-strong', x: PAD.l, y: sc.y(-6), width: W - PAD.l - PAD.r, height: plotBottom - sc.y(-6) }));
  svg.append(svgEl('rect', { class: 'band-north-moderate', x: PAD.l, y: sc.y(-3), width: W - PAD.l - PAD.r, height: sc.y(-6) - sc.y(-3) }));
  svg.append(svgEl('rect', { class: 'band-south-moderate', x: PAD.l, y: sc.y(6), width: W - PAD.l - PAD.r, height: sc.y(3) - sc.y(6) }));
  svg.append(svgEl('rect', { class: 'band-south-strong', x: PAD.l, y: sc.y(yMax), width: W - PAD.l - PAD.r, height: sc.y(6) - sc.y(yMax) }));

  // Zero line and y ticks.
  svg.append(svgEl('line', { class: 'zero', x1: PAD.l, x2: W - PAD.r, y1: sc.y(0), y2: sc.y(0) }));
  for (const v of [-6, -3, 0, 3, 6]) {
    const t = svgEl('text', { class: 'tick', x: PAD.l - 4, y: sc.y(v) + 4, 'text-anchor': 'end' });
    t.textContent = v === 0 ? '0' : sign(v);
    svg.append(t);
  }
  const nModerate = svgEl('text', { class: 'band-label', x: PAD.l + 4, y: sc.y(-3.6) });
  nModerate.textContent = t('chart.bandModerate');
  const nStrong = svgEl('text', { class: 'band-label', x: PAD.l + 4, y: sc.y(-6.6) });
  nStrong.textContent = t('chart.bandStrong');
  svg.append(nModerate, nStrong);

  // Midnights and day labels.
  const firstDay = opt.from.slice(0, 10);
  const lastDay = opt.to.slice(0, 10);
  for (let d = firstDay, guard = 0; d <= lastDay && guard < 40; d = addDays(d, 1), guard++) {
    const wall = `${d}T00:00`;
    if (!inRange(wall) || d === firstDay) continue;
    svg.append(svgEl('line', { class: 'day-sep', x1: sc.x(wallHours(wall)), x2: sc.x(wallHours(wall)), y1: PAD.t, y2: H - PAD.b }));
  }
  for (let d = firstDay, guard = 0; d <= lastDay && guard < 40; d = addDays(d, 1), guard++) {
    const mid = `${d}T12:00`;
    if (!inRange(mid)) continue;
    const label = svgEl('text', { class: 'day-label', x: sc.x(wallHours(mid)), y: H - PAD.b + 16, 'text-anchor': 'middle' });
    label.textContent = opt.compact ? String(Number(d.slice(8, 10))) : dayLabel(d);
    svg.append(label);
  }

  // Ensemble band (beyond the deterministic range) and median.
  if (ensIdx.length > 1) {
    const top = ensIdx.map((i) => [sc.x(wallHours(ens.time[i])), sc.y(ens.p90[i])]);
    const bottom = ensIdx.map((i) => [sc.x(wallHours(ens.time[i])), sc.y(ens.p10[i])]);
    svg.append(svgEl('path', { class: 'ens-band', d: bandPath(top, bottom) }));
    const median = ensIdx.map((i) => [sc.x(wallHours(ens.time[i])), sc.y(ens.p50[i])]);
    svg.append(svgEl('path', { class: 'ens-median', d: pathFromPoints(median), fill: 'none' }));
  }

  const series = (key, cls) => {
    const d = pathFromPoints(lines[key].map((p) => (p ? [sc.x(wallHours(p[0])), sc.y(p[1])] : null)));
    if (d) svg.append(svgEl('path', { class: cls, d, fill: 'none' }));
  };
  series('zlEcmwf', 'series-zl');
  series('biIcon', 'series-bi-icon');
  series('biEcmwf', 'series-bi-ecmwf');

  // "now" marker
  const nowWall = romeWall();
  if (inRange(nowWall)) {
    const x = sc.x(wallHours(nowWall));
    svg.append(svgEl('line', { class: 'now', x1: x, x2: x, y1: PAD.t, y2: H - PAD.b }));
    const label = svgEl('text', { class: 'now-label', x: x + 3, y: PAD.t + 10 });
    label.textContent = t('chart.now');
    svg.append(label);
  }
  return svg;
}

/** Legend for the foehn chart. */
export function foehnLegend() {
  return el(
    'div',
    { class: 'legend' },
    el('p', { class: 'legend-note', text: t('chart.negative') }),
    el(
      'ul',
      { class: 'legend-items' },
      el('li', {}, el('span', { class: 'key key-ecmwf', 'aria-hidden': 'true' }), t('chart.keyEcmwf')),
      el('li', {}, el('span', { class: 'key key-icon', 'aria-hidden': 'true' }), t('chart.keyIcon')),
      el('li', {}, el('span', { class: 'key key-zl', 'aria-hidden': 'true' }), t('chart.keyZl')),
      el('li', {}, el('span', { class: 'key key-ens', 'aria-hidden': 'true' }), t('chart.keyEns')),
      el('li', {}, el('span', { class: 'key key-band', 'aria-hidden': 'true' }), t('chart.keyBand'))
    )
  );
}
