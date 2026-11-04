/* Pomodoro focus timer. The timer is a module-level singleton so it keeps running across page navigation. */
import { get, update } from './store.js';
import { uid, esc, todayKey, relTime, clamp, plural } from './utils.js';
import { icon, refreshIcons, toast, confirmDialog, emptyState, setFieldError } from './ui.js';
import { focusMinutesOn, focusSessionsOn, lastDays } from './stats.js';

const MODES = {
  focus: { label: 'Focus', cls: 'focus' },
  short: { label: 'Short break', cls: 'short' },
  long: { label: 'Long break', cls: 'long' },
};
const CIRC = 2 * Math.PI * 90;

const T = { mode: 'focus', total: 0, remaining: 0, running: false, endAt: 0, cycle: 0, handle: null, label: '' };
let audioCtx = null;

const secondsFor = (mode) => {
  const s = get().settings;
  return (mode === 'focus' ? s.focusMin : mode === 'short' ? s.shortMin : s.longMin) * 60;
};

function setMode(mode) {
  T.mode = mode;
  T.total = secondsFor(mode);
  T.remaining = T.total;
}

function ensureInit() {
  if (!T.total) setMode('focus');
}

/** Apply changed durations when the timer has not started yet */
export function syncTimer() {
  ensureInit();
  if (!T.running && T.remaining === T.total) setMode(T.mode);
  paint();
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

function chime() {
  if (!get().settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime;
    [660, 880, 1100].forEach((f, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 0.4);
      o.connect(g).connect(audioCtx.destination);
      o.start(t0 + i * 0.18);
      o.stop(t0 + i * 0.18 + 0.45);
    });
  } catch (e) {
    /* audio is optional */
  }
}

function start() {
  ensureInit();
  if (T.running) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {
    /* ignore */
  }
  T.running = true;
  T.endAt = Date.now() + T.remaining * 1000;
  T.handle = setInterval(tick, 250);
  paint();
}

function pause() {
  if (!T.running) return;
  T.remaining = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000));
  stopLoop();
  paint();
}

function stopLoop() {
  T.running = false;
  clearInterval(T.handle);
  T.handle = null;
}

function reset() {
  stopLoop();
  setMode(T.mode);
  paint();
}

function nextMode() {
  const every = get().settings.longEvery;
  if (T.mode !== 'focus') return 'focus';
  return T.cycle > 0 && T.cycle % every === 0 ? 'long' : 'short';
}

function tick() {
  T.remaining = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000));
  if (T.remaining <= 0) return complete();
  paint();
}

function complete() {
  stopLoop();
  const finished = T.mode;
  if (finished === 'focus') {
    T.cycle++;
    const mins = Math.round(T.total / 60);
    update((s) =>
      s.sessions.push({ id: uid(), type: 'focus', minutes: mins, label: T.label.trim(), completedAt: new Date().toISOString() })
    );
  }
  chime();
  const next = nextMode();
  setMode(next);
  toast(
    finished === 'focus'
      ? `Focus session complete. Time for a ${next === 'long' ? 'long' : 'short'} break.`
      : 'Break is over. Ready to focus?',
    'success'
  );
  if (get().settings.autoStart) start();
  paint();
}

function skip() {
  stopLoop();
  if (T.mode === 'focus') setMode(nextMode());
  else setMode('focus');
  paint();
}

function switchMode(mode) {
  if (mode === T.mode) return;
  stopLoop();
  setMode(mode);
  paint();
}

/* ---------- DOM painting (updates elements if the page is visible) ---------- */
export function paint() {
  ensureInit();
  const time = fmt(T.remaining);
  const m = MODES[T.mode];
  const frac = T.total ? T.remaining / T.total : 1;
  const $ = (id) => document.getElementById(id);

  const t = $('t-time');
  if (t) {
    t.textContent = time;
    $('t-mode').textContent = m.label;
    $('t-ring').style.strokeDashoffset = String(CIRC * (1 - frac));
    const card = $('t-card');
    card.dataset.mode = T.mode;
    card.classList.toggle('is-running', T.running);
    $('t-toggle').innerHTML = T.running ? `${icon('pause')}Pause` : `${icon('play')}${T.remaining < T.total ? 'Resume' : 'Start'}`;
    $('t-toggle').setAttribute('aria-pressed', String(T.running));
    document.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === T.mode)));
    const dots = $('t-cycle');
    if (dots) {
      const every = get().settings.longEvery;
      const filled = T.cycle % every;
      dots.innerHTML = Array.from({ length: every }, (_, i) => `<i class="${i < filled ? 'on' : ''}"></i>`).join('');
      dots.setAttribute('aria-label', `${filled} of ${every} focus sessions before long break`);
    }
    refreshIcons($('t-card'));
  }

  const pill = $('timer-pill');
  if (pill) {
    pill.hidden = !T.running;
    const pt = $('timer-pill-time');
    if (pt) pt.textContent = time;
  }
  const base = document.body.dataset.baseTitle || 'LifeOS';
  document.title = T.running ? `${time} · ${m.label} — LifeOS` : base;
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && T.running) tick();
});

