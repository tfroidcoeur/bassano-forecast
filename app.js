import { DATA_URL, DATA_URL_FALLBACK, ALL_MODELS, CONSENSUS_MODELS } from './lib/config.js';
import { forecastUrl, foehnUrl, ensembleUrl, validateRefreshUrl } from './lib/urls.js';
import { romeDate, romeHHMM, romeHourly, addDays, dayLabel, hoursAgo, wallFor } from './lib/time.js';
import { normalizeForecast, verdictLabel, outlookLabel, confidenceLabel, foehnLabel } from './lib/forecast-json.js';
import { foehnSeries, ensembleSeries, dayFoehnDp, dayExtremes } from './lib/foehn.js';
import { modelHour, consensusHour } from './lib/model.js';
import { scoreHour, foehnClass } from './lib/score.js';
import { wmoGroup } from './lib/icons.js';
import { createPoller } from './lib/poll.js';
import { el } from './ui/dom.js';
import { foehnChartSvg, foehnLegend } from './ui/chart.js';
import { hourlyTable, modelTable } from './ui/hourly.js';

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];
const REFRESH_KEY = 'grappa.refreshUrl';
const UNIT_KEY = 'grappa.unit';
const POLL_MS = 30000;
const POLL_MAX = 20; // 10 minutes
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
  selected: null,
};

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

