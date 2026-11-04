/* Habit tracker */
import { get, update } from './store.js';
import { uid, esc, todayKey, parseKey, fmtLong, plural } from './utils.js';
import { icon, refreshIcons, openModal, confirmDialog, toast, emptyState, setFieldError } from './ui.js';
import { habitStreak, bestStreak, habitRate, habitsDoneToday, lastDays } from './stats.js';

export const HABIT_ICONS = ['book-open', 'dumbbell', 'droplets', 'code', 'moon', 'heart', 'brain', 'coffee', 'sun', 'pen-line'];
export const HABIT_COLORS = ['#5B66E0', '#2E8FD6', '#14998B', '#2F9E5B', '#D98A12', '#E2603F', '#D6457A', '#8A5CD6'];

export function setHabitDay(id, key, value) {
  update((s) => {
    const h = s.habits.find((x) => x.id === id);
    if (!h) return;
    if (value) h.log[key] = true;
    else delete h.log[key];
  });
}

export function toggleHabitToday(id) {
  const h = get().habits.find((x) => x.id === id);
  if (!h) return;
  const key = todayKey();
  const next = !h.log[key];
  setHabitDay(id, key, next);
  if (next) {
    const n = habitStreak(get().habits.find((x) => x.id === id));
    toast(n > 1 ? `${h.name} done · ${n}-day streak` : `${h.name} done`);
  } else toast(`${h.name} unmarked`, 'info');
}

export function openHabitModal(id = null) {
  const existing = id ? get().habits.find((h) => h.id === id) : null;
  const h = existing || { name: '', icon: HABIT_ICONS[0], color: HABIT_COLORS[0] };
  const m = openModal({
    title: existing ? 'Edit habit' : 'New habit',
    size: 'sm',
    html: `<form id="habit-form" novalidate>
      <div class="field">
        <label for="hf-name">Habit name</label>
        <input id="hf-name" class="input" maxlength="50" autocomplete="off" placeholder="e.g. Meditate for 10 minutes" autofocus>
        <p class="field-error" role="alert"></p>
      </div>
      <fieldset class="field">
        <legend>Icon</legend>
        <div class="pick-grid">
          ${HABIT_ICONS.map((i) => `<label class="pick"><input type="radio" name="hicon" value="${i}" ${h.icon === i ? 'checked' : ''}><span aria-label="${i.replace('-', ' ')}">${icon(i)}</span></label>`).join('')}
        </div>
      </fieldset>
      <fieldset class="field">
        <legend>Color</legend>
        <div class="pick-grid">
          ${HABIT_COLORS.map((c) => `<label class="pick swatch"><input type="radio" name="hcolor" value="${c}" ${h.color === c ? 'checked' : ''}><span style="background:${c}" aria-label="Color ${c}"></span></label>`).join('')}
        </div>
      </fieldset>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Add habit'}</button>
      </div>
    </form>`,
  });
  const name = m.el.querySelector('#hf-name');
  name.value = h.name;
  name.addEventListener('input', () => setFieldError(name, ''));
  m.el.querySelector('#habit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = name.value.trim().replace(/\s+/g, ' ');
    if (v.length < 2) return setFieldError(name, v ? 'Name must be at least 2 characters.' : 'Please enter a habit name.'), name.focus();
    if (get().habits.some((x) => x.id !== id && x.name.toLowerCase() === v.toLowerCase()))
      return setFieldError(name, 'You already track a habit with this name.'), name.focus();
    const data = {
      name: v,
      icon: m.el.querySelector('input[name=hicon]:checked').value,
      color: m.el.querySelector('input[name=hcolor]:checked').value,
    };
    update((s) => {
      if (existing) Object.assign(s.habits.find((x) => x.id === id), data);
      else s.habits.push({ id: uid(), ...data, createdAt: todayKey(), log: {} });
    });
    toast(existing ? 'Habit updated' : 'Habit added');
    m.close();
  });
}

async function deleteHabit(id) {
  const h = get().habits.find((x) => x.id === id);
  if (!h) return;
  const ok = await confirmDialog({
    title: 'Delete habit?',
    message: `“${h.name}” and its entire history will be permanently removed.`,
    confirmText: 'Delete habit',
    danger: true,
  });
  if (!ok) return;
  update((s) => (s.habits = s.habits.filter((x) => x.id !== id)));
  toast('Habit deleted', 'info');
}

