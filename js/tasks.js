/* Task management: list, filters, modal, shared row component */
import { get, update } from './store.js';
import { uid, esc, todayKey, addDays, diffDays, parseKey, fmtShort, fmtLong } from './utils.js';
import { icon, refreshIcons, openModal, confirmDialog, toast, emptyState, setFieldError } from './ui.js';
import { isOverdue } from './stats.js';

export const CATEGORIES = ['Work', 'Personal', 'Health', 'Learning', 'Finance', 'Home'];
export const PRIORITIES = {
  high: { label: 'High', rank: 0 },
  medium: { label: 'Medium', rank: 1 },
  low: { label: 'Low', rank: 2 },
};
export const catSlug = (c) => String(c).toLowerCase();

export function dueInfo(t) {
  if (!t.due) return { text: 'No date', cls: '' };
  if (t.done) return { text: fmtShort(t.due), cls: '' };
  const d = diffDays(t.due, todayKey());
  if (d < 0) return { text: d === -1 ? 'Yesterday' : `${-d}d overdue`, cls: 'overdue' };
  if (d === 0) return { text: 'Today', cls: 'today' };
  if (d === 1) return { text: 'Tomorrow', cls: '' };
  if (d < 7) return { text: parseKey(t.due).toLocaleDateString(undefined, { weekday: 'long' }), cls: '' };
  return { text: fmtShort(t.due), cls: '' };
}

export function taskRow(t, { actions = true, desc = true } = {}) {
  const di = dueInfo(t);
  const over = isOverdue(t);
  return `<li class="task ${t.done ? 'is-done' : ''} ${over ? 'is-overdue' : ''}" data-id="${t.id}">
    <button type="button" class="check" role="checkbox" aria-checked="${t.done}" data-action="toggle"
      aria-label="${t.done ? 'Mark as not completed' : 'Mark as completed'}: ${esc(t.title)}">${icon('check')}</button>
    <div class="task-main">
      <div class="task-title">${esc(t.title)}</div>
      ${desc && t.desc ? `<div class="task-desc">${esc(t.desc)}</div>` : ''}
      <div class="task-meta">
        <span class="badge prio-${t.priority}"><i class="dot"></i>${PRIORITIES[t.priority].label}</span>
        <span class="chip" data-cat="${catSlug(t.category)}">${esc(t.category)}</span>
        ${t.due ? `<span class="due ${di.cls}" title="${esc(fmtLong(t.due))}">${icon(over ? 'triangle-alert' : 'clock')}${esc(di.text)}</span>` : ''}
      </div>
    </div>
    ${actions ? `<div class="row-actions">
      <button type="button" class="icon-btn sm" data-action="edit" aria-label="Edit task: ${esc(t.title)}">${icon('pencil')}</button>
      <button type="button" class="icon-btn sm" data-action="delete" aria-label="Delete task: ${esc(t.title)}">${icon('trash-2')}</button>
    </div>` : ''}
  </li>`;
}

export function toggleTask(id) {
  let nowDone = false;
  update((s) => {
    const t = s.tasks.find((x) => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? new Date().toISOString() : null;
    nowDone = t.done;
  });
  toast(nowDone ? 'Task completed' : 'Task moved back to active', nowDone ? 'success' : 'info');
}

export async function deleteTask(id) {
  const t = get().tasks.find((x) => x.id === id);
  if (!t) return;
  const ok = await confirmDialog({
    title: 'Delete task?',
    message: `“${t.title}” will be permanently removed.`,
    confirmText: 'Delete task',
    danger: true,
  });
  if (!ok) return;
  update((s) => (s.tasks = s.tasks.filter((x) => x.id !== id)));
  toast('Task deleted', 'info');
}

/** Delegated click handling for any element containing task rows */
export function bindTaskActions(root) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const li = btn.closest('.task');
    if (!li) return;
    const id = li.dataset.id;
    const a = btn.dataset.action;
    if (a === 'toggle') toggleTask(id);
    else if (a === 'edit') openTaskModal({ id });
    else if (a === 'delete') deleteTask(id);
  });
}

