// The blue "i" buttons: a small toggle next to a heading that shows which models feed that part of the page.
// Static buttons and notes are in index.html (filled by fillStaticInfo); the day panel builds its own with withInfo.
import { el } from './dom.js';
import { t } from '../lib/i18n.js';
import { infoText } from '../lib/info.js';

const open = new Set(); // notes shown this session; the day panel is rebuilt on every day switch

function label(what) {
  return t('info.button', { what });
}

/** The button for one note. what: the visible name of the part, for the accessible label. */
export function infoButton(key, what) {
  return el(
    'button',
    {
      type: 'button',
      class: 'info-btn',
      'data-info': key,
      'aria-expanded': open.has(key) ? 'true' : 'false',
      'aria-controls': `info-${key}`,
      'aria-label': label(what),
      title: label(what),
    },
    'i'
  );
}

/** The note for one button, hidden unless it was opened this session. */
export function infoNote(key) {
  const note = el('p', { class: 'info-note', id: `info-${key}`, text: infoText(key) });
  note.hidden = !open.has(key);
  return note;
}

/** A heading (or any line) with its button, and the note under it: [row, note]. cls: the row's margin class. */
export function withInfo(line, key, what, cls = '') {
  return [el('div', { class: cls ? `head-row ${cls}` : 'head-row' }, line, infoButton(key, what)), infoNote(key)];
}

/** Texts of the static buttons (data-static, named after the heading before them) and their notes. Call after applyStatic. */
export function fillStaticInfo(root = document) {
  for (const btn of root.querySelectorAll('.info-btn[data-static]')) {
    const what = btn.previousElementSibling?.textContent ?? '';
    btn.setAttribute('aria-label', label(what));
    btn.setAttribute('title', label(what));
    const note = root.getElementById(`info-${btn.dataset.info}`);
    if (note) note.textContent = infoText(btn.dataset.info);
  }
}

/** One click handler for every info button, present and future. */
export function wireInfo(root = document) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.info-btn');
    if (!btn) return;
    const key = btn.dataset.info;
    const show = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', show ? 'true' : 'false');
    const note = root.getElementById(`info-${key}`);
    if (note) note.hidden = !show;
    if (show) open.add(key);
    else open.delete(key);
  });
}