function habitCard(h) {
  const today = todayKey();
  const days = lastDays(7);
  const doneToday = !!h.log[today];
  const streak = habitStreak(h);
  const rate = habitRate(h, 30);
  const weekDone = days.filter((d) => h.log[d]).length;
  return `<article class="card habit" data-id="${h.id}" style="--hc:${h.color}">
    <div class="habit-top">
      <span class="habit-icon">${icon(h.icon)}</span>
      <div class="habit-title">
        <h3>${esc(h.name)}</h3>
        <p><span class="streak ${streak ? 'on' : ''}">${icon('flame')}${plural(streak, 'day')}</span><span class="sep">·</span>Best ${bestStreak(h)}</p>
      </div>
      <div class="row-actions always">
        <button type="button" class="icon-btn sm" data-action="edit" aria-label="Edit habit: ${esc(h.name)}">${icon('pencil')}</button>
        <button type="button" class="icon-btn sm" data-action="delete" aria-label="Delete habit: ${esc(h.name)}">${icon('trash-2')}</button>
      </div>
    </div>
    <div class="habit-days" role="group" aria-label="Last 7 days for ${esc(h.name)}">
      ${days
        .map((d) => {
          const on = !!h.log[d];
          const dow = parseKey(d).toLocaleDateString(undefined, { weekday: 'short' });
          return `<button type="button" class="day ${on ? 'done' : ''} ${d === today ? 'is-today' : ''}" data-action="day" data-date="${d}" aria-pressed="${on}" aria-label="${esc(fmtLong(d))}: ${on ? 'completed' : 'not completed'}" title="${esc(fmtLong(d))}">
            <span class="dow">${dow.slice(0, 3)}</span><span class="mark">${icon('check')}</span></button>`;
        })
        .join('')}
    </div>
    <div class="habit-stats">
      <div class="progress" role="progressbar" aria-valuenow="${rate}" aria-valuemin="0" aria-valuemax="100" aria-label="30-day completion"><span class="bar-fill" style="width:${rate}%"></span></div>
      <div class="habit-nums"><strong>${rate}%</strong><span>30-day rate</span><span class="sep">·</span><strong>${weekDone}/7</strong><span>this week</span></div>
    </div>
    <button type="button" class="btn ${doneToday ? 'btn-success' : 'btn-primary'} btn-block" data-action="today" aria-pressed="${doneToday}">
      ${doneToday ? `${icon('circle-check')}Completed today` : `${icon('check')}Mark done today`}
    </button>
  </article>`;
}

export function render(el) {
  const habits = get().habits;
  const { done, total } = habitsDoneToday();
  const pct = total ? Math.round((done / total) * 100) : 0;
  const bestCurrent = habits.reduce((a, h) => Math.max(a, habitStreak(h)), 0);
  const avg = habits.length ? Math.round(habits.reduce((a, h) => a + habitRate(h, 30), 0) / habits.length) : 0;

  el.innerHTML = `<div class="page">
    <div class="page-head">
      <div><h2 class="page-title">Habits</h2><p class="page-sub">Small actions, repeated daily, compound into big results.</p></div>
      <button type="button" class="btn btn-primary" id="new-habit">${icon('plus')}New habit</button>
    </div>
    ${
      habits.length
        ? `<section class="card habit-summary">
      <div class="hs-main">
        <p class="eyebrow">Today</p>
        <div class="hs-line"><strong>${done}</strong><span>of ${total} habits completed</span></div>
        <div class="progress lg" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Habits completed today"><span class="bar-fill" style="width:${pct}%"></span></div>
      </div>
      <div class="hs-stat"><span class="hs-ic">${icon('flame')}</span><div><strong>${bestCurrent}</strong><span>Longest active streak</span></div></div>
      <div class="hs-stat"><span class="hs-ic">${icon('target')}</span><div><strong>${avg}%</strong><span>Avg. 30-day consistency</span></div></div>
    </section>
    <div class="habit-grid">${habits.map(habitCard).join('')}</div>`
        : `<section class="card">${emptyState({
            ic: 'repeat',
            title: 'No habits yet',
            text: 'Start tracking a daily habit to build streaks and see your consistency.',
            action: `<button type="button" class="btn btn-primary" id="empty-habit">${icon('plus')}Add your first habit</button>`,
          })}</section>`
    }
  </div>`;
  const page = el.firstElementChild;
  page.querySelector('#new-habit').addEventListener('click', () => openHabitModal());
  const eh = page.querySelector('#empty-habit');
  if (eh) eh.addEventListener('click', () => openHabitModal());
  page.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    const card = btn && btn.closest('.habit');
    if (!card) return;
    const id = card.dataset.id;
    const a = btn.dataset.action;
    if (a === 'today') toggleHabitToday(id);
    else if (a === 'day') {
      const h = get().habits.find((x) => x.id === id);
      setHabitDay(id, btn.dataset.date, !h.log[btn.dataset.date]);
    } else if (a === 'edit') openHabitModal(id);
    else if (a === 'delete') deleteHabit(id);
  });
  refreshIcons(page);
}
