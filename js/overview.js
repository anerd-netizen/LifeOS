/* Dashboard overview */
import { get } from './store.js';
import { esc, todayKey, addDays, diffDays, parseKey, fmtMedium, greeting, plural } from './utils.js';
import { icon, refreshIcons, emptyState } from './ui.js';
import { taskStats, habitStreak, habitsDoneToday, lastDays, completedKey, weekScore, isOverdue } from './stats.js';
import { taskRow, bindTaskActions, openTaskModal, PRIORITIES, catSlug } from './tasks.js';
import { toggleHabitToday, openHabitModal } from './habits.js';
import { createNote } from './notes.js';
import { mountChart, css, hexA, gridScale, plainScale } from './charts.js';

function statCard(ic, label, value, sub, tone = '') {
  return `<div class="card stat ${tone}"><div class="stat-head"><span class="stat-ic">${icon(ic)}</span><span class="stat-label">${label}</span></div><strong class="stat-value">${value}</strong><span class="stat-sub">${sub}</span></div>`;
}

export function render(el) {
  const { tasks, habits, settings } = get();
  const today = todayKey();
  const st = taskStats();
  const hd = habitsDoneToday();
  const score = weekScore();
  const delta = score - weekScore(addDays(today, -7));

  /* today's list: due today (+ overdue when enabled) */
  const todays = tasks
    .filter((t) => t.due === today || (settings.showOverdueToday && isOverdue(t)))
    .sort((a, b) => Number(a.done) - Number(b.done) || PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank);
  const todayDone = todays.filter((t) => t.done).length;
  const todayPct = todays.length ? Math.round((todayDone / todays.length) * 100) : 0;

  const upcoming = tasks
    .filter((t) => !t.done && t.due)
    .sort((a, b) => a.due.localeCompare(b.due) || PRIORITIES[a.priority].rank - PRIORITIES[b.priority].rank)
    .slice(0, 6);

  const left = hd.total - hd.done;
  const dueNow = tasks.filter((t) => !t.done && t.due === today).length;
  const summary =
    dueNow || left
      ? `You have ${plural(dueNow, 'task')} due today${hd.total ? ` and ${plural(left, 'habit')} left to check off` : ''}.`
      : 'You’re all caught up for today. Nice work.';
  const name = settings.name.trim();

  el.innerHTML = `<div class="page">
    <section class="hero">
      <div>
        <p class="eyebrow">${esc(fmtMedium(today))}</p>
        <h2 class="hero-title">${greeting()}${name ? `, ${esc(name)}` : ''}</h2>
        <p class="hero-sub">${summary}</p>
      </div>
      <div class="quick" role="group" aria-label="Quick actions">
        <button type="button" class="btn btn-primary" data-q="task">${icon('plus')}New task</button>
        <button type="button" class="btn" data-q="habit">${icon('repeat')}New habit</button>
        <button type="button" class="btn" data-q="note">${icon('sticky-note')}New note</button>
        <button type="button" class="btn" data-q="focus">${icon('timer')}Start focus</button>
      </div>
    </section>

    <section class="stats" aria-label="Daily productivity summary">
      ${statCard('list-todo', 'Total tasks', st.total, `${st.dueToday} due today`)}
      ${statCard('circle-check-big', 'Completed', st.done, `${st.rate}% completion rate`, 'good')}
      ${statCard('hourglass', 'Pending', st.pending, st.overdue ? `${st.overdue} overdue` : 'None overdue', st.overdue ? 'warn' : '')}
      ${statCard('flame', 'Active habits', habits.length, `${hd.done}/${hd.total} done today`)}
      ${statCard('trophy', 'Weekly score', `${score}<small>/100</small>`, `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta}</span> vs last week`, 'accent')}
    </section>

    <div class="grid">
      <section class="card span-7">
        <div class="card-head">
          <div><h3 class="card-title">Today’s tasks</h3><p class="card-sub">${todays.length ? `${todayDone} of ${todays.length} completed` : 'Nothing scheduled'}</p></div>
          <a class="link-btn" href="#/tasks">View all ${icon('arrow-right')}</a>
        </div>
        ${todays.length ? `<div class="progress thin" role="progressbar" aria-valuenow="${todayPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Today's task progress"><span class="bar-fill" style="width:${todayPct}%"></span></div>` : ''}
        <ul class="task-list compact" id="today-list">
          ${todays.length ? todays.slice(0, 7).map((t) => taskRow(t, { desc: false })).join('') : `<li>${emptyState({ ic: 'sparkles', title: 'Nothing due today', text: 'Add a task or plan ahead from the calendar.', action: `<button type="button" class="btn btn-sm" data-q="task">${icon('plus')}Add task</button>` })}</li>`}
        </ul>
        ${todays.length > 7 ? `<a class="more-link" href="#/tasks">+${todays.length - 7} more tasks</a>` : ''}
      </section>

      <section class="card span-5">
        <div class="card-head">
          <div><h3 class="card-title">Habit completion</h3><p class="card-sub">${hd.total ? `${hd.done} of ${hd.total} done today` : 'No habits yet'}</p></div>
          <a class="link-btn" href="#/habits">Manage ${icon('arrow-right')}</a>
        </div>
        ${habits.length
          ? `<ul class="mini-habits" id="mini-habits">${habits
              .map((h) => {
                const on = !!h.log[today];
                const wk = lastDays(7);
                return `<li style="--hc:${h.color}" data-id="${h.id}">
                  <button type="button" class="hcheck ${on ? 'on' : ''}" role="checkbox" aria-checked="${on}" aria-label="${on ? 'Unmark' : 'Mark'} ${esc(h.name)} today" data-habit>${icon('check')}</button>
                  <div class="mh-main"><strong>${esc(h.name)}</strong><span class="mh-streak">${icon('flame')}${habitStreak(h)} day streak</span></div>
                  <div class="mh-week" aria-label="Last 7 days">${wk.map((d) => `<i class="${h.log[d] ? 'on' : ''}" title="${esc(fmtMedium(d))}"></i>`).join('')}</div>
                </li>`;
              })
              .join('')}</ul>`
          : emptyState({ ic: 'repeat', title: 'No habits tracked', text: 'Add a habit to start building streaks.', action: `<button type="button" class="btn btn-sm" data-q="habit">${icon('plus')}Add habit</button>` })}
      </section>

      <section class="card span-7">
        <div class="card-head"><div><h3 class="card-title">Weekly productivity</h3><p class="card-sub">Tasks and habits completed over the last 7 days</p></div></div>
        <div class="chart-box short"><canvas id="c-week" role="img" aria-label="Chart of tasks and habits completed in the last 7 days"></canvas></div>
      </section>

      <section class="card span-5">
        <div class="card-head">
          <div><h3 class="card-title">Upcoming deadlines</h3><p class="card-sub">Next dates on your radar</p></div>
          <a class="link-btn" href="#/calendar">Calendar ${icon('arrow-right')}</a>
        </div>
        ${upcoming.length
          ? `<ul class="deadlines" id="deadlines">${upcoming
              .map((t) => {
                const d = diffDays(t.due, today);
                const rel = d < 0 ? `${-d}d overdue` : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `In ${d} days`;
                const dt = parseKey(t.due);
                return `<li><button type="button" class="deadline ${d < 0 ? 'late' : ''}" data-edit="${t.id}" aria-label="Edit ${esc(t.title)}, due ${esc(rel)}">
                  <span class="date-block"><small>${dt.toLocaleDateString(undefined, { month: 'short' })}</small><b>${dt.getDate()}</b></span>
                  <span class="dl-main"><strong>${esc(t.title)}</strong><span><span class="chip" data-cat="${catSlug(t.category)}">${esc(t.category)}</span><span class="badge prio-${t.priority}"><i class="dot"></i>${PRIORITIES[t.priority].label}</span></span></span>
                  <span class="dl-rel">${rel}</span></button></li>`;
              })
              .join('')}</ul>`
          : emptyState({ ic: 'calendar-days', title: 'No upcoming deadlines', text: 'Tasks with due dates will show up here.' })}
      </section>
    </div>
  </div>`;

  const page = el.firstElementChild;
  page.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]');
    if (q) {
      const k = q.dataset.q;
      if (k === 'task') openTaskModal({ due: today });
      else if (k === 'habit') openHabitModal();
      else if (k === 'note') {
        createNote();
        location.hash = '#/notes';
      } else if (k === 'focus') location.hash = '#/focus';
      return;
    }
    const hb = e.target.closest('[data-habit]');
    if (hb) return toggleHabitToday(hb.closest('li').dataset.id);
    const ed = e.target.closest('[data-edit]');
    if (ed) openTaskModal({ id: ed.dataset.edit });
  });
  bindTaskActions(page.querySelector('#today-list'));

  const days = lastDays(7);
  const primary = css('--primary');
  const success = css('--success');
  mountChart(page.querySelector('#c-week'), {
    data: {
      labels: days.map((d) => parseKey(d).toLocaleDateString(undefined, { weekday: 'short' })),
      datasets: [
        { type: 'bar', label: 'Tasks completed', data: days.map((d) => tasks.filter((t) => t.done && completedKey(t) === d).length), backgroundColor: primary, borderRadius: 6, maxBarThickness: 30, order: 2 },
        { type: 'line', label: 'Habits completed', data: days.map((d) => habits.filter((h) => h.log[d]).length), borderColor: success, backgroundColor: hexA(success, 0.15), borderWidth: 2.5, tension: 0.2, pointRadius: 3.5, pointBackgroundColor: success, order: 1 },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: { x: plainScale(), y: gridScale() },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 16 } } },
    },
  });
  refreshIcons(page);
}