/* ---------------- Create / edit modal ---------------- */
export function openTaskModal({ id = null, due = '' } = {}) {
  const existing = id ? get().tasks.find((t) => t.id === id) : null;
  const t = existing || { title: '', desc: '', priority: 'medium', category: 'Work', due };
  const m = openModal({
    title: existing ? 'Edit task' : 'New task',
    html: `<form id="task-form" novalidate>
      <div class="field">
        <label for="tf-title">Title</label>
        <input id="tf-title" class="input" maxlength="120" autocomplete="off" placeholder="e.g. Prepare quarterly review" autofocus>
        <p class="field-error" role="alert"></p>
      </div>
      <div class="field">
        <label for="tf-desc">Description <span class="opt">Optional</span></label>
        <textarea id="tf-desc" class="input" rows="3" maxlength="400" placeholder="Add context, links or next steps"></textarea>
      </div>
      <div class="field-row">
        <fieldset class="field">
          <legend>Priority</legend>
          <div class="segmented">
            ${['low', 'medium', 'high']
              .map(
                (p) => `<label><input type="radio" name="priority" value="${p}" ${t.priority === p ? 'checked' : ''}><span>${PRIORITIES[p].label}</span></label>`
              )
              .join('')}
          </div>
        </fieldset>
        <div class="field">
          <label for="tf-cat">Category</label>
          <select id="tf-cat" class="input">${CATEGORIES.map(
            (c) => `<option ${t.category === c ? 'selected' : ''}>${c}</option>`
          ).join('')}</select>
        </div>
      </div>
      <div class="field">
        <label for="tf-due">Due date <span class="opt">Optional</span></label>
        <div class="date-row">
          <input id="tf-due" type="date" class="input" min="2000-01-01" max="2100-12-31">
          <button type="button" class="btn btn-sm" data-due="0">Today</button>
          <button type="button" class="btn btn-sm" data-due="1">Tomorrow</button>
          <button type="button" class="btn btn-sm" data-due="7">Next week</button>
        </div>
        <p class="field-error" role="alert"></p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn" data-close>Cancel</button>
        <button type="submit" class="btn btn-primary">${existing ? 'Save changes' : 'Create task'}</button>
      </div>
    </form>`,
  });
  const $ = (s) => m.el.querySelector(s);
  const title = $('#tf-title');
  const desc = $('#tf-desc');
  const dueIn = $('#tf-due');
  title.value = t.title;
  desc.value = t.desc || '';
  dueIn.value = t.due || '';

  m.el.querySelectorAll('[data-due]').forEach((b) =>
    b.addEventListener('click', () => {
      dueIn.value = addDays(todayKey(), Number(b.dataset.due));
      setFieldError(dueIn, '');
    })
  );
  title.addEventListener('input', () => setFieldError(title, ''));
  dueIn.addEventListener('input', () => setFieldError(dueIn, ''));

  $('#task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = title.value.trim().replace(/\s+/g, ' ');
    let ok = true;
    if (name.length < 2) {
      setFieldError(title, name ? 'Title must be at least 2 characters.' : 'Please enter a task title.');
      ok = false;
    }
    if (dueIn.validity.badInput || (dueIn.value && !/^\d{4}-\d{2}-\d{2}$/.test(dueIn.value))) {
      setFieldError(dueIn, 'Enter a valid date.');
      ok = false;
    } else if (dueIn.validity.rangeUnderflow || dueIn.validity.rangeOverflow) {
      setFieldError(dueIn, 'Date must be between 2000 and 2100.');
      ok = false;
    }
    if (!ok) {
      (title.getAttribute('aria-invalid') === 'true' ? title : dueIn).focus();
      return;
    }
    const data = {
      title: name,
      desc: desc.value.trim(),
      priority: m.el.querySelector('input[name=priority]:checked').value,
      category: $('#tf-cat').value,
      due: dueIn.value,
    };
    update((s) => {
      if (existing) Object.assign(s.tasks.find((x) => x.id === id), data);
      else s.tasks.push({ id: uid(), ...data, done: false, createdAt: new Date().toISOString(), completedAt: null });
    });
    toast(existing ? 'Task updated' : 'Task created');
    m.close();
  });
}

