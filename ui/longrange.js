import { bandPath, pathFromPoints } from '../lib/chart.js';
import { compass } from '../lib/longrange.js';
import { barPct, niceMax, rangeBox, speedIn } from '../lib/layout.js';
import { dayLabel, romeWall } from '../lib/time.js';
import { el, svgEl } from './dom.js';

const DASH = '–';
const LOW_CONFIDENCE_FROM = 6; // index: days 6–14 ahead are lower confidence
const W = 420;
const H = 214;
const PAD_L = 34;
const PAD_R = 6;
const WIND_TOP = 10;
const WIND_BOT = 124;
const RAIN_TOP = 134;
const RAIN_BOT = 172;
const LABEL_Y = 190;

const pct = (p) => `${Math.round(p * 100)} %`;
const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)}`;
const rounded = (kmh, unit) => Math.round(speedIn(kmh, unit));

/** Chart of the 14 days: median 1500 m and 3000 m wind with p10–p90 bands, rain chance bars below. */
function chartSvg(rows, unit, yMax) {
  const n = rows.length;
  const colW = (W - PAD_L - PAD_R) / n;
  const x = (i) => PAD_L + (i + 0.5) * colW;
  const y = (v) => WIND_BOT - (Math.min(Math.max(v, 0), yMax) / yMax) * (WIND_BOT - WIND_TOP);
  const svg = svgEl('svg', { class: 'lr-chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-labelledby': 'lr-title lr-desc' });
  svg.append(svgEl('title', { id: 'lr-title' }));
  svg.firstChild.textContent = 'Long-range wind and rain chance, 14 days';
  const desc = svgEl('desc', { id: 'lr-desc' });
  desc.textContent = 'Median 1500 m and 3000 m wind with shaded p10 to p90 bands, and a rain chance bar per day. Days from 6 ahead are faded.';
  svg.append(desc);

  svg.append(svgEl('rect', { class: 'lr-far-bg', x: PAD_L + LOW_CONFIDENCE_FROM * colW, y: WIND_TOP, width: (n - LOW_CONFIDENCE_FROM) * colW, height: RAIN_BOT - WIND_TOP }));
  for (const v of [0, yMax / 2, yMax]) {
    svg.append(svgEl('line', { class: 'lr-grid', x1: PAD_L, x2: W - PAD_R, y1: y(v), y2: y(v) }));
    const t = svgEl('text', { class: 'lr-tick', x: PAD_L - 4, y: y(v) + 4, 'text-anchor': 'end' });
    t.textContent = String(Math.round(v));
    svg.append(t);
  }

  for (const [key, cls] of [
    ['aloft850', 'l1500'],
    ['aloft700', 'l3000'],
  ]) {
    const valid = rows.map((r, i) => [i, r[key]]).filter(([, l]) => l);
    if (valid.length > 1) {
      const top = valid.map(([i, l]) => [x(i), y(speedIn(l.p90, unit))]);
      const bottom = valid.map(([i, l]) => [x(i), y(speedIn(l.p10, unit))]);
      svg.append(svgEl('path', { class: `lr-band ${cls}`, d: bandPath(top, bottom) }));
    }
    const med = rows.map((r, i) => (r[key] ? [x(i), y(speedIn(r[key].p50, unit))] : null));
    const d = pathFromPoints(med);
    if (d) svg.append(svgEl('path', { class: `lr-med ${cls}`, d, fill: 'none' }));
  }

  rows.forEach((r, i) => {
    if (!Number.isFinite(r.rain)) return;
    const h = r.rain * (RAIN_BOT - RAIN_TOP);
    svg.append(svgEl('rect', { class: 'lr-rain', x: x(i) - colW * 0.3, y: RAIN_BOT - h, width: colW * 0.6, height: h }));
  });

  rows.forEach((r, i) => {
    const t = svgEl('text', { class: 'lr-day', x: x(i), y: LABEL_Y, 'text-anchor': 'middle' });
    t.textContent = String(Number(r.date.slice(8, 10)));
    svg.append(t);
  });

  // "now": position within today's column, from the Italian clock.
  const wall = romeWall();
  const hour = Number(wall.slice(11, 13)) + Number(wall.slice(14, 16)) / 60;
  const nowX = PAD_L + (hour / 24) * colW;
  svg.append(svgEl('line', { class: 'lr-now', x1: nowX, x2: nowX, y1: WIND_TOP, y2: RAIN_BOT }));
  const label = svgEl('text', { class: 'lr-now-label', x: nowX + 3, y: WIND_TOP + 9 });
  label.textContent = 'now';
  svg.append(label);
  return svg;
}

function legend() {
  return el(
    'div',
    { class: 'legend' },
    el(
      'ul',
      { class: 'legend-items' },
      el('li', {}, el('span', { class: 'key key-med-solid', 'aria-hidden': 'true' }), '1500 m median (≈850 hPa)'),
      el('li', {}, el('span', { class: 'key key-med-dash', 'aria-hidden': 'true' }), '3000 m median (≈700 hPa)'),
      el('li', {}, el('span', { class: 'key key-band-ens', 'aria-hidden': 'true' }), 'p10–p90 band'),
      el('li', {}, el('span', { class: 'key key-rain', 'aria-hidden': 'true' }), 'rain chance, ≥1 mm'),
      el('li', {}, el('span', { class: 'key key-far', 'aria-hidden': 'true' }), 'faded: 6+ days ahead')
    ),
    el('p', { class: 'legend-note', text: 'Wind and rain 09–17 local. Km/h or kt as set in the menu.' })
  );
}

/** Track with a bar from 0 to value (0–1 scale for rain). */
function rainBar(p) {
  const svg = svgEl('svg', { class: 'lr-bar', viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
  svg.append(svgEl('rect', { class: 'lr-track', x: 0, y: 2, width: 100, height: 6 }));
  const w = barPct(p, 1);
  if (w) svg.append(svgEl('rect', { class: 'lr-fill-rain', x: 0, y: 2, width: w, height: 6 }));
  return svg;
}

/** Range bar on a shared scale: p10–p90 band and a median tick. */
function levelBar(level, unit, max) {
  const svg = svgEl('svg', { class: 'lr-bar', viewBox: '0 0 100 10', preserveAspectRatio: 'none', 'aria-hidden': 'true', focusable: 'false' });
  svg.append(svgEl('rect', { class: 'lr-track', x: 0, y: 2, width: 100, height: 6 }));
  const box = rangeBox({ p10: speedIn(level.p10, unit), p50: speedIn(level.p50, unit), p90: speedIn(level.p90, unit) }, max);
  if (box) {
    svg.append(svgEl('rect', { class: 'lr-fill-wind', x: box.lo, y: 2, width: Math.max(0.5, box.hi - box.lo), height: 6 }));
    svg.append(svgEl('rect', { class: 'lr-tick', x: box.mid - 0.6, y: 0, width: 1.2, height: 10 }));
  }
  return svg;
}

function row(label, bar, value) {
  const v = el('span', { class: 'lr-v' });
  if (typeof value === 'string') v.textContent = value;
  else if (value) v.append(value);
  return el('div', { class: 'lr-row' }, el('span', { class: 'lr-k', text: label }), bar ?? el('span', {}), v);
}

function levelRow(label, level, unit, max) {
  if (!level) return row(label, null, DASH);
  const dir = compass(level.dir);
  const text = `${rounded(level.p50, unit)} (${rounded(level.p10, unit)}–${rounded(level.p90, unit)})${dir ? ` ${dir}` : ''}`;
  return row(label, levelBar(level, unit, max), text);
}

function dayCard(r, i, unit, max) {
  const far = i >= LOW_CONFIDENCE_FROM;
  const northCls = r.north >= 0.6 ? 'lvl lvl-no' : r.north >= 0.3 ? 'lvl lvl-marginal' : '';
  return el(
    'li',
    { class: far ? 'lr-card far' : 'lr-card' },
    el('h3', { text: dayLabel(r.date) }),
    row('Rain ≥1 mm', Number.isFinite(r.rain) ? rainBar(r.rain) : null, Number.isFinite(r.rain) ? pct(r.rain) : DASH),
    levelRow('1500 m', r.aloft850, unit, max),
    levelRow('3000 m', r.aloft700, unit, max),
    row('N-flow', null, Number.isFinite(r.north) ? el('span', { class: northCls, text: pct(r.north) }) : DASH),
    row('Foehn hPa', null, r.foehn ? `${signed(r.foehn.p50)} (${signed(r.foehn.p10)}/${signed(r.foehn.p90)})` : DASH),
    row('Temp °C', null, r.temp ? `${Math.round(r.temp.min)} / ${Math.round(r.temp.max)}` : DASH)
  );
}

/**
 * Long-range view: the 14-day chart, its legend, then one card per day. rows from longRangeRows, in date order.
 * Heights: 1500 m ≈ 850 hPa, 3000 m ≈ 700 hPa. Foehn stays in hPa (a pressure difference).
 */
export function longRangeView(rows, unit) {
  const max = niceMax(rows.flatMap((r) => [r.aloft850, r.aloft700]).filter(Boolean).map((l) => speedIn(l.p90, unit)), unit === 'kt' ? 3 : 10);
  return el(
    'div',
    { class: 'lr' },
    chartSvg(rows, unit, max),
    legend(),
    el('ol', { class: 'lr-cards' }, ...rows.map((r, i) => dayCard(r, i, unit, max)))
  );
}
