// Long-range ensemble, aggregated per local day. Pure: no DOM, no fetch.
// Inputs are Open-Meteo hourly blocks already converted to Italian local time (lib/time.js),
// so the 09–17 window and the day keys follow the clock change.
import { percentile, dayIndices } from './foehn.js';
import { circularMean, median } from './wind.js';
import { hasNorthFlow } from './score.js';
import { LONG_RANGE_VARS } from './urls.js';

const RAIN_MM = 1; // a member is a rain member when its 09–17 total reaches this
const NAME = /^(.+?)(?:_(member\d+))?$/; // 'wind_speed_850hPa' (control) or 'wind_speed_850hPa_member01'
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

const finite = (values) => values.filter(Number.isFinite);
const at = (series, i) => (Number.isFinite(series?.[i]) ? series[i] : null);
const pick = (series, idx) => idx.map((i) => at(series, i));

/** 16-point compass name for a bearing in degrees (direction the wind comes from). Null when unknown. */
export function compass(deg) {
  if (!Number.isFinite(deg)) return null;
  const sector = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
  return COMPASS[sector];
}

/**
 * Members of an ensemble hourly block for the named variables.
 * Returns Map(id → { [name]: values[] }), id 'control' or 'member01' …
 */
export function ensembleMembers(hourly, names) {
  const members = new Map();
  for (const key of Object.keys(hourly)) {
    const m = NAME.exec(key);
    if (!m || !names.includes(m[1]) || !Array.isArray(hourly[key])) continue;
    const id = m[2] ?? 'control';
    if (!members.has(id)) members.set(id, {});
    members.get(id)[m[1]] = hourly[key];
  }
  return members;
}

/** Indices of every hour whose local wall-clock label falls on the date (the clock-change day has 25). */
export function dayHourIndices(time, dateKey) {
  const out = [];
  time.forEach((t, i) => {
    if (t.startsWith(`${dateKey}T`)) out.push(i);
  });
  return out;
}

/** Share of members whose window total reaches 1 mm. Null when no member has a total. */
export function rainChance(totals) {
  const v = finite(totals);
  return v.length ? v.filter((t) => t >= RAIN_MM).length / v.length : null;
}

/**
 * Share of member-hours with north flow at 850 or 700 hPa (score.js hasNorthFlow: FOEHN.northFlowKmh, within 60° of north).
 * hours: [{ speed850, dir850, speed700, dir700 }], null where unknown. Hours with no speed at all are skipped.
 */
export function northFlowProbability(hours) {
  let n = 0;
  let k = 0;
  for (const h of hours) {
    if (!Number.isFinite(h.speed850) && !Number.isFinite(h.speed700)) continue;
    n++;
    if (hasNorthFlow({ speed: h.speed850, dir: h.dir850 }) || hasNorthFlow({ speed: h.speed700, dir: h.dir700 })) k++;
  }
  return n ? k / n : null;
}

/** p10, p50 and p90 of a pooled sample (linear interpolation). Null when the sample is empty. */
export function spread(values) {
  if (!finite(values).length) return null;
  return { p10: percentile(values, 0.1), p50: percentile(values, 0.5), p90: percentile(values, 0.9) };
}

/** Wind level over the 09–17 window: speed spread of all member-hours, direction = circular mean of member means. */
function levelOf(list, win, speedName, dirName) {
  const s = spread(list.flatMap((m) => pick(m[speedName], win)));
  if (!s) return null;
  return { ...s, dir: circularMean(list.map((m) => circularMean(pick(m[dirName], win)))) };
}

/** One local day from the launch-point ensemble members (see ensembleMembers). */
export function dayRow(members, time, dateKey) {
  const list = [...members.values()];
  const win = dayIndices(time, dateKey); // 09–17 local
  const day = dayHourIndices(time, dateKey);

  const totals = list.map((m) => {
    const v = finite(pick(m.precipitation, win));
    return v.length ? v.reduce((a, b) => a + b, 0) : null;
  });
  const hours = list.flatMap((m) =>
    win.map((i) => ({
      speed850: at(m.wind_speed_850hPa, i),
      dir850: at(m.wind_direction_850hPa, i),
      speed700: at(m.wind_speed_700hPa, i),
      dir700: at(m.wind_direction_700hPa, i),
    }))
  );
  const mins = [];
  const maxs = [];
  for (const m of list) {
    const v = finite(pick(m.temperature_2m, day));
    if (!v.length) continue;
    mins.push(Math.min(...v));
    maxs.push(Math.max(...v));
  }

  return {
    date: dateKey,
    rain: rainChance(totals),
    aloft850: levelOf(list, win, 'wind_speed_850hPa', 'wind_direction_850hPa'),
    aloft700: levelOf(list, win, 'wind_speed_700hPa', 'wind_direction_700hPa'),
    north: northFlowProbability(hours),
    temp: mins.length ? { min: median(mins), max: median(maxs) } : null,
  };
}

/**
 * Foehn range per local day from the ECMWF ensemble MSLP at Bolzano and Innsbruck ([bz, ib], local time).
 * Each member's 09–17 minimum Bozen−Innsbruck ΔP, then p10, p50, p90 over members. Returns Map(date → spread | null).
 */
export function ensembleFoehnDaily([bz, ib], dates) {
  const time = bz.hourly.time;
  const ibMembers = ensembleMembers(ib.hourly, ['pressure_msl']);
  const series = [];
  for (const [id, m] of ensembleMembers(bz.hourly, ['pressure_msl'])) {
    const other = ibMembers.get(id)?.pressure_msl;
    if (!m.pressure_msl || !other) continue;
    series.push(time.map((_, k) => (at(m.pressure_msl, k) !== null && at(other, k) !== null ? m.pressure_msl[k] - other[k] : null)));
  }
  const out = new Map();
  for (const date of dates) {
    const idx = dayIndices(time, date);
    out.set(
      date,
      spread(series.map((s) => {
        const v = finite(pick(s, idx));
        return v.length ? Math.min(...v) : null;
      }))
    );
  }
  return out;
}

/**
 * Long-range rows, one per date. hourly: the long-range ensemble block (local time).
 * foehnByDate: Map from ensembleFoehnDaily, or null.
 */
export function longRangeRows(hourly, dates, foehnByDate) {
  const members = ensembleMembers(hourly, LONG_RANGE_VARS);
  return dates.map((date) => ({ ...dayRow(members, hourly.time, date), foehn: foehnByDate?.get(date) ?? null }));
}
