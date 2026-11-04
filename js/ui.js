/* UI primitives: icons, modal, confirm dialog, toasts */
import {
  createIcons, LayoutDashboard, ListChecks, Repeat, CalendarDays, Timer, StickyNote, ChartColumn, Settings,
  Search, Bell, Sun, Moon, Menu, X, Plus, Pencil, Trash2, Check, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, Flame, Target, CircleCheck, Clock, TriangleAlert, Play, Pause, RotateCcw, SkipForward, Pin,
  PinOff, BookOpen, Dumbbell, Droplets, Code, Heart, Brain, Coffee, PenLine, Download, Sparkles, Inbox,
  ArrowLeft, Info, CircleAlert, Calendar, Hourglass, Trophy, TrendingUp, TrendingDown, Volume2, ListTodo,
  Funnel, NotebookText, Layers, Zap, CircleCheckBig, Database, Palette, User, SlidersHorizontal, Eraser,
  History, RefreshCw, ArrowRight,
} from 'lucide';
import { esc } from './utils.js';

const ICONS = {
  LayoutDashboard, ListChecks, Repeat, CalendarDays, Timer, StickyNote, ChartColumn, Settings, Search, Bell, Sun,
  Moon, Menu, X, Plus, Pencil, Trash2, Check, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Flame,
  Target, CircleCheck, Clock, TriangleAlert, Play, Pause, RotateCcw, SkipForward, Pin, PinOff, BookOpen, Dumbbell,
  Droplets, Code, Heart, Brain, Coffee, PenLine, Download, Sparkles, Inbox, ArrowLeft, Info, CircleAlert, Calendar,
  Hourglass, Trophy, TrendingUp, TrendingDown, Volume2, ListTodo, Funnel, NotebookText, Layers, Zap,
  CircleCheckBig, Database, Palette, User, SlidersHorizontal, Eraser, History, RefreshCw, ArrowRight,
};

export const icon = (name, cls = '') => `<i data-lucide="${name}"${cls ? ` class="${cls}"` : ''}></i>`;

export function refreshIcons(root = document) {
  createIcons({ icons: ICONS, root, attrs: { 'aria-hidden': 'true', focusable: 'false' } });
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- Modal (native <dialog>) ---------------- */
export function openModal({ title, html, size = 'md', onClose }) {
  const dlg = document.createElement('dialog');
  dlg.className = `modal modal-${size}`;
  const tid = 'm' + Math.random().toString(36).slice(2, 7);
  dlg.setAttribute('aria-labelledby', tid);
  dlg.innerHTML = `
    <div class="modal-card">
      <header class="modal-head">
        <h2 id="${tid}">${esc(title)}</h2>
        <button type="button" class="icon-btn sm" data-close aria-label="Close dialog">${icon('x')}</button>
      </header>
      <div class="modal-body">${html}</div>
    </div>`;
  document.body.appendChild(dlg);
  refreshIcons(dlg);
  dlg.showModal();

  let closed = false;
  let downOnBackdrop = false;
  const close = () => {
    if (closed) return;
    closed = true;
    dlg.classList.add('closing');
    const finish = () => {
      if (dlg.open) dlg.close();
      dlg.remove();
      onClose && onClose();
    };
    reduceMotion() ? finish() : setTimeout(finish, 160);
  };
  dlg.addEventListener('mousedown', (e) => (downOnBackdrop = e.target === dlg));
  dlg.addEventListener('click', (e) => {
    if ((e.target === dlg && downOnBackdrop) || e.target.closest('[data-close]')) close();
  });
  dlg.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  return { el: dlg, close };
}

/* ---------------- Confirm dialog ---------------- */
export function confirmDialog({ title, message, confirmText = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let result = false;
    const m = openModal({
      title,
      size: 'sm',
      onClose: () => resolve(result),
      html: `<p class="confirm-msg">${esc(message)}</p>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm autofocus>${esc(confirmText)}</button>
        </div>`,
    });
    m.el.querySelector('[data-confirm]').addEventListener('click', () => {
      result = true;
      m.close();
    });
  });
}

/* ---------------- Toasts ---------------- */
export function toast(message, type = 'success') {
  const host = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  const ic = type === 'error' ? 'circle-alert' : type === 'info' ? 'info' : 'circle-check';
  el.innerHTML = `${icon(ic)}<span>${esc(message)}</span><button type="button" class="toast-x" aria-label="Dismiss notification">${icon('x')}</button>`;
  host.appendChild(el);
  refreshIcons(el);
  const kill = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 200);
  };
  el.querySelector('.toast-x').addEventListener('click', kill);
  setTimeout(kill, 3800);
  while (host.children.length > 4) host.firstChild.remove();
}

/* ---------------- Empty state ---------------- */
export function emptyState({ ic = 'inbox', title, text = '', action = '' }) {
  return `<div class="empty"><span class="empty-ic">${icon(ic)}</span><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;
}

/* ---------------- Form helpers ---------------- */
export function setFieldError(input, msg) {
  const field = input.closest('.field');
  const err = field && field.querySelector('.field-error');
  if (err) err.textContent = msg || '';
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  field && field.classList.toggle('has-error', !!msg);
}
