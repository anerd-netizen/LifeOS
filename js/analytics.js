/* Analytics dashboard (Chart.js). Re-rendered whenever data changes, so charts always reflect current state. */
import { get } from './store.js';
import { addDays, todayKey, fmtShort, parseKey } from './utils.js';
import { icon, refreshIcons } from './ui.js';
import { lastDays, completedKey, taskStats, habitRate, focusMinutesOn, weekScore } from './stats.js';
import { mountChart, css, hexA, gridScale, plainScale } from './charts.js';

let range = 14;

const dayLabel = (k, n) =>
  n <= 7 ? parseKey(k).toLocaleDateString(undefined, { weekday: 'short' }) : fmtShort(k);

export function render(el) {
  const { tasks, habits } = get();
  const days = lastDays(range);
  const st = taskStats();
  const done = tasks.filter((t) => t.done && days.includes(completedKey(t))).length;
  const focusMin = days.reduce((a, d) => a + focusMinutesOn(d), 0);
  const habitAvg = habits.length ? Math.round(habits.reduce((a, h) => a + habitRate(h, 30), 0) / habits.length) : 0;
  const score = weekScore();
  const prev = weekScore(addDays(todayKey(), -7));
  const delta = score - prev;

  el.innerHTML = `<div class="page">
    <div class="page-head">
      <div><h2 class="page-title">Analytics</h2><p class="page-sub">Understand how you spend your time and where to improve.</p></div>
      <div class="tabs compact" role="group" aria-label="Date range">
        ${[7, 14, 30].map((r) => `<button type="button" class="tab" data-range="${r}" aria-pressed="${range === r}">${r} days</button>`).join('')}
      </div>
    </div>
    <section class="kpis" aria-label="Key metrics">
      <div class="card kpi"><div class="stat-head"><span class="kpi-ic">${icon('circle-check-big')}</span><span class="kpi-label">Overall completion</span></div><strong class="stat-value">${st.rate}%</strong><span class="kpi-sub">${st.done} of ${st.total} tasks</span></div>
      <div class="card kpi"><div class="stat-head"><span class="kpi-ic">${icon('list-checks')}</span><span class="kpi-label">Completed · ${range}d</span></div><strong class="stat-value">${done}</strong><span class="kpi-sub">${(done / range).toFixed(1)} per day</span></div>
      <div class="card kpi"><div class="stat-head"><span class="kpi-ic">${icon('timer')}</span><span class="kpi-label">Focus time · ${range}d</span></div><strong class="stat-value">${(focusMin / 60).toFixed(1)}h</strong><span class="kpi-sub">${Math.round(focusMin / range)} min per day</span></div>
      <div class="card kpi"><div class="stat-head"><span class="kpi-ic">${icon('flame')}</span><span class="kpi-label">Habit consistency</span></div><strong class="stat-value">${habitAvg}%</strong><span class="kpi-sub">30-day average</span></div>
      <div class="card kpi"><div class="stat-head"><span class="kpi-ic">${icon('trophy')}</span><span class="kpi-label">Weekly score</span></div><strong class="stat-value">${score}</strong><span class="kpi-sub ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : ''}${delta} vs last week</span></div>
    </section>
    <div class="charts">
      <section class="card chart-card span-8"><div class="card-head"><div><h3 class="card-title">Daily task completion</h3><p class="card-sub">Tasks completed vs. tasks due each day</p></div></div><div class="chart-box"><canvas id="c-daily" role="img" aria-label="Bar chart of tasks completed per day"></canvas></div></section>
      <section class="card chart-card span-4"><div class="card-head"><div><h3 class="card-title">Overall completion rate</h3><p class="card-sub">All tasks by status</p></div></div><div class="chart-box donut"><canvas id="c-rate" role="img" aria-label="Doughnut chart of completed, pending and overdue tasks"></canvas><div class="donut-center"><strong>${st.rate}%</strong><span>completed</span></div></div></section>
      <section class="card chart-card span-6"><div class="card-head"><div><h3 class="card-title">Weekly productivity trend</h3><p class="card-sub">Score out of 100 · last 8 weeks</p></div></div><div class="chart-box"><canvas id="c-weekly" role="img" aria-label="Line chart of weekly productivity score"></canvas></div></section>
      <section class="card chart-card span-6"><div class="card-head"><div><h3 class="card-title">Focus hours</h3><p class="card-sub">Time in completed focus sessions</p></div></div><div class="chart-box"><canvas id="c-focus" role="img" aria-label="Bar chart of focus hours per day"></canvas></div></section>
      <section class="card chart-card span-8"><div class="card-head"><div><h3 class="card-title">Habit consistency</h3><p class="card-sub">Completion rate over the last 30 days</p></div></div><div class="chart-box habit-chart" style="height:${Math.max(200, habits.length * 46 + 40)}px"><canvas id="c-habits" role="img" aria-label="Bar chart of habit completion rates"></canvas></div></section>
      <section class="card chart-card span-4"><div class="card-head"><div><h3 class="card-title">Tasks by priority</h3><p class="card-sub">Distribution of all tasks</p></div></div><div class="chart-box"><canvas id="c-prio" role="img" aria-label="Doughnut chart of tasks by priority"></canvas></div></section>
    </div>
  </div>`;

  const page = el.firstElementChild;
  page.querySelectorAll('[data-range]').forEach((b) =>
    b.addEventListener('click', () => {
      range = Number(b.dataset.range);
      render(el);
    })
  );
  refreshIcons(page);

  const primary = css('--primary');
  const success = css('--success');
  const warning = css('--warning');
  const danger = css('--danger');
  const info = css('--info');
  const surface = css('--surface');
  const $ = (id) => page.querySelector(id);
  const labels = days.map((d) => dayLabel(d, range));

  /* 1. Daily completion */
  mountChart($('#c-daily'), {
    data: {
      labels,
      datasets: [
        {
          type: 'bar', label: 'Completed',
          data: days.map((d) => tasks.filter((t) => t.done && completedKey(t) === d).length),
          backgroundColor: primary, borderRadius: 6, maxBarThickness: 28, order: 2,
        },
        {
          type: 'line', label: 'Due',
          data: days.map((d) => tasks.filter((t) => t.due === d).length),
          borderColor: warning, backgroundColor: warning, borderWidth: 2, pointRadius: range > 14 ? 0 : 3,
          tension: 0.2, order: 1,
        },
      ],
    },
    options: {
      interaction: { mode: 'index', intersect: false },
      scales: { x: plainScale(), y: gridScale() },
      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 16 } } },
    },
  });

  /* 2. Completion doughnut */
  const overdue = st.overdue;
  mountChart($('#c-rate'), {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Pending', 'Overdue'],
      datasets: [{ data: [st.done, st.pending - overdue, overdue], backgroundColor: [success, info, danger], borderColor: surface, borderWidth: 3, hoverOffset: 4 }],
    },
    options: { cutout: '72%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 14 } } } },
  });

  /* 3. Weekly trend */
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(todayKey(), -7 * (7 - i)));
  mountChart($('#c-weekly'), {
    type: 'line',
    data: {
      labels: weeks.map((w, i) => (i === 7 ? 'This week' : fmtShort(addDays(w, -6)))),
      datasets: [{
        label: 'Productivity score', data: weeks.map((w) => weekScore(w)),
        borderColor: primary, backgroundColor: hexA(primary, 0.12), fill: true, tension: 0.35,
        borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: surface, pointBorderColor: primary, pointBorderWidth: 2,
      }],
    },
    options: {
      scales: { x: plainScale(), y: gridScale({ min: 0, max: 100, ticks: { stepSize: 25, padding: 8 } }) },
      plugins: { legend: { display: false } },
    },
  });

  /* 4. Focus hours */
  mountChart($('#c-focus'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Focus hours', data: days.map((d) => +(focusMinutesOn(d) / 60).toFixed(2)),
        backgroundColor: info, borderRadius: 6, maxBarThickness: 28,
      }],
    },
    options: {
      scales: { x: plainScale(), y: gridScale({ ticks: { precision: 1, padding: 8, callback: (v) => `${v}h` } }) },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.y.toFixed(1)} hours` } } },
    },
  });

  /* 5. Habit consistency */
  mountChart($('#c-habits'), {
    type: 'bar',
    data: {
      labels: habits.map((h) => h.name),
      datasets: [{
        label: 'Completion rate', data: habits.map((h) => habitRate(h, 30)),
        backgroundColor: habits.map((h) => h.color), borderRadius: 6, barThickness: 20,
      }],
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: gridScale({ min: 0, max: 100, ticks: { callback: (v) => `${v}%`, stepSize: 25, padding: 8 } }),
        y: plainScale({ ticks: { autoSkip: false } }),
      },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` ${c.parsed.x}% of days` } } },
    },
  });

  /* 6. Priority distribution */
  mountChart($('#c-prio'), {
    type: 'doughnut',
    data: {
      labels: ['High', 'Medium', 'Low'],
      datasets: [{
        data: ['high', 'medium', 'low'].map((p) => tasks.filter((t) => t.priority === p).length),
        backgroundColor: [danger, warning, success], borderColor: surface, borderWidth: 3, hoverOffset: 4,
      }],
    },
    options: { cutout: '60%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, boxHeight: 8, padding: 14 } } } },
  });
}
