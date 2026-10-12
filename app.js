import { DATA_URL, DATA_URL_FALLBACK, ALL_MODELS, CONSENSUS_MODELS } from './lib/config.js';
import { forecastUrl, foehnUrl, ensembleUrl, longRangeUrl, validateRefreshUrl } from './lib/urls.js';
import { romeDate, romeHHMM, romeHourly, addDays, dayLabel, weekdayShort, wallFor } from './lib/time.js';
import { normalizeForecast, localizedText, verdictLabel, outlookLabel, confidenceLabel, foehnLabel } from './lib/forecast-json.js';
import { t, setLang, getLang, detectLang, formatDecimal, LANGS, LANG_NAMES } from './lib/i18n.js';
import { foehnSeries, ensembleSeries, dayFoehnDp, dayExtremes } from './lib/foehn.js';
import { ensembleFoehnDaily, longRangeRows } from './lib/longrange.js';
import { modelHour, consensusHour } from './lib/model.js';
import { scoreHour, foehnClass } from './lib/score.js';
import { wmoGroup } from './lib/icons.js';
import { createPoller } from './lib/poll.js';
import { parseWindow, hourStrip } from './lib/layout.js';
import { statusLine } from './lib/status.js';
import { el } from './ui/dom.js';
import { foehnChartSvg, foehnLegend } from './ui/chart.js';
import { hourGrid, hourStripEl } from './ui/hourly.js';
import { modelCharts } from './ui/models.js';
import { longRangeView } from './ui/longrange.js';
import { applyStatic } from './ui/static.js';

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const REFRESH_KEY = 'grappa.refreshUrl';
const UNIT_KEY = 'grappa.unit';
const LANG_KEY = 'grappa.lang';
const POLL_MS = 30000;
const POLL_MAX = 20; // 10 minutes
const LONG_RANGE_DAYS = 15;
const DATA_SOURCES = [
  { url: DATA_URL, headers: { Accept: 'application/vnd.github.raw+json' } },
  { url: DATA_URL_FALLBACK },
];

const $ = (id) => document.getElementById(id);

const state = {
  unit: 'kmh',
  refreshUrl: null,
  verdict: null,
  verdictState: 'loading', // loading | ok | missing | error
  verdictCachedAt: null,
  live: null,
  liveAt: null,
  liveCachedAt: null,
  liveError: false,
  cachedAt: null,
  selected: null, // session only: not written to storage
  showMore: false, // "More values" in the hour grid, kept for the session
};

const SWIPE_PX = 50; // horizontal distance that switches the day

// ---- storage (private mode can throw) ----

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not persisted */
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to remove */
  }
}

// ---- network ----

// A request that hangs (an API outage) must not keep the page on "loading" forever.
const FETCH_TIMEOUT_MS = 20000;

