import { formatSpeed, windBand } from '../lib/wind.js';
import { levelFor } from '../lib/score.js';
import { LIMITS, FOEHN, ALL_MODELS, CONSENSUS_MODELS, MODEL_NAMES } from '../lib/config.js';
import { wmoGroup, WMO_LABELS, WMO_SHAPES } from '../lib/icons.js';
import { el, arrowSvg, iconSvg } from './dom.js';

const DASH = '–';
const SCORE_WORDS = { green: 'good', amber: 'marginal', red: 'no' };

function windCell(speed, dir, row, unit) {
  if (!Number.isFinite(speed)) return el('td', {}, DASH);
  const wrap = el('span', { class: 'wind' });
  if (Number.isFinite(dir)) wrap.append(arrowSvg(dir));
  wrap.append(el('span', { text: String(formatSpeed(speed, unit)) }));
  return el('td', { class: `band band-${windBand(row, speed)}` }, wrap);
}

function valueCell(value, cls = '') {
  return el('td', { class: cls }, value === null || value === undefined ? DASH : String(value));
}

function weatherCell(code) {
  const group = wmoGroup(code);
  if (!group) return el('td', {}, DASH);
  return el('td', { class: 'wx-cell' }, iconSvg(group, WMO_SHAPES[group], WMO_LABELS[group]));
}

function levelCell(value, limit, unit) {
  if (!Number.isFinite(value)) return el('td', {}, DASH);
  const level = levelFor(Math.max(0, value), limit);
  return el('td', { class: `lvl lvl-${level}` }, String(formatSpeed(Math.max(0, value), unit)));
}

/**
 * Hourly consensus table. cols: [{ label, c, score }], c = consensus hour or null,
 * score = 'green' | 'amber' | 'red' | null.
 */
export function hourlyTable(cols, unit) {
  const rows = [
    ['Weather', (c) => weatherCell(c.wx)],
    ['10 m wind', (c) => windCell(c.ws10, c.wd10, 'wind', unit)],
    ['10 m gust', (c) => valueCell(formatSpeed(c.gust, unit), Number.isFinite(c.gust) ? `band band-${windBand('gust', c.gust)}` : '')],
    ['Launch ~1000 m', (c) => windCell(c.launch?.speed, c.launch?.dir, 'aloft', unit)],
    ['850 hPa ~1500 m', (c) => windCell(c.aloft850.speed, c.aloft850.dir, 'aloft', unit)],
    ['700 hPa ~3000 m', (c) => windCell(c.aloft700.speed, c.aloft700.dir, 'aloft', unit)],
    ['North 850/700', (c) => levelCell(c.north, LIMITS.north, unit)],
    ['Rain mm', (c) => valueCell(Number.isFinite(c.precipMm) ? c.precipMm.toFixed(1) : null, c.precipMm >= FOEHN.rainMm ? 'lvl lvl-no' : '')],
    ['Low cloud %', (c) => valueCell(Number.isFinite(c.cloudLow) ? Math.round(c.cloudLow) : null)],
    ['Ceiling m', (c) => valueCell(Number.isFinite(c.ceiling) ? Math.round(c.ceiling / 10) * 10 : null)],
  ];
  const head = el('tr', {}, el('th', { scope: 'col', text: 'Hour' }), ...cols.map((col) => el('th', { scope: 'col', text: col.label })));
  const body = rows.map(([label, cell]) =>
    el(
      'tr',
      {},
      el('th', { scope: 'row', text: label }),
      ...cols.map((col) => (col.c ? cell(col.c) : el('td', {}, DASH)))
    )
  );
  const score = el(
    'tr',
    { class: 'score-row' },
    el('th', { scope: 'row', text: 'Score' }),
    ...cols.map((col) => {
      const cls = col.score ? `score score-${col.score}` : 'score';
      return el('td', { class: cls }, col.score ? SCORE_WORDS[col.score] : DASH);
    })
  );
  return el(
    'table',
    { class: 'hourly' },
    el('thead', {}, head),
    el('tbody', {}, ...body, score)
  );
}

/**
 * Per-model 10 m wind table. cols: [{ label, all }], all = modelHour objects in ALL_MODELS order.
 */
export function modelTable(cols, unit) {
  const head = el('tr', {}, el('th', { scope: 'col', text: 'Model' }), ...cols.map((col) => el('th', { scope: 'col', text: col.label })));
  const body = ALL_MODELS.map((model, k) =>
    el(
      'tr',
      { class: CONSENSUS_MODELS.includes(model) ? 'consensus' : 'extra' },
      el('th', { scope: 'row', text: MODEL_NAMES[model] }),
      ...cols.map((col) => {
        const m = col.all?.[k];
        if (!m || !Number.isFinite(m.ws10)) return el('td', {}, DASH);
        const cell = el('td', { class: `band band-${windBand('wind', m.ws10)}` });
        const wrap = el('span', { class: 'wind' });
        if (Number.isFinite(m.wd10)) wrap.append(arrowSvg(m.wd10));
        const gust = Number.isFinite(m.gust) ? ` (${formatSpeed(m.gust, unit)})` : '';
        wrap.append(el('span', { text: `${formatSpeed(m.ws10, unit)}${gust}` }));
        cell.append(wrap);
        return cell;
      })
    )
  );
  return el('table', { class: 'models' }, el('thead', {}, head), el('tbody', {}, ...body));
}
