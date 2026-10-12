import { TIMEZONE } from './config.js';
import { getLang, LOCALE } from './i18n.js';

const romeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function romeParts(ms) {
  const out = {};
  for (const p of romeFormatter.formatToParts(new Date(ms))) out[p.type] = p.value;
  return out;
}

/** Local wall-clock time in Italy as 'YYYY-MM-DDTHH:MM' (the format Open-Meteo returns). */
export function romeWall(ms = Date.now()) {
  const o = romeParts(ms);
  return `${o.year}-${o.month}-${o.day}T${o.hour}:${o.minute}`;
}

/** Open-Meteo time string requested with timezone=GMT ('YYYY-MM-DDTHH:MM', UTC) as Italian local wall-clock time. */
export function romeWallFromUtc(utc) {
  if (typeof utc !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(utc)) throw new Error(`unexpected time: ${utc}`);
  const ms = Date.parse(`${utc}:00Z`);
  if (!Number.isFinite(ms)) throw new Error(`unexpected time: ${utc}`);
  return romeWall(ms);
}

/** Copy of an Open-Meteo hourly block (timezone=GMT) with every time in Italian local time. */
export function romeHourly(hourly) {
  return { ...hourly, time: hourly.time.map(romeWallFromUtc) };
}

export function romeDate(ms = Date.now()) {
  return romeWall(ms).slice(0, 10);
}

/** 'HH:MM' in Italian time. */
export function romeHHMM(ms) {
  const o = romeParts(ms);
  return `${o.hour}:${o.minute}`;
}

export function addDays(dateKey, n) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const noonUtc = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)); // noon: the same calendar day in Italy
};
const dateText = (dateKey, lang, options) =>
  new Intl.DateTimeFormat(LOCALE[lang], { timeZone: TIMEZONE, ...options }).format(noonUtc(dateKey)).replace(/\./g, '');

/** Short weekday for a 'YYYY-MM-DD' key: 'Mon' or 'ma'. */
export function weekdayShort(dateKey, lang = getLang()) {
  return dateText(dateKey, lang, { weekday: 'short' });
}

/** 'Mon 19 Oct' or 'ma 19 okt' for a 'YYYY-MM-DD' key. */
export function dayLabel(dateKey, lang = getLang()) {
  return dateText(dateKey, lang, { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Wall-clock string to hours since the epoch (arithmetic only, for ordering and spacing). */
export function wallHours(wall) {
  const [date, time] = wall.split('T');
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 3600000;
}

export function wallFor(dateKey, hour) {
  return `${dateKey}T${String(hour).padStart(2, '0')}:00`;
}

export function hoursAgo(ms, now = Date.now()) {
  return Math.max(0, Math.floor((now - ms) / 3600000));
}
