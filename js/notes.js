/* Notes manager: two-pane list + editor with autosave */
import { get, update } from './store.js';
import { uid, esc, fmtDateTime, relTime } from './utils.js';
import { icon, refreshIcons, confirmDialog, toast, emptyState } from './ui.js';

export const NOTE_CATEGORIES = ['Ideas', 'Work', 'Personal', 'Journal', 'Learning', 'Reference'];

let selectedId = null;
let query = '';
let catFilter = 'all';

export function selectNote(id) {
  selectedId = id;
}

export function createNote() {
  const note = {
    id: uid(),
    title: '',
    body: '',
    category: catFilter !== 'all' ? catFilter : 'Ideas',
    pinned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  selectedId = note.id;
  query = '';
  update((s) => s.notes.push(note));
  toast('Note created');
  return note;
}

const words = (t) => (t.trim() ? t.trim().split(/\s+/).length : 0);

function visibleNotes() {
  const q = query.trim().toLowerCase();
  return get()
    .notes.filter((n) => (catFilter === 'all' || n.category === catFilter) && (!q || `${n.title} ${n.body} ${n.category}`.toLowerCase().includes(q)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
}

function noteItem(n) {
  const preview = n.body.replace(/\s+/g, ' ').trim().slice(0, 110);
  return `<li><button type="button" class="note-item ${n.id === selectedId ? 'active' : ''}" data-id="${n.id}" aria-current="${n.id === selectedId}">
    <span class="note-item-top"><strong>${esc(n.title.trim() || 'Untitled')}</strong>${n.pinned ? `<span class="pin-ic" title="Pinned">${icon('pin')}</span>` : ''}</span>
    <span class="note-preview">${esc(preview) || '<em>No additional text</em>'}</span>
    <span class="note-item-meta"><span class="chip" data-ncat="${esc(n.category.toLowerCase())}">${esc(n.category)}</span><span>${esc(relTime(n.updatedAt))}</span></span>
  </button></li>`;
}

export function render(el) {
  if (selectedId && !get().notes.some((n) => n.id === selectedId)) selectedId = null;
  const hasNotes = get().notes.length > 0;

  el.innerHTML = `<div class="page">
    <div class="page-head">
      <div><h2 class="page-title">Notes</h2><p class="page-sub">Capture ideas, meeting notes and reference material.</p></div>
      <button type="button" class="btn btn-primary" id="new-note">${icon('plus')}New note</button>
    </div>
    <div class="notes ${selectedId ? 'show-editor' : ''}" id="notes">
      <section class="card notes-list" aria-label="Notes list">
        <div class="input-icon">${icon('search')}<input id="n-search" type="search" class="input" placeholder="Search notes…" aria-label="Search notes" autocomplete="off"></div>
        <div class="chip-filter" role="group" aria-label="Filter by category">
          ${['all', ...NOTE_CATEGORIES].map((c) => `<button type="button" class="fchip" data-cat="${c}" aria-pressed="${catFilter === c}">${c === 'all' ? 'All' : c}</button>`).join('')}
        </div>
        <ul class="note-items" id="note-items"></ul>
      </section>
      <section class="card note-editor" id="note-editor" aria-label="Note editor"></section>
    </div>
  </div>`;
  const page = el.firstElementChild;
  const $ = (s) => page.querySelector(s);
  const items = $('#note-items');
  const editor = $('#note-editor');
  $('#n-search').value = query;

  function renderItems() {
    const list = visibleNotes();
    if (list.length) {
      const pinned = list.filter((n) => n.pinned);
      const rest = list.filter((n) => !n.pinned);
      items.innerHTML =
        (pinned.length && rest.length ? `<li class="group-label">Pinned</li>` : '') +
        pinned.map(noteItem).join('') +
        (pinned.length && rest.length ? `<li class="group-label">Others</li>` : '') +
        rest.map(noteItem).join('');
    } else {
      items.innerHTML = `<li>${emptyState({
        ic: query || catFilter !== 'all' ? 'search' : 'notebook-text',
        title: query || catFilter !== 'all' ? 'No notes found' : 'No notes yet',
        text: query || catFilter !== 'all' ? 'Try a different search or category.' : 'Create a note to get started.',
      })}</li>`;
    }
    refreshIcons(items);
  }

  function renderEditor() {
    const n = get().notes.find((x) => x.id === selectedId);
    if (!n) {
      editor.innerHTML = emptyState({
        ic: 'sticky-note',
        title: hasNotes ? 'Select a note' : 'Write your first note',
        text: hasNotes ? 'Pick a note from the list or create a new one.' : 'Notes are saved automatically on this device.',
        action: `<button type="button" class="btn btn-primary" data-new>${icon('plus')}New note</button>`,
      });
      refreshIcons(editor);
      return;
    }
    editor.innerHTML = `
      <div class="editor-bar">
        <button type="button" class="icon-btn back-btn" id="n-back" aria-label="Back to notes list">${icon('arrow-left')}</button>
        <label class="sr-only" for="n-cat">Category</label>
        <select id="n-cat" class="input sm">${NOTE_CATEGORIES.map((c) => `<option ${c === n.category ? 'selected' : ''}>${c}</option>`).join('')}</select>
        <span class="grow"></span>
        <span class="save-state" id="n-saved" aria-live="polite">Saved</span>
        <button type="button" class="btn btn-sm ${n.pinned ? 'btn-pinned' : ''}" id="n-pin" aria-pressed="${n.pinned}">${icon(n.pinned ? 'pin-off' : 'pin')}${n.pinned ? 'Unpin' : 'Pin'}</button>
        <button type="button" class="icon-btn" id="n-del" aria-label="Delete note">${icon('trash-2')}</button>
      </div>
      <label class="sr-only" for="n-title">Note title</label>
      <input id="n-title" class="note-title" maxlength="120" placeholder="Untitled" autocomplete="off">
      <label class="sr-only" for="n-body">Note content</label>
      <textarea id="n-body" class="note-body" placeholder="Start writing…"></textarea>
      <div class="editor-foot"><span id="n-mod">Last modified ${esc(fmtDateTime(n.updatedAt))}</span><span id="n-words">${words(n.body)} words</span></div>`;
    const title = editor.querySelector('#n-title');
    const body = editor.querySelector('#n-body');
    title.value = n.title;
    body.value = n.body;
    if (!n.title && !n.body) title.focus();

    let savedTimer;
    const save = () => {
      const note = get().notes.find((x) => x.id === n.id);
      if (!note) return;
      if (note.title === title.value && note.body === body.value) return;
      update(
        (s) => {
          const x = s.notes.find((y) => y.id === n.id);
          x.title = title.value;
          x.body = body.value;
          x.updatedAt = new Date().toISOString();
        },
        { silent: true }
      );
      editor.querySelector('#n-mod').textContent = `Last modified ${fmtDateTime(new Date().toISOString())}`;
      editor.querySelector('#n-words').textContent = `${words(body.value)} words`;
      const saved = editor.querySelector('#n-saved');
      saved.textContent = 'Saved';
      saved.classList.add('flash');
      clearTimeout(savedTimer);
      savedTimer = setTimeout(() => saved.classList.remove('flash'), 1200);
      renderItems();
    };
    title.addEventListener('input', save);
    body.addEventListener('input', save);
    editor.querySelector('#n-cat').addEventListener('change', (e) => {
      update((s) => {
        const x = s.notes.find((y) => y.id === n.id);
        x.category = e.target.value;
        x.updatedAt = new Date().toISOString();
      });
    });
    editor.querySelector('#n-pin').addEventListener('click', () => {
      const willPin = !get().notes.find((y) => y.id === n.id).pinned;
      update((s) => {
        s.notes.find((y) => y.id === n.id).pinned = willPin;
      });
      toast(willPin ? 'Note pinned to top' : 'Note unpinned', 'info');
    });
    editor.querySelector('#n-back').addEventListener('click', () => {
      selectedId = null;
      render(el);
    });
    editor.querySelector('#n-del').addEventListener('click', async () => {
      const cur = get().notes.find((x) => x.id === n.id);
      const ok = await confirmDialog({
        title: 'Delete note?',
        message: `“${(cur.title || 'Untitled').trim()}” will be permanently deleted.`,
        confirmText: 'Delete note',
        danger: true,
      });
      if (!ok) return;
      update((s) => (s.notes = s.notes.filter((x) => x.id !== n.id)));
      selectedId = null;
      toast('Note deleted', 'info');
    });
    refreshIcons(editor);
  }

  $('#new-note').addEventListener('click', createNote);
  editor.addEventListener('click', (e) => {
    if (e.target.closest('[data-new]')) createNote();
  });
  $('#n-search').addEventListener('input', (e) => {
    query = e.target.value;
    renderItems();
  });
  page.querySelectorAll('.fchip').forEach((b) =>
    b.addEventListener('click', () => {
      catFilter = b.dataset.cat;
      page.querySelectorAll('.fchip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      renderItems();
    })
  );
  items.addEventListener('click', (e) => {
    const b = e.target.closest('.note-item');
    if (!b) return;
    selectedId = b.dataset.id;
    $('#notes').classList.add('show-editor');
    renderItems();
    renderEditor();
  });

  renderItems();
  renderEditor();
  refreshIcons(page);
}