async function getJson(url, headers) {
  const res = await fetch(url, { cache: 'no-store', headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  const cached = Number(res.headers.get('X-Cached-At'));
  return { json: await res.json(), cachedAt: cached > 0 ? cached : null };
}

/** forecast.json: { data: normalised | null (missing), cachedAt }. Throws on real errors. */
async function fetchVerdict() {
  let lastError = null;
  for (const src of DATA_SOURCES) {
    try {
      const { json, cachedAt } = await getJson(src.url, src.headers);
      const data = normalizeForecast(json);
      if (!data) throw new Error('forecast.json has an unexpected shape');
      return { data, cachedAt };
    } catch (err) {
      if (err.status === 404) return { data: null, cachedAt: null };
      lastError = err;
    }
  }
  throw lastError;
}

/** The 15 local days of the long-range table, from today. */
function longRangeDates() {
  const today = romeDate();
  return Array.from({ length: LONG_RANGE_DAYS }, (_, n) => addDays(today, n));
}

/** Long-range rows, or null when the response is unusable. A failure here never breaks the deterministic data. */
function buildLongRange(json, ensembleLocal) {
  try {
    if (!Array.isArray(json?.hourly?.time)) return null;
    const dates = longRangeDates();
    const foehnByDate = ensembleLocal ? ensembleFoehnDaily(ensembleLocal, dates) : null;
    return longRangeRows(romeHourly(json.hourly), dates, foehnByDate);
  } catch {
    return null;
  }
}

function buildLive(main, foehnLocations, ensembleLocations, longRangeJson) {
  if (!main?.hourly?.time || !Array.isArray(foehnLocations) || foehnLocations.length < 4) {
    throw new Error('unexpected Open-Meteo response');
  }
  // Requests use timezone=GMT; every time becomes Italian local time before any indexing.
  const hourly = romeHourly(main.hourly);
  const localLocations = foehnLocations.map((loc) => ({ ...loc, hourly: romeHourly(loc.hourly) }));
  const hasEnsemble = Array.isArray(ensembleLocations) && ensembleLocations.length >= 2;
  const ensembleLocal = hasEnsemble ? ensembleLocations.map((loc) => ({ ...loc, hourly: romeHourly(loc.hourly) })) : null;
  return {
    hourly,
    index: new Map(hourly.time.map((t, i) => [t, i])),
    foehn: foehnSeries(localLocations),
    ensemble: ensembleLocal ? ensembleSeries(ensembleLocal) : null,
    longRange: buildLongRange(longRangeJson, ensembleLocal),
  };
}

async function fetchLive() {
  const [main, foehn, ens, lr] = await Promise.allSettled([
    getJson(forecastUrl()),
    getJson(foehnUrl()),
    getJson(ensembleUrl()),
    getJson(longRangeUrl()),
  ]);
  if (main.status === 'rejected') throw main.reason;
  if (foehn.status === 'rejected') throw foehn.reason;
  const ensemble = ens.status === 'fulfilled' ? ens.value : null;
  const longRange = lr.status === 'fulfilled' ? lr.value : null;
  const cached = [main.value.cachedAt, foehn.value.cachedAt, ensemble?.cachedAt, longRange?.cachedAt].filter((x) => Number.isFinite(x));
  return {
    live: buildLive(main.value.json, foehn.value.json, ensemble?.json ?? null, longRange?.json ?? null),
    cachedAt: cached.length ? Math.min(...cached) : null,
  };
}

async function loadVerdictState() {
  try {
    const { data, cachedAt } = await fetchVerdict();
    state.verdict = data;
    state.verdictState = data ? 'ok' : 'missing';
    state.verdictCachedAt = cachedAt;
  } catch {
    state.verdictState = 'error';
    state.verdictCachedAt = null;
  }
}

async function loadLiveState() {
  try {
    const { live, cachedAt } = await fetchLive();
    state.live = live;
    state.liveCachedAt = cachedAt;
    state.liveAt = cachedAt ?? Date.now();
    state.liveError = false;
  } catch {
    state.live = null;
    state.liveCachedAt = null;
    state.liveError = true;
  }
}

function updateCachedAt() {
  const cached = [state.liveCachedAt, state.verdictCachedAt].filter((x) => Number.isFinite(x));
  state.cachedAt = cached.length ? Math.min(...cached) : null;
}

async function loadAll() {
  // Each part renders as soon as it arrives: the verdict (GitHub) never waits for the weather APIs.
  const show = () => {
    updateCachedAt();
    render();
  };
  await Promise.all([loadVerdictState().then(show), loadLiveState().then(show)]);
}

async function reloadLive() {
  const btn = $('btn-reload');
  btn.classList.add('busy');
  await loadLiveState();
  btn.classList.remove('busy');
  updateCachedAt();
  render();
}

// ---- derived data ----

function detEnd() {
  const t = state.live.foehn.time;
  return t[t.length - 1];
}

function hourRecords(dateKey) {
  return HOURS.map((h) => {
    const label = String(h).padStart(2, '0');
    const i = state.live.index.get(wallFor(dateKey, h));
    if (i === undefined) return { label, c: null, all: null };
    const all = ALL_MODELS.map((m) => modelHour(state.live.hourly, m, i));
    const c = consensusHour(all.filter((m) => CONSENSUS_MODELS.includes(m.model)));
    return { label, c, all };
  });
}

function dayScores(dateKey, recs) {
  const dayFoehn = foehnClass(dayFoehnDp(state.live.foehn, dateKey));
  const scores = recs.map((r) => {
    const c = r.c;
    if (!c) return null;
    return scoreHour(
      {
        launch: c.launch.speed,
        aloft850: c.aloft850,
        aloft700: c.aloft700,
        north: c.north,
        gust: c.gust,
        rh850: c.rh850,
        precipMm: c.precipMm,
        cape: c.cape,
        wxGroup: wmoGroup(c.wx),
      },
      dayFoehn
    );
  });
  return { dayFoehn, scores };
}

function fmtDp(v) {
  if (!Number.isFinite(v)) return '–';
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatDecimal(Math.abs(v), 1)} hPa`;
}

/** prefix: an already translated word ('verdict' or 'live'), or undefined. */
function foehnBadge(cls, prefix) {
  return el('span', { class: `badge foehn-${cls ?? 'unknown'}`, text: prefix ? t('foehn.badgePrefixed', { prefix, label: foehnLabel(cls) }) : foehnLabel(cls) });
}

function foehnSummaryText(dateKey) {
  const ex = dayExtremes(state.live.foehn, dateKey);
  const cls = foehnClass(dayFoehnDp(state.live.foehn, dateKey));
  return t('foehn.summary', { ecmwf: fmtDp(ex.biEcmwfMin), icon: fmtDp(ex.biIconMin), cls: t(`foehn.cls.${cls ?? 'unknown'}`), zl: fmtDp(ex.zlEcmwfMax) });
}

/** The day with the most negative foehn value in the next five days (tomorrow to +5). */
function strongestNext(today) {
  let best = null;
  for (let n = 1; n <= 5; n++) {
    const date = addDays(today, n);
    const dp = dayFoehnDp(state.live.foehn, date);
    if (Number.isFinite(dp) && (best === null || dp < best.dp)) best = { date, dp };
  }
  return best;
}

function dayList() {
  const today = romeDate();
  return [0, 1, 2, 3, 4, 5].map((n) => addDays(today, n));
}

// ---- rendering ----

function renderStatus() {
  const v = state.verdict;
  const verdict = { state: state.verdictState, generatedAt: v?.generatedAt };
  const live = { state: state.live ? 'ok' : state.liveError ? 'error' : 'loading', at: state.liveAt };
  $('status-line').textContent = statusLine(verdict, live);
}

function renderBanner() {
  const banner = $('offline-banner');
  banner.hidden = !state.cachedAt;
  banner.textContent = state.cachedAt ? t('banner.offline', { time: romeHHMM(state.cachedAt) }) : '';
}

function renderSummary() {
  $('summary').textContent = localizedText(state.verdict?.summary) || t('summary.none');
}

/** Top foehn card: today's value and class, and the strongest of the next five days. */
function renderFoehnToday() {
  const host = $('foehn-today');
  if (!state.live) {
    host.replaceChildren(el('p', { class: 'notice', text: t('foehn.needsLive') }));
    return;
  }
  const today = romeDate();
  const dp = dayFoehnDp(state.live.foehn, today);
  const cls = foehnClass(dp);
  const best = strongestNext(today);
  // One line per item: label, the Bozen−Innsbruck value and the class badge (the badge says the class).
  const south = (v) => (Number.isFinite(v) && v >= 0 ? t('foehn.southFlow') : '');
  host.replaceChildren(
    el('p', { class: 'foehn-line' }, el('span', { text: t('foehn.today', { dp: fmtDp(dp), south: south(dp) }) }), foehnBadge(cls)),
    el(
      'p',
      { class: 'foehn-line' },
      el('span', {
        text: best ? t('foehn.peak', { day: dayLabel(best.date), dp: fmtDp(best.dp), south: south(best.dp) }) : t('foehn.peakNone'),
      }),
      best ? foehnBadge(foehnClass(best.dp)) : null
    ),
    el('p', { class: 'legend-note', text: t('foehn.dpNote') })
  );
}

function renderFullChart() {
  const host = $('foehn-full');
  if (!state.live) {
    host.replaceChildren(el('p', { class: 'notice', text: t('foehn.needsLive') }));
    return;
  }
  const today = romeDate();
  const chart = foehnChartSvg({
    from: `${today}T00:00`,
    to: `${addDays(today, 15)}T00:00`,
    series: state.live.foehn,
    ensemble: state.live.ensemble,
    ensembleAfter: detEnd(),
    compact: true,
    idPrefix: 'foehn-full',
  });
  host.replaceChildren(el('p', { class: 'foehn-summary', text: t('foehn.todaySummary', { text: foehnSummaryText(today) }) }), chart, foehnLegend());
}

function selectedDay(days) {
  if (!days.includes(state.selected)) state.selected = days[0];
  return state.selected;
}

/** Day tabs in the app bar: roving tabindex, arrow keys wrap, Home and End jump to the ends. */
function onTabKey(e, days, k) {
  let target;
  if (e.key === 'ArrowRight') target = (k + 1) % days.length;
  else if (e.key === 'ArrowLeft') target = (k - 1 + days.length) % days.length;
  else if (e.key === 'Home') target = 0;
  else if (e.key === 'End') target = days.length - 1;
  else return;
  e.preventDefault();
  selectDay(days[target], { focus: true });
}

function renderTabs() {
  const days = dayList();
  const current = selectedDay(days);
  const byDate = new Map((state.verdict?.days ?? []).map((d) => [d.date, d]));
  $('day-tabs').replaceChildren(
    ...days.map((date, k) => {
      const verdict = byDate.get(date)?.verdict ?? null;
      const weekday = weekdayShort(date);
      const num = String(Number(date.slice(8, 10)));
      const selected = date === current;
      const tab = el(
        'button',
        {
          type: 'button',
          class: 'day-tab',
          role: 'tab',
          id: `tab-${date}`,
          'aria-selected': selected ? 'true' : 'false',
          'aria-controls': 'day-panel',
          tabindex: selected ? '0' : '-1',
        },
        el('span', { class: 'dt-wd', text: weekday }),
        el('span', { class: 'dt-num', text: num }),
        el('span', { class: `dt-dot dot-${verdict ?? 'none'}`, 'aria-hidden': 'true' }),
        el('span', { class: 'visually-hidden', text: t('tab.verdict', { verdict: verdictLabel(verdict) }) })
      );
      tab.addEventListener('click', () => selectDay(date));
      tab.addEventListener('keydown', (e) => onTabKey(e, days, k));
      return tab;
    })
  );
}

/** Shows one day: its tab, its panel. Only the tabs and the day panel are rebuilt. */
function selectDay(date, { focus = false } = {}) {
  state.selected = date;
  renderTabs();
  renderDay(date);
  if (focus) $(`tab-${date}`)?.focus();
}

/** Previous (-1) or next (+1) day; stops at the ends, no wrap-around for swipes. */
function stepDay(delta) {
  const days = dayList();
  const next = days[days.indexOf(selectedDay(days)) + delta];
  if (next) selectDay(next);
}

function renderOutlook() {
  const items = state.verdict?.outlook ?? [];
  $('outlook').hidden = items.length === 0;
  $('outlook-strip').replaceChildren(
    ...items.map((o) =>
      el(
        'article',
        { class: 'outcard' },
        el('p', { class: 'outdate', text: `${dayLabel(o.date)} · ${o.date}` }),
        el('p', { class: 'outverdict', text: outlookLabel(o.verdict) }),
        el('p', { class: 'badge', text: confidenceLabel(o.confidence) }),
        el('p', { class: `badge foehn-${o.foehn ?? 'unknown'}`, text: foehnLabel(o.foehn) }),
        el('p', { class: 'outtext', text: localizedText(o.text) })
      )
    )
  );
}

/** Day's live foehn value and class; shows the verdict's class too when they differ. */
function dayFoehnLine(dateKey, verdictCls) {
  const dp = dayFoehnDp(state.live.foehn, dateKey);
  const live = foehnClass(dp);
  const differs = verdictCls !== null && live !== null && verdictCls !== live;
  const badges = differs ? [foehnBadge(verdictCls, t('foehn.prefixVerdict')), foehnBadge(live, t('foehn.prefixLive'))] : [foehnBadge(live)];
  return el('p', { class: 'foehn-live' }, el('span', { text: `${t('foehn.live', { dp: fmtDp(dp) })} ` }), ...badges);
}

function verdictCard(dateKey, foehnLine) {
  const day = state.verdict?.days.find((d) => d.date === dateKey) ?? null;
  if (!day) {
    const msg = state.verdictState === 'missing' ? t('verdict.noYet') : t('verdict.noDay');
    return el('section', { class: 'card notice' }, el('p', { text: msg }), foehnLine);
  }
  const body = localizedText(day.text);
  const foehnText = localizedText(day.foehnText);
  const risk = localizedText(day.mainRisk);
  return el(
    'article',
    { class: `verdict verdict-${day.verdict ?? 'none'}` },
    el('p', { class: 'verdict-word', text: verdictLabel(day.verdict) }),
    el('h3', { class: 'headline', text: localizedText(day.headline) }),
    day.window ? el('p', { class: 'window', text: t('card.window', { window: day.window }) }) : null,
    el('p', { class: `badge foehn-${day.foehn ?? 'unknown'}`, text: foehnLabel(day.foehn) }),
    foehnLine,
    foehnText ? el('p', { text: foehnText }) : null,
    body ? el('p', { text: body }) : null,
    risk ? el('p', { class: 'risk' }, el('strong', { text: `${t('card.risk')} ` }), risk) : null
  );
}

function renderDay(dateKey) {
  const day = state.verdict?.days.find((d) => d.date === dateKey) ?? null;
  const parts = [];
  if (!state.live) {
    parts.push(verdictCard(dateKey, null), el('p', { class: 'notice', text: t('day.needsLive') }));
  } else {
    const recs = hourRecords(dateKey);
    const { scores } = dayScores(dateKey, recs);
    const cols = recs.map((r, k) => ({ label: r.label, c: r.c, score: scores[k], all: r.all }));
    const segments = hourStrip(HOURS, scores, parseWindow(day?.window));
    const more = el('button', {
      type: 'button',
      id: 'more-toggle',
      class: 'more-toggle',
      'aria-expanded': state.showMore ? 'true' : 'false',
      'aria-controls': 'hour-grid',
      text: state.showMore ? t('more.hide') : t('more.show'),
    });
    more.addEventListener('click', () => {
      state.showMore = !state.showMore;
      renderDay(dateKey);
      $('more-toggle')?.focus();
    });
    parts.push(
      verdictCard(dateKey, dayFoehnLine(dateKey, day?.foehn ?? null)),
      el(
        'section',
        { class: 'strip-block', 'aria-label': t('day.strip') },
        el('p', { class: 'strip-head', text: t('day.stripHead', { verdict: verdictLabel(day?.verdict ?? null) }) }),
        hourStripEl(segments),
        el('p', { class: 'legend-note', text: t('day.stripLegend') })
      ),
      el('h3', { text: t('day.hourly') }),
      hourGrid(cols, state.unit, state.showMore),
      more,
      el('p', {
        class: 'legend-note',
        text: t('day.heights'),
      }),
      el(
        'details',
        { class: 'models-box' },
        el(
          'summary',
          { 'data-show': t('action.show'), 'data-hide': t('action.hide') },
          el('span', {}, el('span', { text: t('day.compare') }), el('br'), el('span', { class: 'sub', text: t('day.compareSub') }))
        ),
        modelCharts(recs, state.unit)
      )
    );
  }
  $('day-panel').replaceChildren(...parts);
  $('day-panel').setAttribute('aria-labelledby', `tab-${dateKey}`);
}

function renderLongRange() {
  const host = $('longrange-body');
  if (!state.live) host.replaceChildren(el('p', { class: 'notice', text: t('lr.needsLive') }));
  else if (!state.live.longRange) host.replaceChildren(el('p', { class: 'notice', text: t('lr.unavailable') }));
  else host.replaceChildren(longRangeView(state.live.longRange, state.unit));
}

function render() {
  renderStatus();
  renderBanner();
  renderSummary();
  renderFoehnToday();
  renderFullChart();
  renderTabs();
  renderOutlook();
  renderLongRange();
  renderDay(selectedDay(dayList()));
  renderMenu();
}

// ---- refresh verdict (poll after opening the routine) ----

// The last message is kept as a key, so a language switch can redraw it.
let refreshMsg = null;

function setRefreshStatus(key, params = {}, spinning = false) {
  refreshMsg = { key, params, spinning };
  drawRefreshStatus();
}

function drawRefreshStatus() {
  if (!refreshMsg) return;
  const children = refreshMsg.spinning ? [el('span', { class: 'spinner', 'aria-hidden': 'true' })] : [];
  $('refresh-status').replaceChildren(...children, t(refreshMsg.key, refreshMsg.params));
}

/** Progress shown on the app bar while polling: a thin line under it and a dot on the menu button. */
function setPolling(on) {
  $('progress').hidden = !on;
  $('menu-dot').hidden = !on;
}

let pollBaseline = null; // generatedAt when the current poll started

const poller = createPoller({
  intervalMs: POLL_MS,
  maxChecks: POLL_MAX,
  probe: async () => {
    const { data } = await fetchVerdict();
    return data && data.generatedAt !== pollBaseline ? data : null;
  },
  onProgress: (checks) => {
    setPolling(true);
    setRefreshStatus('refresh.waiting', { checks, max: POLL_MAX }, true);
  },
  onFound: (data) => {
    setPolling(false);
    state.verdict = data;
    state.verdictState = 'ok';
    setRefreshStatus('refresh.written', { time: romeHHMM(data.generatedAt) });
    render();
  },
  onGiveUp: () => {
    setPolling(false);
    setRefreshStatus('refresh.giveUp');
  },
});

function refreshVerdict() {
  if (!state.refreshUrl) {
    setRefreshStatus('refresh.setLink');
    openSettings();
    return;
  }
  window.open(state.refreshUrl, '_blank', 'noopener,noreferrer');
  pollBaseline = state.verdict?.generatedAt ?? null;
  poller.start();
}

// ---- menu, settings and dialogs ----

/** Native dialog: a tap on the backdrop (the dialog element itself) closes it. */
function wireSheet(dialog) {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

function openMenu() {
  renderMenu();
  $('menu-dialog').showModal();
  $('btn-menu').setAttribute('aria-expanded', 'true');
}

function renderMenu() {
  const unit = state.unit === 'kt' ? 'kt' : 'km/h';
  $('m-units').textContent = t('menu.unit', { unit, other: state.unit === 'kt' ? 'km/h' : 'kt' });
  const lang = getLang();
  $('m-lang').textContent = t('menu.language', { current: LANG_NAMES[lang], other: LANG_NAMES[lang === 'nl' ? 'en' : 'nl'] });
}

function toggleUnit() {
  state.unit = state.unit === 'kt' ? 'kmh' : 'kt';
  writeStorage(UNIT_KEY, state.unit);
  $('menu-dialog').close();
  render();
}

function toggleLanguage() {
  const next = getLang() === 'nl' ? 'en' : 'nl';
  $('menu-dialog').close();
  setLanguage(next);
}

/** Switches the language without refetching: static text, then the rendered parts. */
function setLanguage(lang) {
  setLang(lang);
  writeStorage(LANG_KEY, lang);
  applyStatic();
  render();
  drawRefreshStatus();
}

function openSettings() {
  $('refresh-url').value = state.refreshUrl ?? '';
  $('settings-error').textContent = '';
  $('settings-dialog').showModal();
}

function saveSettings() {
  const raw = $('refresh-url').value.trim();
  let url = null;
  if (raw) {
    url = validateRefreshUrl(raw);
    if (!url) {
      $('settings-error').textContent = t('settings.invalid');
      return;
    }
  }
  state.refreshUrl = url;
  if (url) writeStorage(REFRESH_KEY, url);
  else removeStorage(REFRESH_KEY);
  $('settings-dialog').close();
}

// ---- start ----

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  }
}

function init() {
  state.unit = readStorage(UNIT_KEY) === 'kt' ? 'kt' : 'kmh';
  state.refreshUrl = validateRefreshUrl(readStorage(REFRESH_KEY) ?? '');
  const savedLang = readStorage(LANG_KEY);
  setLang(LANGS.includes(savedLang) ? savedLang : detectLang(navigator.languages));
  applyStatic();

  $('btn-reload').addEventListener('click', reloadLive);
  $('btn-menu').addEventListener('click', openMenu);
  $('menu-dialog').addEventListener('close', () => $('btn-menu').setAttribute('aria-expanded', 'false'));
  $('m-refresh').addEventListener('click', () => {
    $('menu-dialog').close();
    refreshVerdict();
  });
  $('m-reload').addEventListener('click', () => {
    $('menu-dialog').close();
    reloadLive();
  });
  $('m-units').addEventListener('click', toggleUnit);
  $('m-lang').addEventListener('click', toggleLanguage);
  $('m-settings').addEventListener('click', () => {
    $('menu-dialog').close();
    openSettings();
  });
  $('m-close').addEventListener('click', () => $('menu-dialog').close());
  $('settings-save').addEventListener('click', saveSettings);
  $('settings-cancel').addEventListener('click', () => $('settings-dialog').close());
  for (const id of ['menu-dialog', 'settings-dialog']) wireSheet($(id));

  // Swipe on the day panel: horizontal moves only (the panel is pan-y in CSS), mouse ignored.
  const panel = $('day-panel');
  let swipe = null;
  panel.addEventListener('pointerdown', (e) => {
    swipe = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
  });
  panel.addEventListener('pointercancel', () => {
    swipe = null;
  });
  panel.addEventListener('pointerup', (e) => {
    if (!swipe) return;
    const dx = e.clientX - swipe.x;
    const dy = e.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > 1.5 * Math.abs(dy)) stepDay(dx < 0 ? 1 : -1);
  });

  registerServiceWorker();
  render();
  loadAll();
}

init();
