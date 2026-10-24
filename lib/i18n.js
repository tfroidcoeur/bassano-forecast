// UI strings in English and Dutch (Flemish spelling), the language state, and the t() lookup.
// Pure: no DOM. Placeholders are written {name}; every key must exist in both dictionaries
// (tests/i18n.test.mjs checks this).

export const LANGS = ['en', 'nl'];
export const LOCALE = { en: 'en-GB', nl: 'nl-BE' };
export const LANG_NAMES = { en: 'English', nl: 'Nederlands' };

const en = {
  'app.title': 'Grappa forecast',
  'app.reload': 'Reload live data',
  'app.menu': 'Menu',

  'status.loadingVerdict': 'Loading verdict…',
  'status.noVerdict': 'No Claude verdict yet',
  'status.verdictUnavailable': 'Verdict unavailable',
  'status.refreshFailed': 'Verdict refresh failed, showing the one written {time}',
  'status.written': 'Verdict written {time} ({ago})',
  'status.hoursAgo.one': '{n} h ago',
  'status.hoursAgo.other': '{n} h ago',
  'status.live': 'live {time}',
  'status.liveUnavailable': 'live unavailable',
  'status.liveLoading': 'live loading…',

  'banner.offline': 'Offline — data from {time}',

  'summary.heading': 'Summary',
  'summary.none': 'No summary yet.',

  'foehn.heading': 'Foehn',
  'foehn.detailHeading': 'Foehn index, 14 days, full detail',
  'foehn.details': 'Details ↓',
  'foehn.needsLive': 'The foehn index needs live data.',
  'foehn.today': 'Today {dp}{south}',
  'foehn.todaySummary': 'Today {text}',
  'foehn.southFlow': ' (south flow)',
  'foehn.peak': 'Peak, next 5 days: {day} {dp}{south}',
  'foehn.peakNone': 'Peak, next 5 days: no data',
  'foehn.live': 'Foehn 09–17 live: {dp}',
  'foehn.dpNote': 'Bozen−Innsbruck pressure difference; negative = north foehn.',
  'foehn.summary': '09–17 most negative Bozen−Innsbruck: ECMWF {ecmwf}, ICON {icon} ({cls}). Zurich−Lugano ECMWF max {zl}.',
  'foehn.cls.none': 'no north foehn',
  'foehn.cls.weak': 'weak north foehn',
  'foehn.cls.moderate': 'moderate north foehn',
  'foehn.cls.strong': 'strong north foehn',
  'foehn.cls.unknown': 'north foehn unknown',
  'foehn.badge.none': 'No foehn',
  'foehn.badge.weak': 'Weak foehn',
  'foehn.badge.moderate': 'Moderate foehn',
  'foehn.badge.strong': 'Strong foehn',
  'foehn.badge.unknown': 'Foehn unknown',
  'foehn.badgePrefixed': '{prefix}: {label}',
  'foehn.prefixVerdict': 'verdict',
  'foehn.prefixLive': 'live',
  'foehn.explain':
    'Bozen−Innsbruck is the sea-level pressure in South Tyrol minus that in Innsbruck, in hPa. Negative values mean a north-south gradient over the Alps, i.e. north foehn in South Tyrol. Classes: under 2 hPa none, 2 to 3 weak, 3 to 6 moderate, over 6 strong. The shaded bands mark 3 and 6 hPa. The day class uses the most negative of ECMWF and ICON between 09 and 17 local time. Cross-check with the {bzDiagram} and the {srfDiagram}.',
  'foehn.explainLimits':
    'These thresholds come from South Tyrol, about 150 km north; they have not been checked against Grappa itself. The index says how strong the north flow across the Alps is, not how much of it reaches the south face.',
  'foehn.checkLive': 'Check it live',
  'live.dolomiti': '{link} — the regional bulletin; it names foehn in the valleys and the Prealps when expected.',
  'live.stations': '{link} — pick Monte Tomba (next to Grappa) for measured wind and gusts at ridge height.',
  'live.windfinder': '{link} — the summit station.',

  'link.bzDiagram': 'South Tyrol foehn diagram',
  'link.srfDiagram': 'SRF foehn diagram',
  'link.dolomiti': 'ARPAV Dolomiti Meteo',
  'link.stations': 'ARPAV live stations',
  'link.windfinder': 'Live wind Cima Grappa',
  'link.meteoParapente': 'meteo-parapente',
  'link.windy': 'Windy',
  'link.windfinderMenu': 'Live wind Cima Grappa (windfinder)',
  'link.stationsMenu': 'ARPAV live stations (pick Monte Tomba)',
  'link.dolomitiMenu': 'ARPAV Dolomiti Meteo bulletin',
  'link.cimaStation': 'Cima Grappa station',
  'link.club': 'Club Volo Libero Montegrappa',

  'tabs.days': 'Days',
  'tab.verdict': ', {verdict}',
  'verdict.good': 'Good',
  'verdict.marginal': 'Marginal',
  'verdict.no': 'No',
  'verdict.none': 'No verdict',
  'score.good': 'good',
  'score.marginal': 'marginal',
  'score.no': 'no',
  'score.noData': 'no data',

  'outlook.heading': 'Outlook — low confidence',
  'outlook.likely': 'Likely',
  'outlook.possible': 'Possible',
  'outlook.unlikely': 'Unlikely',
  'outlook.unknown': 'Unknown',
  'confidence.low': 'low confidence',
  'confidence.veryLow': 'very low confidence',

  'verdict.noYet': 'No Claude verdict yet.',
  'verdict.noDay': 'No Claude verdict for this day yet.',
  'card.window': 'Window: {window}',
  'card.windowLiveRed': 'Live data now shows red hours inside this window; they are left out of the outline below.',
  'card.risk': 'Main risk:',
  'day.needsLive': 'Live tables are unavailable. Use Reload live data.',
  'day.strip': 'Hours at a glance',
  'day.stripHead': '09–17 local, verdict: {verdict}',
  'day.stripLegend': 'Green good, amber marginal, red no. Outlined: the verdict window.',
  'strip.label': 'Hour scores: {words}{window}',
  'strip.window': '; verdict window {from} to {to}',
  'day.hourly': 'Hourly, 09–17 local',
  'day.heights':
    'Heights: 1000 m ≈ 900 hPa, 1500 m ≈ 850 hPa, 3000 m ≈ 700 hPa. N-flow: north part of the 850/700 hPa wind. Ceiling: cloud base in hundreds of metres. T: temperature in °C at the heights of the wind rows: 2 m above the launch (830 m), 1000, 1500 and 3000 m; median of the five consensus models. Spr: range across the five consensus models (wind and gust in the chosen unit; dir in ± degrees).',
  'day.compare': 'Compare the models',
  'day.compareSub': 'wind at 10 m, gusts, wind at 1000 m — one line per model',
  'more.show': 'More values',
  'more.hide': 'Fewer values',

  'grid.hour': 'Hour',
  'grid.wx': 'Wx',
  'grid.wind10': '10 m',
  'grid.gust': 'Gust',
  'grid.h1000': '1000 m',
  'grid.h1500': '1500 m',
  'grid.h3000': '3000 m',
  'grid.north': 'N-flow',
  'lr.northFlow': 'N-flow',
  'grid.rain': 'Rain',
  'grid.cape': 'CAPE',
  'grid.ceiling': 'Ceiling',
  'grid.temp': 'T {height}',
  'grid.temp2m': 'T 2 m',
  'more.cloud': 'Cloud %',
  'more.rainMm': 'Rain mm',
  'more.spr10': 'Spr 10 m',
  'more.sprDir': 'Spr dir',
  'more.sprGust': 'Spr gust',
  'wx.clear': 'Sunny',
  'wx.partly': 'Partly cloudy',
  'wx.overcast': 'Overcast',
  'wx.fog': 'Fog',
  'wx.drizzle': 'Drizzle',
  'wx.rain': 'Rain',
  'wx.showers': 'Showers',
  'wx.snow': 'Snow',
  'wx.thunder': 'Thunderstorm',

  'models.wind10': '10 m wind',
  'models.gust10': '10 m gust',
  'models.wind1000': '1000 m wind',
  'models.sparkTitle': '{title}, 09–17, {unit}',
  'models.caption': '{title} ({unit})',
  'models.extra': 'Thin grey: {models} (extra models).',
  'models.abbr': 'Abbreviations: ICON, ECMWF, GFS, AROME; 1000 m ≈ 900 hPa, 1500 m ≈ 850 hPa, 3000 m ≈ 700 hPa.',

  'lr.heading': 'Long range — ensemble, low confidence',
  'lr.note':
    'ECMWF ensemble at the launch point, pooled over its members. Rain, wind and foehn use 09–17 local time, temperature the whole day. Wind: median with p10–p90 and the mean direction. Rain: share of members with at least 1 mm. North flow: share of member-hours at least 20 km/h from within 60° of north at 850 or 700 hPa. Foehn: Bozen−Innsbruck, member minimum, p10 / p50 / p90. From day 6 on (faded) the forecast is less reliable.',
  'lr.needsLive': 'Long range needs live data. Use Reload live data.',
  'lr.unavailable': 'Long-range data unavailable. Use Reload live data.',
  'lr.title': 'Long-range wind and rain chance, 14 days',
  'lr.desc': 'Median 1500 m and 3000 m wind with shaded p10 to p90 bands, and a rain chance bar per day. Days from 6 ahead are faded.',
  'lr.legMed1500': '1500 m median (≈850 hPa)',
  'lr.legMed3000': '3000 m median (≈700 hPa)',
  'lr.legBand': 'p10–p90 band',
  'lr.legRain': 'rain chance, ≥1 mm',
  'lr.legFar': 'faded: 6+ days ahead',
  'lr.legNote': 'Wind and rain 09–17 local. Km/h or kt as set in the menu.',
  'lr.rain': 'Rain ≥1 mm',
  'lr.foehn': 'Foehn hPa',
  'lr.temp': 'Temp °C',

  'chart.title': 'Foehn index: Bozen minus Innsbruck pressure difference',
  'chart.desc':
    'Negative values mean north foehn in South Tyrol. Solid line ECMWF, dashed ICON, thin grey Zurich minus Lugano (ECMWF). Shaded bands at 3 and 6 hPa.',
  'chart.bandModerate': 'N foehn moderate',
  'chart.bandStrong': 'N foehn strong',
  'chart.now': 'now',
  'chart.negative': 'Negative = north foehn (Bozen−Innsbruck); Zurich−Lugano positive = north foehn.',
  'chart.keyEcmwf': 'Bozen−Innsbruck ECMWF',
  'chart.keyIcon': 'Bozen−Innsbruck ICON',
  'chart.keyZl': 'Zurich−Lugano ECMWF',
  'chart.keyEns': 'Ensemble 10–90 % and median (beyond 7 days)',
  'chart.keyBand': 'Shaded: 3 and 6 hPa',

  'compass.N': 'N',
  'compass.NNE': 'NNE',
  'compass.NE': 'NE',
  'compass.ENE': 'ENE',
  'compass.E': 'E',
  'compass.ESE': 'ESE',
  'compass.SE': 'SE',
  'compass.SSE': 'SSE',
  'compass.S': 'S',
  'compass.SSW': 'SSW',
  'compass.SW': 'SW',
  'compass.WSW': 'WSW',
  'compass.W': 'W',
  'compass.WNW': 'WNW',
  'compass.NW': 'NW',
  'compass.NNW': 'NNW',

  'menu.refresh': 'Refresh verdict',
  'menu.reload': 'Reload live data',
  'menu.unit': 'Wind unit: {unit} (switch to {other})',
  'menu.language': 'Language: {current} (switch to {other})',
  'menu.settings': 'Settings',
  'menu.links': 'Links',
  'menu.about': 'About and disclaimer',
  'menu.aboutText':
    'Model estimates from Open-Meteo, written partly by an AI. Weather only. The local schools and the pilot decide whether to fly. Self-brief airspace and NOTAMs.',
  'footer.disclaimer':
    'Model estimates, written partly by an AI. Weather only — the local schools and you decide whether to fly. Self-brief airspace and NOTAMs.',
  'action.close': 'Close',
  'action.save': 'Save',
  'action.show': 'Show',
  'action.hide': 'Hide',

  'settings.title': 'Settings',
  'settings.routineLabel': 'Routine link (https://claude.ai/…)',
  'settings.invalid': 'The link must start with https://claude.ai/',
  'refresh.setLink': 'Set the claude.ai routine link in Settings first.',
  'refresh.waiting': 'Waiting for a new verdict… ({checks}/{max})',
  'refresh.written': 'New verdict written {time}.',
  'refresh.giveUp': 'No new verdict after 10 minutes. Check the routine on claude.ai.',

  // Model-info notes (lib/info.js): {models} the median's models, {extra} the extra runs, {foehn} the foehn models.
  'info.button': 'Models used: {what}',
  'info.whatVerdict': 'the written verdict',
  'info.foehnCard':
    'Live from Open-Meteo: sea-level pressure of {foehn} at Bolzano and Innsbruck. Today and the peak use, per model, the mean over 09–17 local time, then the more negative of the two.',
  'info.verdict':
    'Written by the forecast routine (an AI), not live. It reads the consensus of {models}, the foehn index of {foehn}, and the ECMWF, GFS and ICON ensembles, as they stood when it ran (the time is in the status line).',
  'info.strip': "Live: each hour is scored on the median of {models} at the launch point, plus the day's foehn class from {foehn}.",
  'info.grid':
    "Live from Open-Meteo at the launch point (830 m). Each value is the median of {models}; directions are averaged and the gust is the second-highest of them. Weather icon: ICON. Ceiling: the GFS boundary layer or the cloud base, whichever is lower. ICON and AROME are Open-Meteo's seamless series: the high-resolution run first, then the coarser one.",
  'info.compare':
    'Coloured lines: {models}, the models of the median above. Thin grey: {extra}, high-resolution short-range runs for comparison only. They reach only one to five days ahead and do not enter the median or the score.',
  'info.outlook':
    'Written by the forecast routine (an AI), not live, from the ECMWF, GFS and ICON ensembles: rain, wind at 1500 and 3000 m, north flow and Bozen−Innsbruck.',
  'info.longRange':
    "Live from Open-Meteo: the ECMWF ensemble (51 members) at the launch point. The foehn row uses the same ensemble's sea-level pressure at Bolzano and Innsbruck. The written outlook above also uses the GFS and ICON ensembles.",
  'info.foehnChart':
    'Live from Open-Meteo: sea-level pressure of {foehn} for the first 7 days (Zurich−Lugano: ECMWF only), then the ECMWF ensemble: median and 10–90 % band.',
};

