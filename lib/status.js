// One-line status under the app bar: verdict age and live-data time. Pure text, no DOM.
import { romeHHMM, hoursAgo } from './time.js';

/**
 * verdict: { state: 'loading' | 'missing' | 'ok' | 'error', generatedAt } (generatedAt in ms, when a verdict is held)
 * live: { state: 'loading' | 'ok' | 'error', at } (at in ms)
 */
export function statusLine(verdict, live, now = Date.now()) {
  let v;
  if (verdict.state === 'loading') v = 'Loading verdict…';
  else if (verdict.state === 'missing') v = 'No Claude verdict yet';
  else if (verdict.state === 'error' && !Number.isFinite(verdict.generatedAt)) v = 'Verdict unavailable';
  else if (verdict.state === 'error') v = `Verdict refresh failed, showing the one written ${romeHHMM(verdict.generatedAt)}`;
  else v = `Verdict written ${romeHHMM(verdict.generatedAt)} (${hoursAgo(verdict.generatedAt, now)} h ago)`;

  let l;
  if (live.state === 'ok') l = `live ${romeHHMM(live.at)}`;
  else if (live.state === 'error') l = 'live unavailable';
  else l = 'live loading…';
  return `${v} · ${l}`;
}
