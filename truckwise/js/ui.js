// Shared UI helpers: escaping, tiny markdown, icons, modals, toasts and the
// delegated action registry used by every view.
import { STATUS } from './engine.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Registries filled by view modules.
export const actions = {}; // click: data-action
export const submits = {}; // form submit: data-submit
export const lives = {}; // form input: data-live

let rerenderFn = () => {};
export const setRerender = (fn) => { rerenderFn = fn; };
export const rerender = () => rerenderFn();
export const go = (hash) => { if (location.hash === hash) rerender(); else location.hash = hash; };

// Minimal, safe markdown: **bold**, "- " bullets, paragraphs, line breaks.
export function md(text) {
  const blocks = esc(text).split(/\n{2,}/);
  return blocks.map((b) => {
    const lines = b.split('\n');
    if (lines.every((l) => /^\s*[-*] /.test(l))) {
      return '<ul>' + lines.map((l) => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('') + '</ul>';
    }
    const out = []; let list = null;
    for (const l of lines) {
      if (/^\s*[-*] /.test(l)) { list ||= []; list.push(`<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`); }
      else { if (list) { out.push('<ul>' + list.join('') + '</ul>'); list = null; } out.push(inline(l)); }
    }
    if (list) out.push('<ul>' + list.join('') + '</ul>');
    return '<p>' + out.join('<br>').replace(/<br><ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>') + '</p>';
  }).join('');
}
const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');

/* ------------------------------------------------------------------ */
/* Icons (24px line icons, currentColor)                               */
/* ------------------------------------------------------------------ */
const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  dollar: '<path d="M12 3v18"/><path d="M16.5 7.5c-.8-1.2-2.4-2-4.5-2-2.6 0-4.2 1.3-4.2 3s1.5 2.6 4.2 3.2 4.5 1.4 4.5 3.4-1.9 3.4-4.5 3.4c-2.3 0-4-.9-4.8-2.3"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  gauge: '<path d="M4 16a8 8 0 1 1 16 0"/><path d="M12 16l4-5"/><circle cx="12" cy="16" r="1.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M8.5 12l2 2 4-4"/>',
  map: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M12 8v5M12 16h.01"/>',
  report: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  engine: '<path d="M4 10h3l2-2h5l2 2h2v6h-2l-2 2H9l-2-2H4z"/><path d="M2 12v2M20 12h2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"/>',
  brake: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M6 6.5a8 8 0 0 0 0 11"/>',
  tire: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v4.5M12 16v4.5M3.5 12H8M16 12h4.5"/>',
  bolt: '<path d="M13 3L5 13h6l-1 8 8-10h-6z"/>',
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l7-7"/>',
  camera: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
  trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  upload: '<path d="M12 16V5M7.5 9.5L12 5l4.5 4.5"/><path d="M5 19h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  pause: '<path d="M9 6v12M15 6v12"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.5"/>',
  print: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="7" rx="2"/><path d="M7 14h10v6H7z"/>',
  phone: '<path d="M6 3h3l1.5 4.5L8.5 9a11 11 0 0 0 6.5 6.5l1.5-2L21 15v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z"/>',
  route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
};
export const icon = (name, size = 20, cls = '') =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.info}</svg>`;

export const pill = (status, label) => `<span class="pill pill-${STATUS[status]?.color || status}">${esc(label || STATUS[status]?.label || status)}</span>`;

/* ------------------------------------------------------------------ */
/* Modal & toast                                                       */
/* ------------------------------------------------------------------ */
let lastFocus = null;
export function openModal(html, { onMount, wide = false } = {}) {
  closeModal();
  lastFocus = document.activeElement;
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true">
    <button class="icon-btn modal-close" data-action="close-modal" aria-label="Close">${icon('close')}</button>${html}</div>`;
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) closeModal(); });
  document.body.appendChild(wrap);
  document.body.classList.add('no-scroll');
  const first = wrap.querySelector('input:not([type=hidden]),select,textarea,button:not(.modal-close)');
  setTimeout(() => first?.focus(), 30);
  onMount?.(wrap);
  return wrap;
}
export function closeModal() {
  document.querySelector('.modal-backdrop')?.remove();
  document.body.classList.remove('no-scroll');
  lastFocus?.focus?.();
}
actions['close-modal'] = () => closeModal();
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

export function toast(msg, kind = 'ok') {
  let host = document.querySelector('.toasts');
  if (!host) { host = document.createElement('div'); host.className = 'toasts'; host.setAttribute('role', 'status'); document.body.appendChild(host); }
  const t = document.createElement('div');
  t.className = `toast toast-${kind}`;
  t.textContent = msg;
  host.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

export function confirmBox(message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    const m = openModal(`<h2>Are you sure?</h2><p class="muted">${esc(message)}</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-k="no">Cancel</button><button class="btn btn-danger" data-k="yes">${esc(okLabel)}</button></div>`);
    m.addEventListener('click', (e) => {
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (k) { closeModal(); resolve(k === 'yes'); }
    });
  });
}

// Form helpers
export function formData(form) {
  const fd = new FormData(form); const out = {};
  for (const [k, v] of fd.entries()) {
    if (k.endsWith('[]')) { (out[k.slice(0, -2)] ||= []).push(v); } else out[k] = typeof v === 'string' ? v.trim() : v;
  }
  return out;
}
export const num = (v) => (v === '' || v == null ? null : Number(String(v).replace(/[$,\s]/g, '')));

export const field = (label, inner, hint = '') =>
  `<label class="field"><span class="field-label">${esc(label)}</span>${inner}${hint ? `<span class="field-hint">${hint}</span>` : ''}</label>`;
export const input = (name, value = '', attrs = '') => `<input name="${name}" value="${esc(value ?? '')}" ${attrs}>`;
export const select = (name, options, value, attrs = '') =>
  `<select name="${name}" ${attrs}>${options.map((o) => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === String(value ?? '') ? 'selected' : ''}>${esc(l)}</option>`;
  }).join('')}</select>`;

export function tabs(base, items, current) {
  return `<nav class="tabs" role="tablist">${items.map(([id, label]) =>
    `<a role="tab" href="#/${base}${id ? '/' + id : ''}" class="tab ${current === id ? 'active' : ''}" aria-selected="${current === id}">${esc(label)}</a>`).join('')}</nav>`;
}

export const emptyState = (title, body, cta = '') =>
  `<div class="empty"><div class="empty-icon">${icon('truck', 32)}</div><h3>${esc(title)}</h3><p class="muted">${body}</p>${cta}</div>`;

export function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
}
