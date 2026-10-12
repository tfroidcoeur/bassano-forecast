// Fills the static parts of index.html from the dictionary. Text always goes in through textContent.
import { t, getLang } from '../lib/i18n.js';

/**
 * A paragraph or list item with links: data-i18n-rich="key" holds a template with {name} tokens, and each
 * <a data-link="name"> in the element (with its href kept from the HTML) is moved into the text where its token is.
 */
function fillRich(node) {
  const links = new Map([...node.querySelectorAll('a[data-link]')].map((a) => [a.dataset.link, a]));
  const parts = t(node.dataset.i18nRich).split(/(\{\w+\})/);
  node.replaceChildren(
    ...parts
      .map((part) => {
        const m = /^\{(\w+)\}$/.exec(part);
        return m && links.has(m[1]) ? links.get(m[1]) : part;
      })
      .filter((part) => part !== '')
  );
}

/** Sets the language on <html> and every data-i18n element; call again after a language switch. */
export function applyStatic(root = document) {
  root.documentElement.lang = getLang();
  for (const node of root.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of root.querySelectorAll('[data-i18n-aria]')) node.setAttribute('aria-label', t(node.dataset.i18nAria));
  for (const node of root.querySelectorAll('[data-i18n-title]')) node.setAttribute('title', t(node.dataset.i18nTitle));
  for (const node of root.querySelectorAll('[data-i18n-show]')) node.dataset.show = t(node.dataset.i18nShow);
  for (const node of root.querySelectorAll('[data-i18n-hide]')) node.dataset.hide = t(node.dataset.i18nHide);
  for (const node of root.querySelectorAll('[data-i18n-rich]')) fillRich(node);
}