async function getJson(url, headers) {
  const res = await fetch(url, { cache: 'no-store', headers });
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

function buildLive(main, foehnLocations, ensembleLocations) {
  if (!main?.hourly?.time || !Array.isArray(foehnLocations) || foehnLocations.length < 4) {
    throw new Error('unexpected Open-Meteo response');
  }
  // Requests use timezone=GMT; every time becomes Italian local time before any indexing.
  const hourly = romeHourly(main.hourly);
  const localLocations = foehnLocations.map((loc) => ({ ...loc, hourly: romeHourly(loc.hourly) }));
  const hasEnsemble = Array.isArray(ensembleLocations) && ensembleLocations.length >= 2;
  return {
    hourly,
    index: new Map(hourly.time.map((t, i) => [t, i])),
    foehn: foehnSeries(localLocations),
    ensemble: hasEnsemble ? ensembleSeries(ensembleLocations.map((loc) => ({ ...loc, hourly: romeHourly(loc.hourly) }))) : null,
  };
}

async function fetchLive() {
  const [main, foehn, ens] = await Promise.allSettled([getJson(forecastUrl()), getJson(foehnUrl()), getJson(ensembleUrl())]);
  if (main.status === 'rejected') throw main.reason;
  if (foehn.status === 'rejected') throw foehn.reason;
  const ensemble = ens.status === 'fulfilled' ? ens.value : null;
  const cached = [main.value.cachedAt, foehn.value.cachedAt, ensemble?.cachedAt].filter((x) => Number.isFinite(x));
  return {
    live: buildLive(main.value.json, foehn.value.json, ensemble?.json ?? null),
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
  await Promise.all([loadVerdictState(), loadLiveState()]);
  updateCachedAt();
  render();
}

async function reloadLive() {
  setStatusLine('live', 'Reloading live data…');
  await loadLiveState();
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
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1)} hPa`;
}

function foehnSummaryText(dateKey) {
  const ex = dayExtremes(state.live.foehn, dateKey);
  const cls = foehnClass(dayFoehnDp(state.live.foehn, dateKey));
  return (
    `09–17 most negative Bozen−Innsbruck: ECMWF ${fmtDp(ex.biEcmwfMin)}, ICON ${fmtDp(ex.biIconMin)} ` +
    `(${cls ?? 'unknown'} north foehn). Zurich−Lugano ECMWF max ${fmtDp(ex.zlEcmwfMax)}.`
  );
}

function dayList() {
  const today = romeDate();
  return [0, 1, 2, 3, 4, 5].map((n) => addDays(today, n));
}

// ---- rendering ----

function setStatusLine(which, text) {
  $(`${which}-status`).textContent = text;
}

function renderStatus() {
  const v = state.verdict;
  if (state.verdictState === 'loading') setStatusLine('verdict', 'Loading verdict…');
  else if (state.verdictState === 'missing') setStatusLine('verdict', 'No Claude verdict yet');
  else if (state.verdictState === 'error' && !v) setStatusLine('verdict', 'Verdict unavailable');
  else if (state.verdictState === 'error') setStatusLine('verdict', `Verdict refresh failed; showing the one written ${romeHHMM(v.generatedAt)}`);
  else setStatusLine('verdict', `Verdict written ${romeHHMM(v.generatedAt)} (${hoursAgo(v.generatedAt)} h ago)`);

  if (state.live) setStatusLine('live', `Live data ${romeHHMM(state.liveAt)}`);
  else if (state.liveError) setStatusLine('live', 'Live data unavailable');
  else setStatusLine('live', 'Loading live data…');
}

function renderBanner() {
  const banner = $('offline-banner');
  banner.hidden = !state.cachedAt;
  banner.textContent = state.cachedAt ? `Offline — data from ${romeHHMM(state.cachedAt)}` : '';
}

function renderSummary() {
  const text = state.verdict?.summary;
  $('summary').textContent = text || 'No summary yet.';
}

function renderFullChart() {
  const host = $('foehn-full');
  if (!state.live) {
    host.replaceChildren(el('p', { class: 'notice', text: 'The foehn index needs live data.' }));
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
  host.replaceChildren(el('p', { class: 'foehn-summary', text: `Today ${foehnSummaryText(today)}` }), chart, foehnLegend());
}

function selectedDay(days) {
  if (!days.includes(state.selected)) state.selected = days[0];
  return state.selected;
}

function renderTabs() {
  const days = dayList();
  const current = selectedDay(days);
  const byDate = new Map((state.verdict?.days ?? []).map((d) => [d.date, d]));
  $('day-tabs').replaceChildren(
    ...days.map((date) => {
      const verdict = byDate.get(date)?.verdict ?? null;
      const button = el(
        'button',
        {
          type: 'button',
          class: 'tab',
          role: 'tab',
          id: `tab-${date}`,
          'aria-selected': date === current ? 'true' : 'false',
          'aria-controls': 'day-panel',
        },
        el('span', { class: `dot dot-${verdict ?? 'none'}`, 'aria-hidden': 'true' }),
        el('span', { text: dayLabel(date) }),
        el('span', { class: 'visually-hidden', text: `, ${verdictLabel(verdict)}` })
      );
      button.addEventListener('click', () => {
        state.selected = date;
        render();
      });
      return button;
    })
  );
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
        el('p', { class: 'outtext', text: o.text })
      )
    )
  );
}

function verdictCard(dateKey) {
  const day = state.verdict?.days.find((d) => d.date === dateKey) ?? null;
  if (!day) {
    const msg = state.verdictState === 'missing' ? 'No Claude verdict yet.' : 'No Claude verdict for this day yet.';
    return el('section', { class: 'card notice' }, el('p', { text: msg }));
  }
  return el(
    'article',
    { class: `verdict verdict-${day.verdict ?? 'none'}` },
    el('p', { class: 'verdict-word', text: verdictLabel(day.verdict) }),
    el('h3', { class: 'headline', text: day.headline }),
    day.window ? el('p', { class: 'window', text: `Window: ${day.window}` }) : null,
    el('p', { class: `badge foehn-${day.foehn ?? 'unknown'}`, text: foehnLabel(day.foehn) }),
    day.foehnText ? el('p', { text: day.foehnText }) : null,
    day.text ? el('p', { text: day.text }) : null,
    day.mainRisk ? el('p', { class: 'risk' }, el('strong', { text: 'Main risk: ' }), day.mainRisk) : null
  );
}

function renderDay(dateKey) {
  const parts = [verdictCard(dateKey)];
  if (!state.live) {
    parts.push(el('p', { class: 'notice', text: 'Live tables are unavailable. Use Reload live data.' }));
  } else {
    const recs = hourRecords(dateKey);
    const { scores } = dayScores(dateKey, recs);
    parts.push(
      el('h3', { text: `Foehn, ${dayLabel(dateKey)} with a day either side` }),
      el('p', { class: 'foehn-summary', text: foehnSummaryText(dateKey) }),
      foehnChartSvg({
        from: `${addDays(dateKey, -1)}T00:00`,
        to: `${addDays(dateKey, 2)}T00:00`,
        series: state.live.foehn,
        ensemble: state.live.ensemble,
        ensembleAfter: detEnd(),
        idPrefix: 'foehn-day',
      }),
      foehnLegend(),
      el('h3', { text: 'Hourly, 09–17 local (consensus of five models)' }),
      el(
        'div',
        { class: 'scroll' },
        hourlyTable(
          recs.map((r, k) => ({ label: r.label, c: r.c, score: scores[k] })),
          state.unit
        )
      ),
      el(
        'details',
        { class: 'models-box' },
        el('summary', { text: 'Model comparison: 10 m wind, speed (gust)' }),
        el('div', { class: 'scroll' }, modelTable(recs.map((r) => ({ label: r.label, all: r.all })), state.unit))
      )
    );
  }
  $('day-panel').replaceChildren(...parts);
  $('day-panel').setAttribute('aria-labelledby', `tab-${dateKey}`);
}

function render() {
  renderStatus();
  renderBanner();
  renderSummary();
  renderFullChart();
  renderTabs();
  renderOutlook();
  renderDay(selectedDay(dayList()));
}

// ---- refresh verdict (poll after opening the routine) ----

function setRefreshStatus(text, spinning = false) {
  const children = spinning ? [el('span', { class: 'spinner', 'aria-hidden': 'true' })] : [];
  $('refresh-status').replaceChildren(...children, text);
}

let pollBaseline = null; // generatedAt when the current poll started

const poller = createPoller({
  intervalMs: POLL_MS,
  maxChecks: POLL_MAX,
  probe: async () => {
    const { data } = await fetchVerdict();
    return data && data.generatedAt !== pollBaseline ? data : null;
  },
  onProgress: (checks) => setRefreshStatus(`Waiting for a new verdict… (${checks}/${POLL_MAX})`, true),
  onFound: (data) => {
    state.verdict = data;
    state.verdictState = 'ok';
    setRefreshStatus(`New verdict written ${romeHHMM(data.generatedAt)}.`);
    render();
  },
  onGiveUp: () => setRefreshStatus('No new verdict after 10 minutes. Check the routine on claude.ai.'),
});

function startPolling() {
  pollBaseline = state.verdict?.generatedAt ?? null;
  poller.start();
}

// ---- settings ----

function openSettings() {
  $('unit-select').value = state.unit;
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
      $('settings-error').textContent = 'The link must start with https://claude.ai/';
      return;
    }
  }
  state.unit = $('unit-select').value === 'kt' ? 'kt' : 'kmh';
  writeStorage(UNIT_KEY, state.unit);
  state.refreshUrl = url;
  if (url) writeStorage(REFRESH_KEY, url);
  else removeStorage(REFRESH_KEY);
  $('settings-dialog').close();
  render();
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

  $('btn-refresh').addEventListener('click', () => {
    if (!state.refreshUrl) {
      setRefreshStatus('Set the claude.ai routine link in Settings first.');
      openSettings();
      return;
    }
    window.open(state.refreshUrl, '_blank', 'noopener,noreferrer');
    startPolling();
  });
  $('btn-reload').addEventListener('click', reloadLive);
  $('btn-settings').addEventListener('click', openSettings);
  $('settings-save').addEventListener('click', saveSettings);
  $('settings-cancel').addEventListener('click', () => $('settings-dialog').close());

  registerServiceWorker();
  render();
  loadAll();
}

init();