/* ---------------- Page ---------------- */
const F = { q: '', status: 'active', priority: 'all', category: 'all', sort: 'due-asc' };

const STATUS_TABS = [
  ['active', 'Active'],
  ['all', 'All'],
  ['completed', 'Completed'],
  ['overdue', 'Overdue'],
];

function matchStatus(t, s) {
  if (s === 'active') return !t.done;
  if (s === 'completed') return t.done;
  if (s === 'overdue') return isOverdue(t);
  return true;
}

function sortTasks(list) {
  const due = (t) => t.due || '9999-12-31';
  const rank = (t) => PRIORITIES[t.priority].rank;
  const cmp = {
    'due-asc': (a, b) => due(a).localeCompare(due(b)) || rank(a) - rank(b),
    'due-desc': (a, b) => (!a.due) - (!b.due) || due(b).localeCompare(due(a)) || rank(a) - rank(b),
    'created-desc': (a, b) => b.createdAt.localeCompare(a.createdAt),
    'created-asc': (a, b) => a.createdAt.localeCompare(b.createdAt),
    priority: (a, b) => rank(a) - rank(b) || due(a).localeCompare(due(b)),
  }[F.sort];
  const sorted = [...list].sort(cmp);
  if (F.status === 'all') sorted.sort((a, b) => Number(a.done) - Number(b.done)); // stable: completed last
  return sorted;
}

