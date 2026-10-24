import { formatSpeed, windBand } from '../lib/wind.js';
import { levelFor, capeBand } from '../lib/score.js';
import { LIMITS, FOEHN, CONSENSUS_MODELS, TEMP_HEIGHTS_M } from '../lib/config.js';
import { wmoGroup, WMO_SHAPES } from '../lib/icons.js';
import { barPct, ceilingHundreds, maxAngleDeviation, minMax } from '../lib/layout.js';
import { el, svgEl, arrowSvg, iconSvg } from './dom.js';
import { t, formatDecimal } from '../lib/i18n.js';

const DASH = '–';
const SCORE_WORDS = { green: 'score.good', amber: 'score.marginal', red: 'score.no' };
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
  if (mm >= 0.1) cell.append(el('span', { class: 'rain-num', text: formatDecimal(mm, 1) }));
  return cell;
}

/** CAPE in J/kg, coloured by capeBand; dash when unknown. */
function capeCell(jkg) {
  const band = capeBand(jkg);
  if (band === null) return el('td', {}, DASH);
  return el('td', { class: `band band-${band}` }, String(Math.round(jkg)));
}

/** Temperature in whole °C, dash when unknown. Rounds first, so -0.4 shows 0, not -0. */
function tempCell(celsius) {
  return el('td', {}, Number.isFinite(celsius) ? formatDecimal(Math.round(celsius) + 0, 0) : DASH);
}

function weatherCell(code) {
  const group = wmoGroup(code);
  if (!group) return el('td', {}, DASH);
  return el('td', { class: 'wx-cell' }, iconSvg(group, WMO_SHAPES[group], t(`wx.${group}`)));
}

/** Consensus-model values of one hour, for the spread rows. */
function consensusOf(col, pick) {
  return (col.all ?? []).filter((m) => CONSENSUS_MODELS.includes(m.model)).map(pick);
}

/** The extra rows of the "More values" block. Every value is a plain cell; nothing is interactive. */
function moreRows(unit) {
  const u = unitLabel(unit);
  return [
    [t('more.cloud'), (c) => (Number.isFinite(c.cloudLow) ? String(Math.round(c.cloudLow)) : DASH)],
    [t('more.rainMm'), (c) => (Number.isFinite(c.precipMm) ? formatDecimal(c.precipMm, 1) : DASH)],
    [
      t('more.spr10'),
      (c, col) => {
        const s = minMax(consensusOf(col, (m) => m.ws10));
        return s ? `${speedText(s.min, unit)}–${speedText(s.max, unit)}` : DASH;
      },
    ],
    [
      t('more.sprDir'),
      (c, col) => {
        const d = maxAngleDeviation(consensusOf(col, (m) => m.wd10));
        return d === null ? DASH : `±${Math.round(d)}`;
      },
    ],
    [
      t('more.sprGust'),
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
  const head = el('tr', {}, el('th', { scope: 'col', class: 'lbl', text: t('grid.hour') }), ...cols.map((col) => el('th', { scope: 'col', text: col.label })));
  const rows = [
    [t('grid.wx'), (c) => weatherCell(c.wx)],
    [t('grid.wind10'), (c) => windCell(c.ws10, c.wd10, 'wind', unit)],
    [t('grid.gust'), (c) => plainCell(c.gust, 'gust', unit)],
    [t('grid.h1000'), (c) => windCell(c.launch?.speed, c.launch?.dir, 'aloft', unit)],
    [t('grid.h1500'), (c) => windCell(c.aloft850.speed, c.aloft850.dir, 'aloft', unit)],
    [t('grid.h3000'), (c) => windCell(c.aloft700.speed, c.aloft700.dir, 'aloft', unit)],
    [t('grid.north'), (c) => northCell(c.north, unit)],
    [t('grid.rain'), (c) => rainCell(c.precipMm)],
    [t('grid.cape'), (c) => capeCell(c.cape)],
    [t('grid.ceiling'), (c) => el('td', {}, Number.isFinite(c.ceiling) ? String(ceilingHundreds(c.ceiling)) : DASH)],
    // Temperatures at the heights of the wind rows: 2 m at the launch (with the 10 m wind), then AMSL.
    [t('grid.temp2m'), (c) => tempCell(c.t2)],
    ...TEMP_HEIGHTS_M.map((z, k) => [t('grid.temp', { height: z }), (c) => tempCell(c.temps?.[k])]),
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
  const words = segments.map((s) => `${String(s.hour).padStart(2, '0')} ${t(SCORE_WORDS[s.score] ?? 'score.noData')}`);
  const inWindow = segments.filter((s) => s.inWindow).map((s) => s.hour);
  const windowText = inWindow.length
    ? t('strip.window', { from: String(inWindow[0]).padStart(2, '0'), to: `${String(inWindow.at(-1) + 1).padStart(2, '0')}:00` })
    : '';
  const strip = el('div', { class: 'strip', role: 'img', 'aria-label': t('strip.label', { words: words.join(', '), window: windowText }) });
  for (const s of segments) {
    strip.append(el('span', { class: `seg score-${s.score ?? 'none'}${s.inWindow ? ' in-window' : ''}`, 'aria-hidden': 'true', text: String(s.hour).padStart(2, '0') }));
  }
  return strip;
}
