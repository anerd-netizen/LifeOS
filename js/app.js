/* LifeOS bootstrap: routing, layout chrome, search, notifications, theme */
import '../css/style.css';
import { init, get, update, subscribe } from './store.js';
import { esc, todayKey, fmtMedium, diffDays, fmtShort } from './utils.js';
import { icon, refreshIcons } from './ui.js';
import { destroyCharts } from './charts.js';
import { isOverdue } from './stats.js';
import * as overview from './overview.js';
import * as tasks from './tasks.js';
import * as habits from './habits.js';
import * as calendar from './calendar.js';
import * as timer from './timer.js';
import * as notes from './notes.js';
import * as analytics from './analytics.js';
import * as settings from './settings.js';

const PAGES = {
  overview: { title: 'Overview', mod: overview },
  tasks: { title: 'My Tasks', mod: tasks },
  habits: { title: 'Habits', mod: habits },
  calendar: { title: 'Calendar', mod: calendar },
  focus: { title: 'Focus Mode', mod: timer },
  notes: { title: 'Notes', mod: notes },
  analytics: { title: 'Analytics', mod: analytics },
  settings: { title: 'Settings', mod: settings },
};

const $ = (s) => document.querySelector(s);
const view = $('#view');
const appEl = $('#app');
let current = 'overview';
let animTimer;

/* ---------------- Theme ---------------- */
const mq = window.matchMedia('(prefers-color-scheme: dark)');
const resolveTheme = () => {
  const t = get().settings.theme;
  return t === 'system' ? (mq.matches ? 'dark' : 'light') : t;
};
function applyTheme() {
  const t = resolveTheme();
  document.documentElement.dataset.theme = t;
  const btn = $('#theme-btn');
  btn.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
  btn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  btn.title = btn.getAttribute('aria-label');
  refreshIcons(btn);
}

/* ---------------- Routing & rendering ---------------- */
function renderView(animate) {
  destroyCharts();
  const y = window.scrollY;
  const activeId = !animate && view.contains(document.activeElement) ? document.activeElement.id : '';
  view.innerHTML = '';
  PAGES[current].mod.render(view);
  if (animate) {
    window.scrollTo(0, 0);
    view.classList.remove('page-enter');
    void view.offsetWidth;
    view.classList.add('page-enter');
    clearTimeout(animTimer);
    animTimer = setTimeout(() => view.classList.remove('page-enter'), 900);
  } else {
    window.scrollTo(0, y);
    if (activeId && !view.contains(document.activeElement)) document.getElementById(activeId)?.focus({ preventScroll: true });
  }
}

