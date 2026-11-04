/* Central state store with localStorage persistence */
import { buildSeed } from './seed.js';

const KEY = 'lifeos:v1';

export const DEFAULT_SETTINGS = {
  name: '',
  theme: 'system',
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: false,
  sound: true,
  weekStart: 1,
  dailyFocusGoal: 100,
  showOverdueToday: true,
  sidebarCollapsed: false,
};

const emptyState = () => ({
  version: 1,
  settings: { ...DEFAULT_SETTINGS },
  tasks: [],
  habits: [],
  notes: [],
  sessions: [],
});

let state = emptyState();
const listeners = new Set();

function normalize(p) {
  const base = emptyState();
  return {
    version: 1,
    settings: { ...base.settings, ...(p.settings || {}) },
    tasks: Array.isArray(p.tasks) ? p.tasks : [],
    habits: Array.isArray(p.habits) ? p.habits.map((h) => ({ ...h, log: h.log || {} })) : [],
    notes: Array.isArray(p.notes) ? p.notes : [],
    sessions: Array.isArray(p.sessions) ? p.sessions : [],
  };
}

export function init() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      state = normalize(JSON.parse(raw));
      return;
    }
  } catch (e) {
    /* fall through to seed */
  }
  state = buildSeed(DEFAULT_SETTINGS);
  save();
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    /* storage may be unavailable (private mode) – app keeps working in memory */
  }
}

export const get = () => state;

const emit = () => listeners.forEach((fn) => fn());

/** Mutate state, persist, and notify subscribers (unless silent). */
export function update(mutator, { silent = false } = {}) {
  mutator(state);
  save();
  if (!silent) emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function clearAll() {
  state = emptyState();
  save();
  emit();
}

export function loadSample() {
  const keep = state.settings;
  state = buildSeed(DEFAULT_SETTINGS);
  state.settings = { ...state.settings, theme: keep.theme, sidebarCollapsed: keep.sidebarCollapsed };
  save();
  emit();
}