const nl = {
  'app.title': 'Grappa-verwachting',
  'app.reload': 'Live data herladen',
  'app.menu': 'Menu',

  'status.loadingVerdict': 'Beoordeling laden…',
  'status.noVerdict': 'Nog geen Claude-beoordeling',
  'status.verdictUnavailable': 'Beoordeling niet beschikbaar',
  'status.refreshFailed': 'Verversen van de beoordeling mislukt, de beoordeling van {time} wordt getoond',
  'status.written': 'Beoordeling geschreven {time} ({ago})',
  'status.hoursAgo.one': '{n} u geleden',
  'status.hoursAgo.other': '{n} u geleden',
  'status.live': 'live {time}',
  'status.liveUnavailable': 'live niet beschikbaar',
  'status.liveLoading': 'live laden…',

  'banner.offline': 'Offline — gegevens van {time}',

  'summary.heading': 'Samenvatting',
  'summary.none': 'Nog geen samenvatting.',

  'foehn.heading': 'Föhn',
  'foehn.detailHeading': 'Föhnindex, 14 dagen, volledig',
  'foehn.details': 'Details ↓',
  'foehn.needsLive': 'De föhnindex heeft live data nodig.',
  'foehn.today': 'Vandaag {dp}{south}',
  'foehn.todaySummary': 'Vandaag {text}',
  'foehn.southFlow': ' (zuidenstroming)',
  'foehn.peak': 'Piek, komende 5 dagen: {day} {dp}{south}',
  'foehn.peakNone': 'Piek, komende 5 dagen: geen gegevens',
  'foehn.live': 'Föhn 09–17 live: {dp}',
  'foehn.dpNote': 'Drukverschil Bozen−Innsbruck; negatief = noordföhn.',
  'foehn.summary': '09–17 meest negatieve Bozen−Innsbruck: ECMWF {ecmwf}, ICON {icon} ({cls}). Zurich−Lugano ECMWF max {zl}.',
  'foehn.cls.none': 'geen noordföhn',
  'foehn.cls.weak': 'zwakke noordföhn',
  'foehn.cls.moderate': 'matige noordföhn',
  'foehn.cls.strong': 'sterke noordföhn',
  'foehn.cls.unknown': 'noordföhn onbekend',
  'foehn.badge.none': 'Geen föhn',
  'foehn.badge.weak': 'Zwakke föhn',
  'foehn.badge.moderate': 'Matige föhn',
  'foehn.badge.strong': 'Sterke föhn',
  'foehn.badge.unknown': 'Föhn onbekend',
  'foehn.badgePrefixed': '{prefix}: {label}',
  'foehn.prefixVerdict': 'beoordeling',
  'foehn.prefixLive': 'live',
  'foehn.explain':
    'Bozen−Innsbruck is de zeeniveaudruk in Zuid-Tirol min die in Innsbruck, in hPa. Negatieve waarden betekenen een noord-zuidgradiënt over de Alpen, dus noordföhn in Zuid-Tirol. Klassen: onder 2 hPa geen, 2 tot 3 zwak, 3 tot 6 matig, boven 6 sterk. De gearceerde banden markeren 3 en 6 hPa. De dagklasse neemt de meest negatieve waarde van ECMWF en ICON tussen 09 en 17 lokale tijd. Controleer ook met het {bzDiagram} en het {srfDiagram}.',
  'foehn.explainLimits':
    'Deze drempels komen uit Zuid-Tirol, zo’n 150 km noordelijker; ze zijn nog niet getoetst aan de Grappa zelf. De index zegt hoe sterk de noordelijke stroming over de Alpen is, niet hoeveel ervan de zuidkant bereikt.',
  'foehn.checkLive': 'Controleer live',
  'live.dolomiti': '{link} — het regionale bulletin; het meldt föhn in de dalen en de Voralpen wanneer die verwacht wordt.',
  'live.stations': '{link} — kies Monte Tomba (naast de Grappa) voor gemeten wind en rukwinden op kamhoogte.',
  'live.windfinder': '{link} — het station op de top.',

  'link.bzDiagram': 'föhndiagram Zuid-Tirol',
  'link.srfDiagram': 'SRF-föhndiagram',
  'link.dolomiti': 'ARPAV Dolomiti Meteo',
  'link.stations': 'ARPAV-meetstations live',
  'link.windfinder': 'Live wind Cima Grappa',
  'link.meteoParapente': 'meteo-parapente',
  'link.windy': 'Windy',
  'link.windfinderMenu': 'Live wind Cima Grappa (windfinder)',
  'link.stationsMenu': 'ARPAV-meetstations (kies Monte Tomba)',
  'link.dolomitiMenu': 'ARPAV Dolomiti Meteo-bulletin',
  'link.cimaStation': 'Weerstation Cima Grappa',
  'link.club': 'Club Volo Libero Montegrappa',

  'tabs.days': 'Dagen',
  'tab.verdict': ', {verdict}',
  'verdict.good': 'Goed',
  'verdict.marginal': 'Marginaal',
  'verdict.no': 'Nee',
  'verdict.none': 'Geen beoordeling',
  'score.good': 'goed',
  'score.marginal': 'marginaal',
  'score.no': 'nee',
  'score.noData': 'geen gegevens',

  'outlook.heading': 'Vooruitblik — lage zekerheid',
  'outlook.likely': 'Waarschijnlijk',
  'outlook.possible': 'Mogelijk',
  'outlook.unlikely': 'Onwaarschijnlijk',
  'outlook.unknown': 'Onbekend',
  'confidence.low': 'lage zekerheid',
  'confidence.veryLow': 'zeer lage zekerheid',

  'verdict.noYet': 'Nog geen Claude-beoordeling.',
  'verdict.noDay': 'Nog geen Claude-beoordeling voor deze dag.',
  'card.window': 'Venster: {window}',
  'card.windowLiveRed': 'De live gegevens tonen nu rode uren in dit venster; die vallen buiten de omlijning hieronder.',
  'card.risk': 'Belangrijkste risico:',
  'day.needsLive': 'De live tabellen zijn niet beschikbaar. Gebruik Live data herladen.',
  'day.strip': 'Uren in één oogopslag',
  'day.stripHead': '09–17 lokaal, beoordeling: {verdict}',
  'day.stripLegend': 'Groen goed, oranje marginaal, rood nee. Omlijnd: het vliegvenster.',
  'strip.label': 'Scores per uur: {words}{window}',
  'strip.window': '; vliegvenster {from} tot {to}',
  'day.hourly': 'Per uur, 09–17 lokaal',
  'day.heights':
    'Hoogtes: 1000 m ≈ 900 hPa, 1500 m ≈ 850 hPa, 3000 m ≈ 700 hPa. N-wind: het noordelijke deel van de wind op 850/700 hPa. Plafond: wolkenbasis in honderden meters. T: temperatuur in °C op de hoogtes van de windrijen: 2 m boven de startplaats (830 m), 1000, 1500 en 3000 m; mediaan van de vijf consensusmodellen. Spr: spreiding over de vijf consensusmodellen (wind en vlaag in de gekozen eenheid; richting in ± graden).',
  'day.compare': 'Vergelijk de modellen',
  'day.compareSub': 'wind op 10 m, rukwinden, wind op 1000 m — één lijn per model',
  'more.show': 'Meer waarden',
  'more.hide': 'Minder waarden',

  'grid.hour': 'Uur',
  'grid.wx': 'Wx',
  'grid.wind10': '10 m',
  'grid.gust': 'Vlaag',
  'grid.h1000': '1000 m',
  'grid.h1500': '1500 m',
  'grid.h3000': '3000 m',
  'grid.north': 'N-wind',
  'lr.northFlow': 'N-stroming',
  'grid.rain': 'Regen',
  'grid.cape': 'CAPE',
  'grid.ceiling': 'Plafond',
  'grid.temp': 'T {height}',
  'grid.temp2m': 'T 2 m',
  'more.cloud': 'Wolk %',
  'more.rainMm': 'Reg. mm',
  'more.spr10': 'Spr 10 m',
  'more.sprDir': 'Spr ±°',
  'more.sprGust': 'Spr vlaag',
  'wx.clear': 'Zonnig',
  'wx.partly': 'Halfbewolkt',
  'wx.overcast': 'Bewolkt',
  'wx.fog': 'Mist',
  'wx.drizzle': 'Motregen',
  'wx.rain': 'Regen',
  'wx.showers': 'Buien',
  'wx.snow': 'Sneeuw',
  'wx.thunder': 'Onweer',

  'models.wind10': '10 m wind',
  'models.gust10': '10 m rukwind',
  'models.wind1000': '1000 m wind',
  'models.sparkTitle': '{title}, 09–17, {unit}',
  'models.caption': '{title} ({unit})',
  'models.extra': 'Dunne grijs: {models} (extra modellen).',
  'models.abbr': 'Afkortingen: ICON, ECMWF, GFS, AROME; 1000 m ≈ 900 hPa, 1500 m ≈ 850 hPa, 3000 m ≈ 700 hPa.',

  'lr.heading': 'Lange termijn — ensemble, lage zekerheid',
  'lr.note':
    'ECMWF-ensemble op de startplaats, samengevoegd over de leden. Regen, wind en föhn gebruiken 09–17 lokale tijd, temperatuur de hele dag. Wind: mediaan met p10–p90 en de gemiddelde richting. Regen: aandeel leden met minstens 1 mm. Noordstroming: aandeel ledenuren met minstens 20 km/h uit binnen 60° van het noorden op 850 of 700 hPa. Föhn: Bozen−Innsbruck, minimum per lid, p10 / p50 / p90. Vanaf dag 6 (vervaagd) is de verwachting minder betrouwbaar.',
  'lr.needsLive': 'De lange termijn heeft live data nodig. Gebruik Live data herladen.',
  'lr.unavailable': 'Gegevens lange termijn niet beschikbaar. Gebruik Live data herladen.',
  'lr.title': 'Lange termijn: wind en kans op regen, 14 dagen',
  'lr.desc':
    'Mediane wind op 1500 m en 3000 m met gearceerde p10–p90-banden, en per dag een balk voor de kans op regen. Dagen vanaf 6 vooruit zijn vervaagd.',
  'lr.legMed1500': '1500 m mediaan (≈850 hPa)',
  'lr.legMed3000': '3000 m mediaan (≈700 hPa)',
  'lr.legBand': 'p10–p90-band',
  'lr.legRain': 'kans op regen, ≥1 mm',
  'lr.legFar': 'vervaagd: 6+ dagen vooruit',
  'lr.legNote': 'Wind en regen 09–17 lokaal. Km/h of kt, zoals ingesteld in het menu.',
  'lr.rain': 'Regen ≥1 mm',
  'lr.foehn': 'Föhn hPa',
  'lr.temp': 'Temp °C',

  'chart.title': 'Föhnindex: drukverschil Bozen min Innsbruck',
  'chart.desc':
    'Negatieve waarden betekenen noordföhn in Zuid-Tirol. Doorgetrokken lijn ECMWF, gestreepte lijn ICON, dunne grijze lijn Zurich min Lugano (ECMWF). Gearceerde banden op 3 en 6 hPa.',
  'chart.bandModerate': 'N-föhn matig',
  'chart.bandStrong': 'N-föhn sterk',
  'chart.now': 'nu',
  'chart.negative': 'Negatief = noordföhn (Bozen−Innsbruck); Zurich−Lugano positief = noordföhn.',
  'chart.keyEcmwf': 'Bozen−Innsbruck ECMWF',
  'chart.keyIcon': 'Bozen−Innsbruck ICON',
  'chart.keyZl': 'Zurich−Lugano ECMWF',
  'chart.keyEns': 'Ensemble 10–90 % en mediaan (na 7 dagen)',
  'chart.keyBand': 'Gearceerd: 3 en 6 hPa',

  'compass.N': 'N',
  'compass.NNE': 'NNO',
  'compass.NE': 'NO',
  'compass.ENE': 'ONO',
  'compass.E': 'O',
  'compass.ESE': 'OZO',
  'compass.SE': 'ZO',
  'compass.SSE': 'ZZO',
  'compass.S': 'Z',
  'compass.SSW': 'ZZW',
  'compass.SW': 'ZW',
  'compass.WSW': 'WZW',
  'compass.W': 'W',
  'compass.WNW': 'WNW',
  'compass.NW': 'NW',
  'compass.NNW': 'NNW',

  'menu.refresh': 'Beoordeling verversen',
  'menu.reload': 'Live data herladen',
  'menu.unit': 'Windeenheid: {unit} (wissel naar {other})',
  'menu.language': 'Taal: {current} (wissel naar {other})',
  'menu.settings': 'Instellingen',
  'menu.links': 'Links',
  'menu.about': 'Over en disclaimer',
  'menu.aboutText':
    'Modelschattingen van Open-Meteo, deels geschreven door een AI. Enkel weer. De lokale scholen en de piloot beslissen of er gevlogen wordt. Zelf luchtruim en NOTAMs nakijken.',
  'footer.disclaimer':
    'Modelschattingen, deels geschreven door een AI. Enkel weer — de lokale scholen en jij beslissen of er gevlogen wordt. Zelf luchtruim en NOTAMs nakijken.',
  'action.close': 'Sluiten',
  'action.save': 'Opslaan',
  'action.show': 'Toon',
  'action.hide': 'Verberg',

  'settings.title': 'Instellingen',
  'settings.routineLabel': 'Link naar de routine (https://claude.ai/…)',
  'settings.invalid': 'De link moet beginnen met https://claude.ai/',
  'refresh.setLink': 'Stel eerst de link naar de claude.ai-routine in bij Instellingen.',
  'refresh.waiting': 'Wachten op een nieuwe beoordeling… ({checks}/{max})',
  'refresh.written': 'Nieuwe beoordeling geschreven om {time}.',
  'refresh.giveUp': 'Geen nieuwe beoordeling na 10 minuten. Controleer de routine op claude.ai.',

  'info.button': 'Gebruikte modellen: {what}',
  'info.whatVerdict': 'de geschreven beoordeling',
  'info.foehnCard':
    'Live van Open-Meteo: luchtdruk op zeeniveau van {foehn} in Bolzano en Innsbruck. Vandaag en de piek gebruiken per model het gemiddelde tussen 09 en 17 uur lokale tijd, en daarvan het meest negatieve.',
  'info.verdict':
    'Geschreven door de forecast-routine (een AI), niet live. Ze leest de consensus van {models}, de föhnindex van {foehn} en de ensembles van ECMWF, GFS en ICON, zoals die waren toen ze liep (het tijdstip staat in de statusregel).',
  'info.strip': 'Live: elk uur krijgt een score op basis van de mediaan van {models} op de startplaats, plus de föhnklasse van de dag volgens {foehn}.',
  'info.grid':
    'Live van Open-Meteo op de startplaats (830 m). Elke waarde is de mediaan van {models}; richtingen worden uitgemiddeld en de rukwind is de op één na hoogste van de modellen. Weericoon: ICON. Plafond: de grenslaag van GFS of de wolkenbasis, de laagste van de twee. ICON en AROME zijn de doorlopende reeksen van Open-Meteo: eerst het model met hoge resolutie, daarna het grovere.',
  'info.compare':
    'Gekleurde lijnen: {models}, de modellen van de mediaan hierboven. Dun grijs: {extra}, modellen met hoge resolutie voor de korte termijn, alleen ter vergelijking. Ze reiken maar één tot vijf dagen vooruit en tellen niet mee in de mediaan of de score.',
  'info.outlook':
    'Geschreven door de forecast-routine (een AI), niet live, op basis van de ensembles van ECMWF, GFS en ICON: regen, wind op 1500 en 3000 m, noordenstroming en Bozen−Innsbruck.',
  'info.longRange':
    'Live van Open-Meteo: het ECMWF-ensemble (51 leden) op de startplaats. De föhnrij gebruikt de luchtdruk op zeeniveau van hetzelfde ensemble in Bolzano en Innsbruck. De geschreven vooruitblik hierboven gebruikt ook de ensembles van GFS en ICON.',
  'info.foehnChart':
    'Live van Open-Meteo: luchtdruk op zeeniveau van {foehn} voor de eerste 7 dagen (Zurich−Lugano: alleen ECMWF), daarna het ECMWF-ensemble: mediaan en band van 10–90 %.',
};

export const DICT = { en, nl };

let current = 'en';

/** The language for a browser language list (navigator.languages): any nl* is Dutch, everything else English. */
export function detectLang(languages = []) {
  return languages.some((l) => typeof l === 'string' && /^nl/i.test(l)) ? 'nl' : 'en';
}

export function getLang() {
  return current;
}

export function setLang(lang) {
  if (LANGS.includes(lang)) current = lang;
  return current;
}

/** Text for a key, with {name} placeholders filled from params. Unknown keys return the key; unfilled placeholders stay. */
export function t(key, params = {}, lang = current) {
  const s = DICT[lang]?.[key] ?? DICT.en[key];
  if (s === undefined) return key;
  return s.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(params, name) ? String(params[name]) : match));
}

/** Plural form: key.one or key.other by the locale's plural rule for n; n is also a placeholder. */
export function tn(key, n, params = {}, lang = current) {
  const form = new Intl.PluralRules(LOCALE[lang]).select(n) === 'one' ? 'one' : 'other';
  return t(`${key}.${form}`, { ...params, n }, lang);
}

/** A number with a fixed number of decimals, in the language's decimal separator (2.3 becomes 2,3 in Dutch). */
export function formatDecimal(value, digits, lang = current) {
  return new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}