function route() {
  const name = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'overview';
  current = PAGES[name] ? name : 'overview';
  document.querySelectorAll('.nav-link').forEach((a) => {
    const on = a.dataset.route === current;
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('#page-title').textContent = PAGES[current].title;
  document.body.dataset.baseTitle = `${PAGES[current].title} · LifeOS`;
  document.title = document.body.dataset.baseTitle;
  closeNav();
  closePops();
  renderView(true);
  timer.paint();
}

/* ---------------- Chrome (date, avatar, badge) ---------------- */
function updateChrome() {
  const s = get().settings;
  $('#date-chip span').textContent = fmtMedium(todayKey());
  $('#avatar').textContent = (s.name.trim()[0] || 'U').toUpperCase();
  $('#avatar').title = s.name.trim() ? `${s.name.trim()} · Settings` : 'Settings';
  appEl.classList.toggle('collapsed', !!s.sidebarCollapsed);
  const cb = $('#collapse-btn');
  cb.setAttribute('aria-label', s.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar');
  cb.setAttribute('aria-expanded', String(!s.sidebarCollapsed));
  cb.innerHTML = `${icon(s.sidebarCollapsed ? 'chevrons-right' : 'chevrons-left')}<span class="sb-label">Collapse</span>`;
  refreshIcons(cb);
  const n = notifItems().count;
  const badge = $('#notif-badge');
  badge.hidden = n === 0;
  if (!$('#notif-pop').hidden) renderNotifs();
}

/* ---------------- Mobile nav & sidebar ---------------- */
function openNav() {
  appEl.classList.add('nav-open');
  $('#nav-open').setAttribute('aria-expanded', 'true');
  $('#sidebar').querySelector('.nav-link.active')?.focus();
}
function closeNav() {
  appEl.classList.remove('nav-open');
  $('#nav-open').setAttribute('aria-expanded', 'false');
}
$('#nav-open').addEventListener('click', openNav);
$('#nav-close').addEventListener('click', closeNav);
$('#scrim').addEventListener('click', closeNav);
$('#sidebar').addEventListener('click', (e) => e.target.closest('.nav-link') && closeNav());
$('#collapse-btn').addEventListener('click', () => {
  update((s) => (s.settings.sidebarCollapsed = !s.settings.sidebarCollapsed), { silent: true });
  updateChrome();
});

/* ---------------- Notifications ---------------- */
function notifItems() {
  const { tasks: ts, habits: hs } = get();
  const today = todayKey();
  const overdue = ts.filter(isOverdue).sort((a, b) => a.due.localeCompare(b.due));
  const dueToday = ts.filter((t) => !t.done && t.due === today);
  const habitsLeft = hs.filter((h) => !h.log[today]);
  const items = [
    ...overdue.slice(0, 4).map((t) => ({ ic: 'triangle-alert', tone: 'danger', title: t.title, text: `Overdue since ${fmtShort(t.due)} (${diffDays(today, t.due)}d)`, href: '#/tasks' })),
    ...dueToday.slice(0, 4).map((t) => ({ ic: 'clock', tone: 'warn', title: t.title, text: 'Due today', href: '#/tasks' })),
  ];
  if (habitsLeft.length)
    items.push({ ic: 'flame', tone: 'info', title: `${habitsLeft.length} habit${habitsLeft.length === 1 ? '' : 's'} left today`, text: habitsLeft.slice(0, 3).map((h) => h.name).join(', '), href: '#/habits' });
  return { items, count: overdue.length + dueToday.length + (habitsLeft.length ? 1 : 0) };
}
function renderNotifs() {
  const { items } = notifItems();
  const pop = $('#notif-pop');
  pop.innerHTML = `<div class="pop-head"><strong>Notifications</strong></div>` +
    (items.length
      ? `<ul class="notif-list">${items.map((i) => `<li><a class="notif ${i.tone}" href="${i.href}"><span class="notif-ic">${icon(i.ic)}</span><span><strong>${esc(i.title)}</strong><small>${esc(i.text)}</small></span></a></li>`).join('')}</ul>`
      : `<p class="pop-empty">${icon('circle-check-big')}You’re all caught up.</p>`);
  refreshIcons(pop);
}
const notifBtn = $('#notif-btn');
notifBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const pop = $('#notif-pop');
  const open = pop.hidden;
  closePops();
  if (open) {
    renderNotifs();
    pop.hidden = false;
    notifBtn.setAttribute('aria-expanded', 'true');
  }
});
$('#notif-pop').addEventListener('click', (e) => e.target.closest('a') && closePops());

/* ---------------- Global search ---------------- */
const si = $('#global-search');
const sr = $('#search-results');
function runSearch() {
  const q = si.value.trim().toLowerCase();
  if (!q) return (sr.hidden = true);
  const { tasks: ts, notes: ns, habits: hs } = get();
  const t = ts.filter((x) => `${x.title} ${x.desc || ''} ${x.category}`.toLowerCase().includes(q)).slice(0, 5);
  const n = ns.filter((x) => `${x.title} ${x.body}`.toLowerCase().includes(q)).slice(0, 4);
  const h = hs.filter((x) => x.name.toLowerCase().includes(q)).slice(0, 3);
  const sec = (label, arr, fn) => (arr.length ? `<div class="sr-group"><span>${label}</span>${arr.map(fn).join('')}</div>` : '');
  sr.innerHTML =
    sec('Tasks', t, (x) => `<button type="button" class="sr-item" data-kind="task" data-id="${x.id}">${icon(x.done ? 'circle-check' : 'list-checks')}<span>${esc(x.title)}</span><small>${x.due ? esc(fmtShort(x.due)) : ''}</small></button>`) +
    sec('Notes', n, (x) => `<button type="button" class="sr-item" data-kind="note" data-id="${x.id}">${icon('sticky-note')}<span>${esc(x.title || 'Untitled')}</span><small>${esc(x.category)}</small></button>`) +
    sec('Habits', h, (x) => `<button type="button" class="sr-item" data-kind="habit" data-id="${x.id}">${icon('repeat')}<span>${esc(x.name)}</span></button>`) ||
    `<p class="pop-empty">No results for “${esc(si.value.trim())}”.</p>`;
  sr.hidden = false;
  refreshIcons(sr);
}
si.addEventListener('input', runSearch);
si.addEventListener('focus', runSearch);
si.addEventListener('keydown', (e) => {
  const items = [...sr.querySelectorAll('.sr-item')];
  if (e.key === 'Enter' && items[0]) items[0].click();
  else if (e.key === 'ArrowDown' && items[0]) {
    e.preventDefault();
    items[0].focus();
  } else if (e.key === 'Escape') {
    si.value = '';
    sr.hidden = true;
    si.blur();
  }
});
sr.addEventListener('keydown', (e) => {
  const items = [...sr.querySelectorAll('.sr-item')];
  const i = items.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') (e.preventDefault(), items[Math.min(i + 1, items.length - 1)]?.focus());
  else if (e.key === 'ArrowUp') (e.preventDefault(), i <= 0 ? si.focus() : items[i - 1].focus());
  else if (e.key === 'Escape') (si.focus(), (sr.hidden = true));
});
sr.addEventListener('click', (e) => {
  const b = e.target.closest('.sr-item');
  if (!b) return;
  const { kind, id } = b.dataset;
  si.value = '';
  sr.hidden = true;
  if (kind === 'task') {
    location.hash = '#/tasks';
    tasks.openTaskModal({ id });
  } else if (kind === 'note') {
    notes.selectNote(id);
    if (current === 'notes') renderView(false);
    else location.hash = '#/notes';
  } else location.hash = '#/habits';
});

function closePops() {
  $('#notif-pop').hidden = true;
  notifBtn.setAttribute('aria-expanded', 'false');
  sr.hidden = true;
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('.pop-wrap') && !e.target.closest('.search')) closePops();
});
document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
    e.preventDefault();
    si.focus();
  } else if (e.key === 'Escape') {
    closePops();
    closeNav();
  }
});

/* ---------------- Theme toggle ---------------- */
$('#theme-btn').addEventListener('click', () =>
  update((s) => (s.settings.theme = resolveTheme() === 'dark' ? 'light' : 'dark'))
);
mq.addEventListener('change', () => {
  if (get().settings.theme === 'system') {
    applyTheme();
    renderView(false);
  }
});

/* ---------------- Boot ---------------- */
init();
subscribe(() => {
  applyTheme();
  updateChrome();
  timer.syncTimer();
  renderView(false);
});
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateChrome();
});
applyTheme();
updateChrome();
timer.syncTimer();
refreshIcons(document);
route();
