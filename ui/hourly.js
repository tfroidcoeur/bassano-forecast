import { formatSpeed, windBand } from '../lib/wind.js';
import { levelFor } from '../lib/score.js';
import { LIMITS, FOEHN, CONSENSUS_MODELS } from '../lib/config.js';
import { wmoGroup, WMO_LABELS, WMO_SHAPES } from '../lib/icons.js';
import { barPct, ceilingHundreds, maxAngleDeviation, minMax } from '../lib/layout.js';
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

/** Consensus-model values of one hour, for the spread rows. */
function consensusOf(col, pick) {
  return (col.all ?? []).filter((m) => CONSENSUS_MODELS.includes(m.model)).map(pick);
}

/** The extra rows of the "More values" block. Every value is a plain cell; nothing is interactive. */
function moreRows(unit) {
  const u = unitLabel(unit);
  return [
    ['Cloud %', (c) => (Number.isFinite(c.cloudLow) ? String(Math.round(c.cloudLow)) : DASH)],
    ['Rain mm', (c) => (Number.isFinite(c.precipMm) ? c.precipMm.toFixed(1) : DASH)],
    [
      'Spr 10 m',
      (c, col) => {
        const s = minMax(consensusOf(col, (m) => m.ws10));
        return s ? `${speedText(s.min, unit)}–${speedText(s.max, unit)}` : DASH;
      },
    ],
    [
      'Spr dir',
      (c, col) => {
        const d = maxAngleDeviation(consensusOf(col, (m) => m.wd10));
        return d === null ? DASH : `±${Math.round(d)}`;
      },
    ],
    [
      'Spr gust',
      (c, col) => {
        const s = minMax(consensusOf(col, (m) => m.gust));
        return s ? `${speedText(s.min, unit)}–${speedText(s.max, unit)}` : DASH;
      },
    ],
  ];
}

/**
 * Compact hourly grid: hours as columns, no scrolling, no interactive cells. cols: [{ label, c, score, all }].
 * showMore adds the extra rows. Heights in metres; ceiling in hundreds of metres.
 */
export function hourGrid(cols, unit, showMore = false) {
  const head = el('tr', {}, el('th', { scope: 'col', class: 'lbl', text: 'Hour' }), ...cols.map((col) => el('th', { scope: 'col', text: col.label })));
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
  if (showMore) {
    for (const [label, text] of moreRows(unit)) {
      body.push(
        el(
          'tr',
          { class: 'more-row' },
          el('th', { scope: 'row', class: 'lbl', text: label }),
          ...cols.map((col) => (col.c ? el('td', { text: text(col.c, col) }) : el('td', {}, DASH)))
        )
      );
    }
  }
  return el('table', { class: 'grid', id: 'hour-grid' }, el('thead', {}, head), el('tbody', {}, ...body));
}

/**
 * Hour strip: one visual segment per hour, coloured by score. Segments in the verdict window carry an outline.
 * Not interactive: the image has one summary label.
 */
export function hourStripEl(segments) {
  const words = segments.map((s) => `${String(s.hour).padStart(2, '0')} ${SCORE_WORDS[s.score] ?? 'no data'}`);
  const inWindow = segments.filter((s) => s.inWindow).map((s) => s.hour);
  const windowText = inWindow.length ? `; verdict window ${String(inWindow[0]).padStart(2, '0')} to ${String(inWindow.at(-1) + 1).padStart(2, '0')}:00` : '';
  const strip = el('div', { class: 'strip', role: 'img', 'aria-label': `Hour scores: ${words.join(', ')}${windowText}` });
  for (const s of segments) {
    strip.append(el('span', { class: `seg score-${s.score ?? 'none'}${s.inWindow ? ' in-window' : ''}`, 'aria-hidden': 'true', text: String(s.hour).padStart(2, '0') }));
  }
  return strip;
}