/* ---------- Page ---------- */
function historyItem(s) {
  return `<li class="hist-item" data-id="${s.id}">
    <span class="hist-ic">${icon('timer')}</span>
    <div class="hist-main"><strong>${esc(s.label || 'Focus session')}</strong><span>${esc(relTime(s.completedAt))}</span></div>
    <span class="hist-min">${s.minutes} min</span>
    <button type="button" class="icon-btn sm" data-action="del-session" aria-label="Remove session from history">${icon('x')}</button>
  </li>`;
}

export function render(el) {
  ensureInit();
  const s = get().settings;
  const today = todayKey();
  const todayMin = focusMinutesOn(today);
  const goalPct = clamp(Math.round((todayMin / Math.max(1, s.dailyFocusGoal)) * 100), 0, 100);
  const weekMin = lastDays(7).reduce((a, d) => a + focusMinutesOn(d), 0);
  const weekSessions = lastDays(7).reduce((a, d) => a + focusSessionsOn(d), 0);
  const sessions = get()
    .sessions.filter((x) => x.type === 'focus')
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const pending = get().tasks.filter((t) => !t.done);

  el.innerHTML = `<div class="page">
    <div class="page-head">
      <div><h2 class="page-title">Focus Mode</h2><p class="page-sub">Work in focused intervals, then recharge with a break.</p></div>
    </div>
    <div class="focus-layout">
      <div class="focus-main">
        <section class="card timer-card" id="t-card" data-mode="${T.mode}">
          <div class="mode-tabs" role="group" aria-label="Timer mode">
            ${Object.entries(MODES).map(([k, v]) => `<button type="button" class="tab" data-mode="${k}" aria-pressed="${T.mode === k}">${v.label}</button>`).join('')}
          </div>
          <div class="ring-wrap">
            <svg viewBox="0 0 200 200" class="ring" aria-hidden="true">
              <circle class="ring-bg" cx="100" cy="100" r="90"/>
              <circle class="ring-fg" id="t-ring" cx="100" cy="100" r="90" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/>
            </svg>
            <div class="ring-center" role="timer" aria-live="off">
              <span class="ring-mode" id="t-mode">Focus</span>
              <span class="ring-time" id="t-time">25:00</span>
              <span class="ring-cycle" id="t-cycle"></span>
            </div>
          </div>
          <div class="field t-label-field">
            <label for="t-label" class="sr-only">What are you working on?</label>
            <input id="t-label" class="input center" list="t-tasks" maxlength="80" placeholder="What are you focusing on?" autocomplete="off">
            <datalist id="t-tasks">${pending.slice(0, 20).map((t) => `<option value="${esc(t.title)}"></option>`).join('')}</datalist>
          </div>
          <div class="timer-controls">
            <button type="button" class="btn btn-primary btn-lg" id="t-toggle">${icon('play')}Start</button>
            <button type="button" class="btn btn-lg" id="t-reset">${icon('rotate-ccw')}Reset</button>
            <button type="button" class="btn btn-lg" id="t-skip">${icon('skip-forward')}Skip</button>
          </div>
        </section>
        <section class="card">
          <div class="card-head"><h3 class="card-title">Timer settings</h3></div>
          <form id="t-settings" class="t-settings" novalidate>
            <div class="field"><label for="ts-focus">Focus (min)</label><input id="ts-focus" type="number" class="input" min="1" max="120" step="1" inputmode="numeric"><p class="field-error" role="alert"></p></div>
            <div class="field"><label for="ts-short">Short break (min)</label><input id="ts-short" type="number" class="input" min="1" max="60" step="1" inputmode="numeric"><p class="field-error" role="alert"></p></div>
            <div class="field"><label for="ts-long">Long break (min)</label><input id="ts-long" type="number" class="input" min="1" max="90" step="1" inputmode="numeric"><p class="field-error" role="alert"></p></div>
            <div class="field"><label for="ts-every">Long break every</label><input id="ts-every" type="number" class="input" min="2" max="8" step="1" inputmode="numeric"><p class="field-error" role="alert"></p></div>
            <button type="submit" class="btn btn-primary">Save</button>
          </form>
        </section>
      </div>
      <div class="focus-side">
        <section class="card">
          <div class="card-head"><h3 class="card-title">Today</h3></div>
          <div class="mini-stats">
            <div><strong>${focusSessionsOn(today)}</strong><span>Sessions</span></div>
            <div><strong>${todayMin}<small>m</small></strong><span>Focus time</span></div>
            <div><strong>${(weekMin / 60).toFixed(1)}<small>h</small></strong><span>Last 7 days</span></div>
          </div>
          <div class="goal">
            <div class="goal-row"><span>Daily goal</span><span>${todayMin} / ${s.dailyFocusGoal} min</span></div>
            <div class="progress" role="progressbar" aria-valuenow="${goalPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Daily focus goal"><span class="bar-fill" style="width:${goalPct}%"></span></div>
            <p class="goal-note">${plural(weekSessions, 'session')} completed this week.</p>
          </div>
        </section>
        <section class="card">
          <div class="card-head">
            <h3 class="card-title">Session history</h3>
            ${sessions.length ? `<button type="button" class="btn btn-sm btn-ghost danger-text" id="t-clear-hist">Clear</button>` : ''}
          </div>
          ${sessions.length
            ? `<ul class="hist" id="hist">${sessions.slice(0, 10).map(historyItem).join('')}</ul>${sessions.length > 10 ? `<p class="hist-more">Showing latest 10 of ${sessions.length} sessions</p>` : ''}`
            : emptyState({ ic: 'history', title: 'No sessions yet', text: 'Completed focus sessions will appear here.' })}
        </section>
      </div>
    </div>
  </div>`;

  const page = el.firstElementChild;
  const $ = (s) => page.querySelector(s);
  const label = $('#t-label');
  label.value = T.label;
  label.addEventListener('input', () => (T.label = label.value));

  $('#t-toggle').addEventListener('click', () => (T.running ? pause() : start()));
  $('#t-reset').addEventListener('click', reset);
  $('#t-skip').addEventListener('click', skip);
  page.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => switchMode(b.dataset.mode)));

  $('#ts-focus').value = s.focusMin;
  $('#ts-short').value = s.shortMin;
  $('#ts-long').value = s.longMin;
  $('#ts-every').value = s.longEvery;
  $('#t-settings').addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = [
      ['#ts-focus', 'focusMin', 1, 120],
      ['#ts-short', 'shortMin', 1, 60],
      ['#ts-long', 'longMin', 1, 90],
      ['#ts-every', 'longEvery', 2, 8],
    ];
    let ok = true;
    const vals = {};
    fields.forEach(([sel, key, min, max]) => {
      const inp = $(sel);
      const n = Number(inp.value);
      if (!inp.value || !Number.isInteger(n) || n < min || n > max) {
        setFieldError(inp, `Enter a whole number from ${min} to ${max}.`);
        ok = false;
      } else {
        setFieldError(inp, '');
        vals[key] = n;
      }
    });
    if (!ok) return;
    update((st) => Object.assign(st.settings, vals), { silent: true });
    syncTimer();
    toast('Timer settings saved');
  });

  const hist = $('#hist');
  if (hist)
    hist.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action="del-session"]');
      if (!b) return;
      const id = b.closest('.hist-item').dataset.id;
      update((st) => (st.sessions = st.sessions.filter((x) => x.id !== id)));
      toast('Session removed', 'info');
    });
  const ch = $('#t-clear-hist');
  if (ch)
    ch.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Clear session history?',
        message: 'All recorded focus sessions will be removed. Analytics will update accordingly.',
        confirmText: 'Clear history',
        danger: true,
      });
      if (!ok) return;
      update((st) => (st.sessions = st.sessions.filter((x) => x.type !== 'focus')));
      toast('Session history cleared', 'info');
    });

  refreshIcons(page);
  paint();
}

export const timerRunning = () => T.running;