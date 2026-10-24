# Grappa forecast

A small static, installable web app (PWA) with the paragliding forecast for Monte Grappa, near Bassano del Grappa (Italy). It shows live model numbers from Open-Meteo, a foehn index, and a written verdict that is produced elsewhere and published as a JSON file.

It is plain HTML, CSS and ES modules. There is no build step and no runtime dependency. It is meant for GitHub Pages at `https://tfroidcoeur.github.io/bassano-forecast/` and is installed on Android with Chrome's "Add to home screen".

Weather only. The local schools and the pilot decide whether to fly. Self-brief airspace and NOTAMs.

## Layout

| Path | What |
|---|---|
| `index.html` | The page: app bar (refresh icon, menu), status line, summary, foehn card (today and strongest of the next five days), day chips, day panel (hour strip, compact hour grid, model sparklines), outlook, long-range section, full foehn chart with explanation, menu sheet (refresh, reload, units, settings, links, about), settings and hour dialogs |
| `style.css` | Tokens for light and dark (`prefers-color-scheme`), app bar, cards, chips, strip, grid, sparklines, long-range chart and cards, sheets |
| `app.js` | UI state, loading, the refresh poll, settings, service worker registration |
| `lib/config.js` | Sites, foehn stations, wind limits, foehn thresholds, model lists, data URLs |
| `lib/urls.js` | Open-Meteo URL builders (the app uses these exact URLs), refresh link validation |
| `lib/time.js` | Italian local time helpers, day keys, conversion of the GMT times from Open-Meteo to local time |
| `lib/wind.js` | Windy-style colour bands (in knots), unit formatting, northerly component, median, circular mean |
| `lib/score.js` | Limit levels, foehn class, north flow and lee signature, hourly score |
| `lib/model.js` | Per-model hour values, launch-wind fallback 900 → 925 → 850 hPa, consensus, ceiling, temperatures at 1000/1500/3000 m interpolated from the pressure levels |
| `lib/poll.js` | Verdict poll after "Refresh verdict", ignores results of a poll that was stopped |
| `lib/foehn.js` | ΔP series from the multi-location response, ensemble percentiles, day extremes |
| `lib/forecast-json.js` | Validation and labels for `forecast.json`. Strings are kept as plain text |
| `lib/longrange.js` | Long-range ensemble per local day: rain chance, pooled wind percentiles, circular mean direction, north-flow probability, temperature medians, foehn range from the MSLP ensemble |
| `lib/layout.js` | Screen geometry: verdict window parsing, hour strip segments, sparkline paths, range bars, unit scaling |
| `lib/status.js` | One-line status under the app bar (verdict age, live time) |
| `lib/info.js` | Texts of the model-info notes: which models feed each part of the page, built from the model lists in `lib/config.js` |
| `lib/chart.js`, `lib/icons.js` | Chart geometry, WMO weather code to icon shapes |
| `ui/*.js` | DOM builders: SVG icons and arrows, the foehn chart, the hour strip and compact grid, model sparklines, the long-range chart and cards, the blue "i" model-info buttons (`ui/info.js`: a button after a heading opens one popup next to it; a tap outside, Escape or the same button closes it) |
| `sw.js` | Service worker: stale-while-revalidate app shell, network-first data with cache fallback (also for 429 and 5xx) |
| `manifest.webmanifest`, `icons/` | PWA manifest, icons (SVG source, PNG 192, 512, maskable 512) |
| `tests/*.test.mjs` | Unit tests for `lib/` (`node --test`) |
| `robots.txt`, `.nojekyll` | Keep crawlers out; serve the files as they are on Pages |

## Data flow

