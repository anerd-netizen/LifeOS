/* Shared helpers: dates, ids, escaping, formatting */
export const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayKey = () => dateKey(new Date());
export const addDays = (k, n) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};
/** Difference in whole days (a - b) */
export const diffDays = (a, b) => Math.round((parseKey(a) - parseKey(b)) / 864e5);
export const isoKey = (iso) => dateKey(new Date(iso));

export const fmtShort = (k) => parseKey(k).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
export const fmtMedium = (k) =>
  parseKey(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
export const fmtLong = (k) =>
  parseKey(k).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export function relTime(iso) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60e3) return 'just now';
  if (diff < 3600e3) return `${Math.floor(diff / 60e3)}m ago`;
  const dk = dateKey(d);
  const t = todayKey();
  if (dk === t) return `Today, ${fmtTime(iso)}`;
  if (dk === addDays(t, -1)) return `Yesterday, ${fmtTime(iso)}`;
  return fmtShort(dk);
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

export function debounce(fn, ms = 200) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
