import { ALL_MODELS, CONSENSUS_MODELS, MODEL_NAMES } from '../lib/config.js';
import { linePath, niceMax, speedIn } from '../lib/layout.js';
import { el, svgEl } from './dom.js';

const W = 320;
const H = 120;
const PAD = 14;
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

const SERIES = [
  { id: 'ws10', title: '10 m wind', value: (m) => m.ws10 },
  { id: 'gust', title: '10 m gust', value: (m) => m.gust },
  { id: 'launch', title: '1000 m wind', value: (m) => m.launch?.speed },
];

/** One chart: all models for one quantity over 09–17. recs: [{ all: modelHour[] }] per hour. */
function sparkline(series, recs, unit) {
  const step = unit === 'kt' ? 3 : 5;
  const lines = ALL_MODELS.map((model, k) => ({
    model,
    values: recs.map((r) => {
      const kmh = r.all ? series.value(r.all[k]) : null;
      return Number.isFinite(kmh) ? speedIn(kmh, unit) : null;
    }),
  }));
  const yMax = niceMax(lines.flatMap((l) => l.values), step);
  const geo = { w: W, h: H, pad: PAD, yMax };
  const svg = svgEl('svg', {
    class: 'spark',
    viewBox: `0 0 ${W} ${H}`,
    role: 'img',
    'aria-labelledby': `spark-${series.id}-title`,
  });
  svg.append(svgEl('title', { id: `spark-${series.id}-title` }));
  svg.firstChild.textContent = `${series.title}, 09–17, ${unit === 'kt' ? 'kt' : 'km/h'}`;
  // Gridlines at 0 and the top of the axis, with the top value.
  svg.append(svgEl('line', { class: 'grid-line', x1: PAD, x2: W - PAD, y1: H - PAD, y2: H - PAD }));
  svg.append(svgEl('line', { class: 'grid-line', x1: PAD, x2: W - PAD, y1: PAD, y2: PAD }));
  const top = svgEl('text', { class: 'spark-tick', x: 2, y: PAD + 4 });
  top.textContent = String(yMax);
  svg.append(top);
  // Extra models first (thin grey), consensus on top.
  for (const line of [...lines.filter((l) => !CONSENSUS_MODELS.includes(l.model)), ...lines.filter((l) => CONSENSUS_MODELS.includes(l.model))]) {
    const consensus = CONSENSUS_MODELS.includes(line.model);
    const d = linePath(line.values, HOURS, geo);
    if (d) svg.append(svgEl('path', { class: consensus ? `line m-${line.model}` : 'line extra', d, fill: 'none' }));
  }
  for (const h of [9, 13, 17]) {
    const x = PAD + ((h - 9) / 8) * (W - 2 * PAD);
    const t = svgEl('text', { class: 'spark-tick', x, y: H - 2, 'text-anchor': h === 9 ? 'start' : h === 17 ? 'end' : 'middle' });
    t.textContent = `${String(h).padStart(2, '0')}`;
    svg.append(t);
  }
  return svg;
}

function legend() {
  const consensus = el(
    'ul',
    { class: 'legend-items' },
    ...CONSENSUS_MODELS.map((model) => el('li', {}, el('span', { class: `key m-${model}`, 'aria-hidden': 'true' }), MODEL_NAMES[model]))
  );
  const extra = ALL_MODELS.filter((m) => !CONSENSUS_MODELS.includes(m)).map((m) => MODEL_NAMES[m]);
  return el(
    'div',
    { class: 'legend' },
    consensus,
    el('p', { class: 'legend-note', text: `Thin grey: ${extra.join(', ')} (extra models).` })
  );
}

/**
 * The model comparison block: three sparklines (10 m wind, gust, 1000 m) with one line per model and a legend.
 * recs: [{ all }] for 09–17, in order.
 */
export function modelCharts(recs, unit) {
  return el(
    'div',
    { class: 'models' },
    ...SERIES.map((s) => el('figure', { class: 'spark-fig' }, el('figcaption', { text: `${s.title} (${unit === 'kt' ? 'kt' : 'km/h'})` }), sparkline(s, recs, unit))),
    legend(),
    el('p', { class: 'legend-note', text: 'Abbreviations: ICON, ECMWF, GFS, AROME; 1000 m ≈ 900 hPa, 1500 m ≈ 850 hPa, 3000 m ≈ 700 hPa.' })
  );
}