1. **Live model data (browser, on every load and on "Reload live data").**
   - `api.open-meteo.com`: hourly values at the launch point (elevation 830 m, as in `fetch_bassano.py`) for nine models in one request: 10 m wind, 900/925/850/700 hPa wind, 850 hPa humidity, precipitation, CAPE, low and mid cloud, weather code, boundary-layer height, 2 m temperature and dew point. km/h, 7 days.
   - Every Open-Meteo request uses `timezone=GMT`. Open-Meteo applies one UTC offset to a whole response, so with `Europe/Rome` the hours after the clock change would be mislabelled. `lib/time.js` converts each time to Italian local time, and all indexing (tables, scores, day foehn, chart, "now") uses the local time.
   - `api.open-meteo.com`: MSLP for Bolzano, Innsbruck, Zurich and Lugano from ECMWF and ICON (GMT, converted as above). ΔP is Bolzano − Innsbruck and Zurich − Lugano.
   - `ensemble-api.open-meteo.com`: ECMWF ensemble MSLP for Bolzano and Innsbruck, 15 days (GMT, converted as above). Used for the outlook band after the deterministic range, and for the foehn range per day in the long-range table.
   - `api.open-meteo.com`: the temperature rows of the hour grid, at the launch point, for the five consensus models (GMT): temperature and geopotential height at 925, 900, 850, 800, 700 and 600 hPa. The rows match the wind rows: 2 m at the launch (from the main request, beside the 10 m wind), then 1000, 1500 and 3000 m. Each model's temperature at those heights is interpolated linearly between the levels around that height (no extrapolation; levels a model lacks are skipped), then the grid shows the median, in whole °C. A separate request, so the main one stays small (with these variables it made Open-Meteo time out); when it fails, only these rows show a dash.
   - `ensemble-api.open-meteo.com`: ECMWF ensemble at the launch point, 15 days, one request (GMT): precipitation, 2 m temperature, 850 and 700 hPa wind. Aggregated in `lib/longrange.js`; days 6 to 14 are shown faded as lower confidence.
2. **Verdict (`data/forecast.json`).** Read from the GitHub API (`api.github.com`, raw media type), with `raw.githubusercontent.com` as a fallback. A 404 means "No Claude verdict yet"; the live tables still show.
3. **Refresh verdict.** Opens the claude.ai routine link stored in Settings, then polls the verdict every 30 s for up to 10 minutes until `generated_at` changes.

Score per hour (green / amber / red) is computed in the browser from the consensus of five models (ICON, ECMWF, GFS, AROME, ICON-2I) against the limits in `lib/config.js`, plus the day's foehn class from the live ΔP. The same rules as `fetch_bassano.py`:

