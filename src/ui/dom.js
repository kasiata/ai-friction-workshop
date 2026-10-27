// Tiny DOM helper: h('div', {class:'x', onclick}, child, ...) — no framework, no build step.

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'indeterminate']);

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  let deferredValue;
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) { if (k === 'checked' || k === 'disabled') el[k] = false; continue; }
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value' && tag === 'select') deferredValue = v;
    else if (PROPS.has(k)) el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  if (deferredValue !== undefined) el.value = deferredValue;
  return el;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export const $ = (sel, root = document) => root.querySelector(sel);

export function download(filename, text, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const pct = (p) => (p * 100 < 10 ? (p * 100).toFixed(1) : Math.round(p * 100)) + '%';
