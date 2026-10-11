import { formatSpeed, windBand } from '../lib/wind.js';
import { levelFor } from '../lib/score.js';
import { LIMITS, FOEHN, CONSENSUS_MODELS } from '../lib/config.js';
import { wmoGroup, WMO_LABELS, WMO_SHAPES } from '../lib/icons.js';
import { compass } from '../lib/longrange.js';
import { barPct, ceilingHundreds, minMax } from '../lib/layout.js';
import { el, svgEl, arrowSvg, iconSvg } from './dom.js';

const DASH = '–';
const SCORE_WORDS = { green: 'good', amber: 'marginal', red: 'no' };
const RAIN_BAR_MAX_MM = 4;

const unitLabel = (unit) => (unit === 'kt' ? 'kt' : 'km/h');

function speedText(kmh, unit) {
  const v = formatSpeed(kmh, unit);
  return v === null ? DASH : String(v);
}

/** Speed with its arrow (direction the wind comes from). Dash when unknown. */
function windCell(speed, dir, row, unit) {
  if (!Number.isFinite(speed)) return el('td', {}, DASH);
  const wrap = el('span', { class: 'wind' });
  if (Number.isFinite(dir)) wrap.append(arrowSvg(dir));
  wrap.append(el('span', { text: speedText(speed, unit) }));
  return el('td', { class: `band band-${windBand(row, speed)}` }, wrap);
}

function plainCell(speed, row, unit) {
  if (!Number.isFinite(speed)) return el('td', {}, DASH);
  return el('td', { class: `band band-${windBand(row, speed)}` }, speedText(speed, unit));
}

function northCell(value, unit) {
  if (!Number.isFinite(value)) return el('td', {}, DASH);
  const v = Math.max(0, value);
  return el('td', { class: `lvl lvl-${levelFor(v, LIMITS.north)}` }, speedText(v, unit));
}

function rainCell(mm) {
  if (!Number.isFinite(mm)) return el('td', {}, DASH);
  const w = barPct(mm, RAIN_BAR_MAX_MM) ?? 0;
  const bar = svgEl('svg', { class: 'rain-bar', viewBox: '0 0 30 6', 'aria-hidden': 'true', focusable: 'false' });
  bar.append(svgEl('rect', { class: 'rain-track', x: 0, y: 0, width: 30, height: 6, rx: 3 }));
  if (w > 0) bar.append(svgEl('rect', { class: 'rain-fill', x: 0, y: 0, width: (w / 100) * 30, height: 6, rx: 3 }));
  const cell = el('td', { class: mm >= FOEHN.rainMm ? 'rain-wet' : '' }, bar);
  if (mm >= 0.1) cell.append(el('span', { class: 'rain-num', text: mm.toFixed(1) }));
  return cell;
}

function weatherCell(code) {
  const group = wmoGroup(code);
  if (!group) return el('td', {}, DASH);
  return el('td', { class: 'wx-cell' }, iconSvg(group, WMO_SHAPES[group], WMO_LABELS[group]));
}

/** Accessible label for an hour: every value, with units. */
export function hourAriaLabel(col, unit) {
  const head = `${col.label}:00`;
  const c = col.c;
  if (!c) return `${head}, no data`;
  const u = unitLabel(unit);
  const parts = [
    `score ${SCORE_WORDS[col.score] ?? 'unknown'}`,
    `10 m ${speedText(c.ws10, unit)} ${u}`,
    `gust ${speedText(c.gust, unit)} ${u}`,
    `1000 m ${speedText(c.launch?.speed, unit)} ${u}`,
    `1500 m ${speedText(c.aloft850.speed, unit)} ${u}`,
    `3000 m ${speedText(c.aloft700.speed, unit)} ${u}`,
    `rain ${Number.isFinite(c.precipMm) ? c.precipMm.toFixed(1) : DASH} mm`,
  ];
  return `${head}, ${parts.join(', ')}`;
}

/**
 * Compact hourly grid: hours as columns, no scrolling. cols: [{ label, c, score, all }].
 * onPick(index) opens the detail for that hour. Heights in metres; ceiling in hundreds of metres.
 */
