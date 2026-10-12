// One-line status under the app bar: verdict age and live-data time. Pure text, no DOM.
import { romeHHMM, hoursAgo } from './time.js';
import { t, tn } from './i18n.js';

/**
 * verdict: { state: 'loading' | 'missing' | 'ok' | 'error', generatedAt } (generatedAt in ms, when a verdict is held)
 * live: { state: 'loading' | 'ok' | 'error', at } (at in ms)
 */
export function statusLine(verdict, live, now = Date.now()) {
  let v;
  if (verdict.state === 'loading') v = t('status.loadingVerdict');
  else if (verdict.state === 'missing') v = t('status.noVerdict');
  else if (verdict.state === 'error' && !Number.isFinite(verdict.generatedAt)) v = t('status.verdictUnavailable');
  else if (verdict.state === 'error') v = t('status.refreshFailed', { time: romeHHMM(verdict.generatedAt) });
  else v = t('status.written', { time: romeHHMM(verdict.generatedAt), ago: tn('status.hoursAgo', hoursAgo(verdict.generatedAt, now)) });

  let l;
  if (live.state === 'ok') l = t('status.live', { time: romeHHMM(live.at) });
  else if (live.state === 'error') l = t('status.liveUnavailable');
  else l = t('status.liveLoading');
  return `${v} · ${l}`;
}