- Consensus per hour: speeds, humidity, cloud and CAPE take the median, directions the circular mean, 10 m gusts the second-gustiest model (one outlier model does not set it; the maximum is kept as `gustMax`), precipitation the median (one wet model alone is not rain). The model spread is the largest difference between two models in the launch-level wind speed and direction.
- Levels: launch-level wind, 850 hPa wind, the north component at 850 hPa and the gust, against `LIMITS`. 3000 m (700 hPa) is not scored: thermals rarely reach it; its grid row shows it in colour.
- Day foehn class: over 09–17 local, each of ECMWF and ICON takes its mean Bozen−Innsbruck ΔP (one hour's dip does not set the class); the more negative of the two sets the class by its magnitude (under 2 hPa none, 2–3 weak, 3–6 moderate, over 6 strong). A positive value is none (south side).
- North flow: the consensus wind at 850 hPa (ridge level) is at least 20 km/h and comes from within 60° of north. A northerly at 700 hPa alone does not count.
- Lee signature: north flow and consensus 850 hPa relative humidity below 40 %.
- Red: rain (median at least 0.2 mm), convective cells (CAPE above 800 J/kg with precipitation) and strong foehn. Only a strong foehn is red: Bassano sits far behind the main ridge. Moderate foehn gives amber only with the lee signature; without it the class adds nothing to the hour.
- Amber from the models: a speed spread above 8 km/h, or a direction spread above 45° with at least 10 km/h at launch, except in a breeze hour.
- Breeze hour: from 11:00, launch wind at most 12 km/h, 850 hPa wind at most 20 km/h, low and mid cloud at most 50 %, no precipitation, no north flow at 850 hPa and no strong foehn. The plain and upslope breeze then dominates, so the models' direction spread is expected (`BREEZE` in `lib/config.js`).
- Best slot: the hour strip outlines only window hours that are not red in the live data; when the written window contains a live red hour, the card says so.

The score is a starting point; the verdict text is the judgement.

The hour grid's CAPE row (J/kg) shows the consensus value, the median of the five consensus models, coloured in bands at 50, 200, 400, 800 and 1500 J/kg (`CAPE_EDGES` in `lib/config.js`). From 800 J/kg, where the score counts CAPE with showers, the cells turn orange and then red.

### forecast.json

```json
{
  "generated_at": "2030-01-06T05:20:00Z",
  "summary": "string, up to 1200 chars",
  "days": [
    { "date": "2030-01-06", "verdict": "good | marginal | no", "headline": "...",
      "window": "11:00–15:00 or null", "foehn": "none | weak | moderate | strong",
      "foehn_text": "...", "text": "...", "main_risk": "..." }
  ],
  "outlook": [
    { "date": "2030-01-12", "verdict": "likely | possible | unlikely",
      "confidence": "low | very_low", "foehn": "none | weak | moderate | strong", "text": "..." }
  ]
}
```

Text fields (summary, headline, foehn_text, text, main_risk) may be a plain English string or `{ "en": "...", "nl": "..." }`; a missing language shows the other one.

Unknown enum values are dropped (shown as "No verdict" or "Foehn unknown"). Long strings are cut to a fixed length.

## Security and privacy

The repository is public. Keep it that way.

- No credentials, tokens, API keys, personal names, e-mail addresses, hotel names, trip dates or routine IDs in any file. The claude.ai routine link is typed in by the user and stored only in that browser's `localStorage`.
- No third-party scripts, CDNs, fonts or analytics. All JavaScript and CSS is local.
- Content-Security-Policy (meta tag in `index.html`): `default-src 'self'`; `connect-src` limited to the two Open-Meteo hosts, `api.github.com` and `raw.githubusercontent.com`; `script-src 'self'`; `style-src 'self'`; `frame-src 'none'`; `form-action 'none'`. There are no inline scripts and no inline style attributes.
- Fetched data is rendered with `textContent`, `createElement` and `createElementNS` only. There is no `innerHTML` anywhere. Static SVG is authored in `lib/icons.js` and `ui/`.
- Links from data are never rendered. The only links are the hard-coded ones in `index.html`, all with `rel="noopener noreferrer" target="_blank"`.
- The refresh link must start with `https://claude.ai/` and must not carry credentials (`lib/urls.js`, tested).
- `<meta name="robots" content="noindex,nofollow">` and `robots.txt` with `Disallow: /`.

## Run and test locally

```sh
node --test tests/*.test.mjs          # or: npm test
python3 -m http.server 8000           # then open http://localhost:8000/
```

The service worker only registers on `localhost` or HTTPS. The app shell is stale-while-revalidate: a changed file reaches the page on the load after the one that fetched it, even without a bump. Bump `SHELL_VERSION` in `sw.js` to force fresh caches; the activate step removes older caches.

## Deploy

GitHub Pages serves `main` from the repository root. The verdict file lives on the `claude/forecast-data` branch at `data/forecast.json`, which the app reads with the URLs in `lib/config.js`.

## Tuning

All thresholds are in `lib/config.js` and are starting points, not verified facts:

- `LIMITS`: wind limits in km/h (launch height, 850 hPa, northerly component at 850 hPa, 10 m gusts). 700 hPa has no limit: it is not scored.
- `FOEHN`: foehn class thresholds (2, 3, 6 hPa), north flow (20 km/h at 850 hPa, within 60° of north), lee humidity (850 hPa RH below 40 %), rain (0.2 mm/h, median of the consensus models), convective CAPE (800 J/kg with showers).
- `CONSENSUS_MODELS`: the five models the consensus and score use. Gusts take the second-highest model. Precipitation, CAPE and other speeds take the median; directions take the circular mean.
- `MODEL_SOURCES`: who runs each model, shown in the model-info notes next to the model names.

## Known limits

- Launch-height wind uses different pressure levels for different models (900, 925 or 850 hPa). The consensus mixes them.
- The ensemble band is shown only after the deterministic range ends (day 7).
- Modelled wind and especially gusts in complex terrain are weak signals.