export function hourGrid(cols, unit, onPick) {
  const head = el(
    'tr',
    {},
    el('th', { scope: 'col', class: 'lbl', text: 'Hour' }),
    ...cols.map((col) =>
      el('th', { scope: 'col' }, el('button', { type: 'button', class: 'hbtn', 'aria-label': hourAriaLabel(col, unit), text: col.label }))
    )
  );
  const rows = [
    ['Wx', (c) => weatherCell(c.wx)],
    ['10 m', (c) => windCell(c.ws10, c.wd10, 'wind', unit)],
    ['Gust', (c) => plainCell(c.gust, 'gust', unit)],
    ['1000 m', (c) => windCell(c.launch?.speed, c.launch?.dir, 'aloft', unit)],
    ['1500 m', (c) => windCell(c.aloft850.speed, c.aloft850.dir, 'aloft', unit)],
    ['3000 m', (c) => windCell(c.aloft700.speed, c.aloft700.dir, 'aloft', unit)],
    ['N-flow', (c) => northCell(c.north, unit)],
    ['Rain', (c) => rainCell(c.precipMm)],
    ['Ceiling', (c) => el('td', {}, Number.isFinite(c.ceiling) ? String(ceilingHundreds(c.ceiling)) : DASH)],
  ];
  const body = rows.map(([label, cell]) =>
    el('tr', {}, el('th', { scope: 'row', class: 'lbl', text: label }), ...cols.map((col) => (col.c ? cell(col.c) : el('td', {}, DASH))))
  );
  const table = el('table', { class: 'grid' }, el('thead', {}, head), el('tbody', {}, ...body));
  table.querySelectorAll('button.hbtn').forEach((btn, k) => btn.addEventListener('click', () => onPick(k)));
  return table;
}

/** Hour strip: one segment per hour, coloured by score; segments inside the verdict window are outlined. */
export function hourStripEl(segments, onPick) {
  const strip = el('div', { class: 'strip' });
  segments.forEach((s, k) => {
    const word = SCORE_WORDS[s.score] ?? 'no data';
    const label = `${String(s.hour).padStart(2, '0')}:00, ${word}${s.inWindow ? ', in the verdict window' : ''}`;
    const btn = el('button', { type: 'button', class: `seg score-${s.score ?? 'none'}${s.inWindow ? ' in-window' : ''}`, 'aria-label': label, text: String(s.hour).padStart(2, '0') });
    btn.addEventListener('click', () => onPick(k));
    strip.append(btn);
  });
  return strip;
}

/** Every value for one hour, for the detail dialog. col as in hourGrid. */
export function hourDetail(col, unit) {
  const dl = el('dl', { class: 'detail' });
  const c = col.c;
  if (!c) {
    dl.append(el('dt', { text: 'Data' }), el('dd', { text: 'No data for this hour.' }));
    return dl;
  }
  const u = unitLabel(unit);
  const row = (label, value) => dl.append(el('dt', { text: label }), el('dd', { text: value }));
  const wind = (label, speed, dir) => {
    const from = Number.isFinite(dir) && compass(dir) ? ` from ${compass(dir)}` : '';
    row(label, Number.isFinite(speed) ? `${speedText(speed, unit)} ${u}${from}` : DASH);
  };
  const spread = minMax(col.all ? col.all.filter((m) => CONSENSUS_MODELS.includes(m.model)).map((m) => m.ws10) : []);
  wind('10 m wind', c.ws10, c.wd10);
  row('10 m gust', Number.isFinite(c.gust) ? `${speedText(c.gust, unit)} ${u}` : DASH);
  wind('1000 m wind', c.launch?.speed, c.launch?.dir);
  wind('1500 m wind', c.aloft850.speed, c.aloft850.dir);
  wind('3000 m wind', c.aloft700.speed, c.aloft700.dir);
  row('N-flow (north part)', Number.isFinite(c.north) ? `${speedText(Math.max(0, c.north), unit)} ${u}` : DASH);
  row('Rain', Number.isFinite(c.precipMm) ? `${c.precipMm.toFixed(1)} mm` : DASH);
  row('Low cloud', Number.isFinite(c.cloudLow) ? `${Math.round(c.cloudLow)} %` : DASH);
  row('Cloud base', Number.isFinite(c.ceiling) ? `${Math.round(c.ceiling)} m` : DASH);
  row('Weather', WMO_LABELS[wmoGroup(c.wx)] ?? DASH);
  row('10 m spread, five models', spread ? `${speedText(spread.min, unit)}–${speedText(spread.max, unit)} ${u}` : DASH);
  return dl;
}
