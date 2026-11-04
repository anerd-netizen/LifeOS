/* Interactive monthly calendar */
import { get } from './store.js';
import { esc, todayKey, dateKey, addDays, parseKey, fmtLong, plural } from './utils.js';
import { icon, refreshIcons, emptyState } from './ui.js';
import { taskRow, bindTaskActions, openTaskModal } from './tasks.js';
import { isOverdue } from './stats.js';

let view = null; // { y, m }
let sel = null; // selected date key

export function render(el) {
  const now = new Date();
  if (!view) view = { y: now.getFullYear(), m: now.getMonth() };
  if (!sel) sel = todayKey();
  const ws = get().settings.weekStart;
  const today = todayKey();

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const offset = (first.getDay() - ws + 7) % 7;
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  const gridStart = new Date(view.y, view.m, 1 - offset);

  const byDate = {};
  get().tasks.forEach((t) => {
    if (t.due) (byDate[t.due] = byDate[t.due] || []).push(t);
  });

  const dows = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 7 + ws + i).toLocaleDateString(undefined, { weekday: 'short' })
  );
  const monthLabel = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  let cells = '';
  for (let i = 0; i < cellCount; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const key = dateKey(d);
    const ts = (byDate[key] || []).slice().sort((a, b) => Number(a.done) - Number(b.done));
    const out = d.getMonth() !== view.m;
    const doneN = ts.filter((t) => t.done).length;
    const hasOver = ts.some(isOverdue);
    const label = `${fmtLong(key)}${ts.length ? `, ${plural(ts.length, 'task')}, ${doneN} completed` : ', no tasks'}`;
    cells += `<button type="button" class="cal-cell ${out ? 'out' : ''} ${key === today ? 'today' : ''} ${key === sel ? 'selected' : ''}"
      data-date="${key}" aria-label="${esc(label)}" aria-pressed="${key === sel}" tabindex="${key === sel ? 0 : -1}">
      <span class="cal-num">${d.getDate()}</span>
      <span class="cal-items">
        ${ts.slice(0, 2).map((t) => `<span class="pill prio-${t.priority} ${t.done ? 'done' : ''} ${isOverdue(t) ? 'late' : ''}">${esc(t.title)}</span>`).join('')}
        ${ts.length > 2 ? `<span class="more">+${ts.length - 2} more</span>` : ''}
      </span>
      ${ts.length ? `<span class="cal-dots" aria-hidden="true">${ts.slice(0, 4).map((t) => `<i class="dot-i prio-${t.priority} ${t.done ? 'done' : ''}"></i>`).join('')}</span>` : ''}
      ${ts.length && doneN === ts.length ? `<span class="cal-check" aria-hidden="true">${icon('check')}</span>` : hasOver ? `<span class="cal-warn" aria-hidden="true"></span>` : ''}
    </button>`;
  }

  const dayTasks = (byDate[sel] || []).slice().sort((a, b) => Number(a.done) - Number(b.done));
  const doneN = dayTasks.filter((t) => t.done).length;
  const pct = dayTasks.length ? Math.round((doneN / dayTasks.length) * 100) : 0;

  el.innerHTML = `<div class="page">
    <div class="page-head">
      <div><h2 class="page-title">Calendar</h2><p class="page-sub">See deadlines at a glance and plan ahead.</p></div>
      <button type="button" class="btn btn-primary" id="cal-add">${icon('plus')}Add task</button>
    </div>
    <div class="cal-layout">
      <section class="card cal-card" aria-label="Monthly calendar">
        <div class="cal-head">
          <h3 class="cal-title" aria-live="polite">${monthLabel}</h3>
          <div class="cal-nav">
            <button type="button" class="btn btn-sm" id="cal-today">Today</button>
            <button type="button" class="icon-btn" id="cal-prev" aria-label="Previous month">${icon('chevron-left')}</button>
            <button type="button" class="icon-btn" id="cal-next" aria-label="Next month">${icon('chevron-right')}</button>
          </div>
        </div>
        <div class="cal-dows" aria-hidden="true">${dows.map((d) => `<span>${d}</span>`).join('')}</div>
        <div class="cal-grid" id="cal-grid" role="group" aria-label="Days of ${monthLabel}">${cells}</div>
        <div class="cal-legend" aria-hidden="true">
          <span><i class="dot-i prio-high"></i>High</span><span><i class="dot-i prio-medium"></i>Medium</span><span><i class="dot-i prio-low"></i>Low</span><span><i class="dot-i done"></i>Completed</span>
        </div>
      </section>
      <aside class="card day-panel" aria-label="Selected day">
        <div class="day-head">
          <div>
            <p class="eyebrow">${sel === today ? 'Today' : 'Selected day'}</p>
            <h3>${fmtLong(sel)}</h3>
          </div>
          <button type="button" class="icon-btn" id="day-add" aria-label="Add task on ${esc(fmtLong(sel))}">${icon('plus')}</button>
        </div>
        ${dayTasks.length ? `<div class="day-prog"><div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Completion for selected day"><span class="bar-fill" style="width:${pct}%"></span></div><span>${doneN}/${dayTasks.length} done</span></div>` : ''}
        <ul class="task-list compact" id="day-list">
          ${dayTasks.length ? dayTasks.map((t) => taskRow(t)).join('') : `<li>${emptyState({ ic: 'calendar-days', title: 'Nothing scheduled', text: 'Add a task to plan this day.', action: `<button type="button" class="btn btn-sm" id="empty-add">${icon('plus')}Add task</button>` })}</li>`}
        </ul>
      </aside>
    </div>
  </div>`;

  const page = el.firstElementChild;
  const rerender = () => render(el);
  const go = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    view = { y: d.getFullYear(), m: d.getMonth() };
    rerender();
  };
  page.querySelector('#cal-prev').addEventListener('click', () => go(-1));
  page.querySelector('#cal-next').addEventListener('click', () => go(1));
  page.querySelector('#cal-today').addEventListener('click', () => {
    view = { y: now.getFullYear(), m: now.getMonth() };
    sel = todayKey();
    rerender();
  });
  const add = () => openTaskModal({ due: sel });
  page.querySelector('#cal-add').addEventListener('click', add);
  page.querySelector('#day-add').addEventListener('click', add);
  const ea = page.querySelector('#empty-add');
  if (ea) ea.addEventListener('click', add);

  const select = (key, focus) => {
    sel = key;
    const d = parseKey(key);
    view = { y: d.getFullYear(), m: d.getMonth() };
    rerender();
    if (focus) el.querySelector(`[data-date="${key}"]`)?.focus();
  };
  const grid = page.querySelector('#cal-grid');
  grid.addEventListener('click', (e) => {
    const c = e.target.closest('[data-date]');
    if (c) select(c.dataset.date, true);
  });
  grid.addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    select(addDays(sel, step), true);
  });
  bindTaskActions(page.querySelector('#day-list'));
  refreshIcons(page);
}
