/* Derived statistics: tasks, habits, focus, productivity score */
import { get } from './store.js';
import { addDays, todayKey, diffDays, isoKey } from './utils.js';

export const isOverdue = (t) => !t.done && !!t.due && t.due < todayKey();
export const completedKey = (t) => (t.completedAt ? isoKey(t.completedAt) : t.due || todayKey());

export function taskStats() {
  const tasks = get().tasks;
  const t = todayKey();
  const total = tasks.length;
  const done = tasks.filter((x) => x.done).length;
  return {
    total,
    done,
    pending: total - done,
    overdue: tasks.filter(isOverdue).length,
    dueToday: tasks.filter((x) => !x.done && x.due === t).length,
    rate: total ? Math.round((done / total) * 100) : 0,
  };
}

export function lastDays(n, end = todayKey()) {
  return Array.from({ length: n }, (_, i) => addDays(end, -(n - 1 - i)));
}

/* ---- habits ---- */
export function habitStreak(h) {
  let k = todayKey();
  if (!h.log[k]) k = addDays(k, -1);
  let n = 0;
  while (h.log[k]) {
    n++;
    k = addDays(k, -1);
  }
  return n;
}

export function bestStreak(h) {
  const keys = Object.keys(h.log).sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of keys) {
    run = prev && addDays(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  return best;
}

export function habitRate(h, days = 30) {
  const today = todayKey();
  const since = Math.max(0, diffDays(today, h.createdAt));
  const span = Math.min(days, since + 1);
  let c = 0;
  for (let i = 0; i < span; i++) if (h.log[addDays(today, -i)]) c++;
  return Math.round((c / span) * 100);
}

export function habitsDoneToday() {
  const t = todayKey();
  const hs = get().habits;
  return { done: hs.filter((h) => h.log[t]).length, total: hs.length };
}

/* ---- focus ---- */
export function focusMinutesOn(key) {
  return get()
    .sessions.filter((s) => s.type === 'focus' && isoKey(s.completedAt) === key)
    .reduce((a, s) => a + s.minutes, 0);
}

export function focusSessionsOn(key) {
  return get().sessions.filter((s) => s.type === 'focus' && isoKey(s.completedAt) === key).length;
}

/* ---- productivity score (0-100) for the 7 days ending at endKey ----
   40% task completion · 40% habit consistency · 20% focus time vs goal */
export function weekScore(endKey = todayKey()) {
  const { tasks, habits, settings } = get();
  const days = Array.from({ length: 7 }, (_, i) => addDays(endKey, -(6 - i)));
  const start = days[0];
  const inWin = (k) => !!k && k >= start && k <= endKey;

  const rel = tasks.filter(
    (t) => isoKey(t.createdAt) <= endKey && (inWin(t.due) || (t.done && inWin(completedKey(t))))
  );
  const taskPart = rel.length
    ? rel.filter((t) => t.done && completedKey(t) <= endKey).length / rel.length
    : null;

  let possible = 0;
  let hit = 0;
  habits.forEach((h) => {
    days.forEach((d) => {
      if (d >= h.createdAt) {
        possible++;
        if (h.log[d]) hit++;
      }
    });
  });
  const habitPart = possible ? hit / possible : null;

  const mins = days.reduce((a, d) => a + focusMinutesOn(d), 0);
  const focusPart = Math.min(1, mins / (Math.max(1, settings.dailyFocusGoal) * 5));

  const parts = [
    [taskPart, 0.4],
    [habitPart, 0.4],
    [focusPart, 0.2],
  ].filter(([v]) => v !== null);
  const w = parts.reduce((a, [, x]) => a + x, 0);
  return Math.round((parts.reduce((a, [v, x]) => a + v * x, 0) / w) * 100);
}
