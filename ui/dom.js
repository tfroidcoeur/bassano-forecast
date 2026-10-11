// DOM helpers. Text always goes in through textContent; SVG is built with createElementNS.

const SVG_NS = 'http://www.w3.org/2000/svg';

/** el('p', { class: 'x' }, 'text', childNode) */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function svgEl(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (c) node.append(c);
  }
  return node;
}

/** Turns an icon descriptor { t, a, c } into SVG nodes. */
export function shapeNode(desc) {
  return svgEl(desc.t, desc.a, ...(desc.c ?? []).map(shapeNode));
}

/** Arrow pointing where the wind blows to (Windy convention). dirFrom in degrees. */
export function arrowSvg(dirFrom) {
  const svg = svgEl('svg', { class: 'arrow', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
  const turn = svgEl('g', { transform: `rotate(${Math.round(dirFrom) % 360} 12 12)` });
  turn.append(svgEl('path', { d: 'M12 3v15M6.5 13.5 12 20l5.5-6.5', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  svg.append(turn);
  return svg;
}

/** Weather icon with an accessible label. */
export function iconSvg(group, shapes, label) {
  const svg = svgEl('svg', { class: 'wx', viewBox: '0 0 24 24', role: 'img', 'aria-label': label });
  svg.append(svgEl('title', {}));
  svg.firstChild.textContent = label;
  for (const s of shapes) svg.append(shapeNode(s));
  svg.dataset.group = group;
  return svg;
}
