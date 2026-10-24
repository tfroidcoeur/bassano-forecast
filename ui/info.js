// The blue "i" buttons: a small round button after a heading; a tap shows a popup with the models that feed
// that part of the page. One popup for the whole page, placed under the button (above it near the bottom of the
// screen) with an arrow to it. A tap outside, Escape, or the same button closes it.
// Static buttons are in index.html (named by fillStaticInfo); the day panel builds its own with withInfo.
import { el } from './dom.js';
import { t } from '../lib/i18n.js';
import { infoText } from '../lib/info.js';

const GAP = 8; // px between the button and the popup
const MARGIN = 12; // px kept free at the screen edges
const ARROW_INSET = 14; // px: the arrow stays this far from the popup's corners

let pop = null; // the popup, created by wireInfo
let live = null; // visually hidden live region, so a screen reader reads the text when the popup opens
let anchor = null; // the button whose popup is open

function label(what) {
  return t('info.button', { what });
}

/** The button for one part. what: the visible name of the part, for the label and the popup title. */
export function infoButton(key, what) {
  return el(
    'button',
    {
      type: 'button',
      class: 'info-btn',
      'data-info': key,
      'data-what': what,
      'aria-expanded': 'false',
      'aria-controls': 'info-pop',
      'aria-label': label(what),
      title: label(what),
    },
    'i'
  );
}

/** A heading (or any line) followed by its button. cls: the row's margin class. */
export function withInfo(line, key, what, cls = '') {
  return el('div', { class: cls ? `head-row ${cls}` : 'head-row' }, line, infoButton(key, what));
}

/** Names the static buttons (data-static) after the heading before them. Call after applyStatic. */
export function fillStaticInfo(root = document) {
  for (const btn of root.querySelectorAll('.info-btn[data-static]')) {
    const what = btn.previousElementSibling?.textContent ?? '';
    btn.dataset.what = what;
    btn.setAttribute('aria-label', label(what));
    btn.setAttribute('title', label(what));
  }
}

function fill() {
  pop.replaceChildren(
    el('p', { class: 'info-pop-title', text: label(anchor.dataset.what ?? '') }),
    el('p', { text: infoText(anchor.dataset.info) })
  );
}

/** Puts the open popup next to its button, inside the screen. Closes it when the button is gone or off screen. */
function place() {
  if (!anchor) return;
  if (!anchor.isConnected) {
    closeInfo();
    return;
  }
  const r = anchor.getBoundingClientRect();
  const vh = window.innerHeight;
  if (r.bottom < 0 || r.top > vh) {
    closeInfo();
    return;
  }
  const vw = document.documentElement.clientWidth;
  const w = pop.offsetWidth;
  const h = pop.offsetHeight;
  const cx = r.left + r.width / 2;
  const left = Math.min(Math.max(MARGIN, cx - w / 2), vw - MARGIN - w);
  const below = r.bottom + GAP + h <= vh - MARGIN || r.top - GAP - h < MARGIN;
  pop.dataset.side = below ? 'below' : 'above';
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(below ? r.bottom + GAP : r.top - GAP - h)}px`;
  pop.style.setProperty('--arrow-x', `${Math.round(Math.min(Math.max(ARROW_INSET, cx - left), w - ARROW_INSET))}px`);
}

function openInfo(btn) {
  if (anchor) anchor.setAttribute('aria-expanded', 'false');
  anchor = btn;
  btn.setAttribute('aria-expanded', 'true');
  fill();
  pop.hidden = false;
  place();
  live.textContent = infoText(btn.dataset.info);
}

/** Closes the popup; focus: give the focus back to its button (after Escape). */
export function closeInfo({ focus = false } = {}) {
  if (!anchor) return;
  const btn = anchor;
  anchor = null;
  btn.setAttribute('aria-expanded', 'false');
  pop.hidden = true;
  live.textContent = '';
  if (focus && btn.isConnected) btn.focus();
}

/** After a render: closes the popup when its button was rebuilt, else redraws it (the language may have changed). */
export function refreshInfo() {
  if (!anchor) return;
  if (!anchor.isConnected) {
    closeInfo();
    return;
  }
  fill();
  place();
}

/** Creates the popup and the handlers for every info button, present and future. Call once. */
export function wireInfo(doc = document) {
  pop = el('div', { id: 'info-pop', class: 'info-pop' });
  pop.hidden = true;
  live = el('span', { class: 'visually-hidden', 'aria-live': 'polite' });
  doc.body.append(pop, live);
  doc.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.info-btn');
    if (!btn) return;
    if (btn === anchor) closeInfo();
    else openInfo(btn);
  });
  // A tap anywhere else closes it; taps on the popup and on the buttons are left to the click handler.
  doc.addEventListener('pointerdown', (e) => {
    if (anchor && !e.target.closest?.('.info-pop, .info-btn')) closeInfo();
  });
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && anchor) closeInfo({ focus: true });
  });
  // The popup is fixed on the screen, so it follows its button on scroll (capture: any scrolling element).
  window.addEventListener('scroll', place, { passive: true, capture: true });
  window.addEventListener('resize', place);
}