export function render(el) {
  el.innerHTML = `<div class="page">
    <div class="page-head">
      <div><h2 class="page-title">My Tasks</h2><p class="page-sub" id="task-sub"></p></div>
      <button type="button" class="btn btn-primary" id="new-task">${icon('plus')}New task</button>
    </div>
    <section class="card tasks-card">
      <div class="tabs" role="group" aria-label="Filter by status" id="status-tabs">
        ${STATUS_TABS.map(([k, l]) => `<button type="button" class="tab" data-status="${k}" aria-pressed="false">${l}<span class="count" data-count="${k}">0</span></button>`).join('')}
      </div>
      <div class="toolbar">
        <div class="input-icon grow">${icon('search')}<input id="t-search" type="search" class="input" placeholder="Search tasks…" aria-label="Search tasks" autocomplete="off"></div>
        <select id="t-prio" class="input" aria-label="Filter by priority">
          <option value="all">All priorities</option>
          ${Object.entries(PRIORITIES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
        </select>
        <select id="t-cat" class="input" aria-label="Filter by category">
          <option value="all">All categories</option>
          ${CATEGORIES.map((c) => `<option>${c}</option>`).join('')}
        </select>
        <select id="t-sort" class="input" aria-label="Sort tasks">
          <option value="due-asc">Deadline: soonest</option>
          <option value="due-desc">Deadline: latest</option>
          <option value="created-desc">Created: newest</option>
          <option value="created-asc">Created: oldest</option>
          <option value="priority">Priority</option>
        </select>
      </div>
      <div class="list-meta"><span id="t-count"></span><span class="list-actions"><button type="button" class="btn btn-sm btn-ghost" id="t-clear-filters" hidden>Clear filters</button><button type="button" class="btn btn-sm btn-ghost danger-text" id="t-clear-done" hidden>${icon('eraser')}Clear completed</button></span></div>
      <ul class="task-list" id="task-list" aria-live="polite"></ul>
    </section>
  </div>`;
  const page = el.firstElementChild;
  const $ = (s) => page.querySelector(s);
  const list = $('#task-list');

  $('#t-search').value = F.q;
  $('#t-prio').value = F.priority;
  $('#t-cat').value = F.category;
  $('#t-sort').value = F.sort;

  const filtersActive = () => F.q || F.priority !== 'all' || F.category !== 'all';

  function renderList() {
    const all = get().tasks;
    const q = F.q.trim().toLowerCase();
    const base = all.filter(
      (t) =>
        (F.priority === 'all' || t.priority === F.priority) &&
        (F.category === 'all' || t.category === F.category) &&
        (!q || `${t.title} ${t.desc || ''} ${t.category}`.toLowerCase().includes(q))
    );
    STATUS_TABS.forEach(([k]) => {
      $(`[data-count="${k}"]`).textContent = base.filter((t) => matchStatus(t, k)).length;
    });
    page.querySelectorAll('[data-status]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.status === F.status)));
    const shown = sortTasks(base.filter((t) => matchStatus(t, F.status)));
    const pending = all.filter((t) => !t.done).length;
    $('#task-sub').textContent = all.length
      ? `${pending} active · ${all.length - pending} completed`
      : 'Capture what needs to get done.';
    $('#t-count').textContent = `${shown.length} ${shown.length === 1 ? 'task' : 'tasks'}`;
    $('#t-clear-filters').hidden = !filtersActive();
    $('#t-clear-done').hidden = !(F.status === 'completed' && shown.length);

    if (shown.length) {
      list.innerHTML = shown.map((t) => taskRow(t)).join('');
    } else if (!all.length) {
      list.innerHTML = `<li>${emptyState({
        ic: 'list-checks',
        title: 'No tasks yet',
        text: 'Create your first task to start planning your day.',
        action: `<button type="button" class="btn btn-primary" data-empty-new>${icon('plus')}New task</button>`,
      })}</li>`;
    } else if (filtersActive() || F.status !== 'active') {
      const msg = {
        completed: 'No completed tasks to show.',
        overdue: 'Nothing is overdue. Nice work!',
      }[F.status];
      list.innerHTML = `<li>${emptyState({
        ic: filtersActive() ? 'search' : 'circle-check-big',
        title: filtersActive() ? 'No tasks match your filters' : msg || 'No tasks here',
        text: filtersActive() ? 'Try a different search or clear the filters.' : '',
        action: filtersActive() ? `<button type="button" class="btn" data-empty-clear>Clear filters</button>` : '',
      })}</li>`;
    } else {
      list.innerHTML = `<li>${emptyState({
        ic: 'sparkles',
        title: 'You’re all caught up',
        text: 'No active tasks. Add something new or enjoy the free time.',
        action: `<button type="button" class="btn btn-primary" data-empty-new>${icon('plus')}New task</button>`,
      })}</li>`;
    }
    refreshIcons(page);
  }

  const clearFilters = () => {
    F.q = '';
    F.priority = 'all';
    F.category = 'all';
    $('#t-search').value = '';
    $('#t-prio').value = 'all';
    $('#t-cat').value = 'all';
    renderList();
  };

  $('#new-task').addEventListener('click', () => openTaskModal());
  $('#t-search').addEventListener('input', (e) => {
    F.q = e.target.value;
    renderList();
  });
  $('#t-prio').addEventListener('change', (e) => ((F.priority = e.target.value), renderList()));
  $('#t-cat').addEventListener('change', (e) => ((F.category = e.target.value), renderList()));
  $('#t-sort').addEventListener('change', (e) => ((F.sort = e.target.value), renderList()));
  $('#status-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-status]');
    if (!b) return;
    F.status = b.dataset.status;
    renderList();
  });
  $('#t-clear-filters').addEventListener('click', clearFilters);
  $('#t-clear-done').addEventListener('click', async () => {
    const n = get().tasks.filter((t) => t.done).length;
    const ok = await confirmDialog({
      title: 'Clear completed tasks?',
      message: `${n} completed ${n === 1 ? 'task' : 'tasks'} will be permanently removed.`,
      confirmText: 'Clear completed',
      danger: true,
    });
    if (!ok) return;
    update((s) => (s.tasks = s.tasks.filter((t) => !t.done)));
    toast('Completed tasks cleared', 'info');
  });
  page.addEventListener('click', (e) => {
    if (e.target.closest('[data-empty-new]')) openTaskModal();
    if (e.target.closest('[data-empty-clear]')) clearFilters();
  });
  bindTaskActions(page);
  renderList();
}
