/* Settings page */
import { get, update, clearAll, loadSample } from './store.js';
import { icon, refreshIcons, toast, confirmDialog, setFieldError } from './ui.js';

const sw = (id, label, desc, checked) => `<div class="setting-row">
  <div><label for="${id}" class="setting-label">${label}</label><p class="setting-desc">${desc}</p></div>
  <label class="switch"><input type="checkbox" id="${id}" role="switch" ${checked ? 'checked' : ''}><span aria-hidden="true"></span></label>
</div>`;

export function render(el) {
  const s = get().settings;
  const { tasks, habits, notes, sessions } = get();

  el.innerHTML = `<div class="page narrow">
    <div class="page-head"><div><h2 class="page-title">Settings</h2><p class="page-sub">Personalize LifeOS. Everything is stored locally in your browser.</p></div></div>

    <section class="card settings-card">
      <div class="card-head"><div class="sec-title"><span class="sec-ic">${icon('user')}</span><div><h3 class="card-title">Profile</h3><p class="card-sub">How LifeOS addresses you</p></div></div></div>
      <form id="s-profile" class="inline-form" novalidate>
        <div class="field grow"><label for="s-name">Display name</label><input id="s-name" class="input" maxlength="30" autocomplete="given-name" placeholder="Your name"><p class="field-error" role="alert"></p></div>
        <button type="submit" class="btn btn-primary">Save name</button>
      </form>
    </section>

    <section class="card settings-card">
      <div class="card-head"><div class="sec-title"><span class="sec-ic">${icon('palette')}</span><div><h3 class="card-title">Appearance</h3><p class="card-sub">Choose how LifeOS looks</p></div></div></div>
      <div class="theme-options" role="radiogroup" aria-label="Theme">
        ${[['light', 'Light', 'sun'], ['dark', 'Dark', 'moon'], ['system', 'System', 'sliders-horizontal']]
          .map(([k, l, i]) => `<label class="theme-opt"><input type="radio" name="theme" value="${k}" ${s.theme === k ? 'checked' : ''}><span>${icon(i)}${l}</span></label>`)
          .join('')}
      </div>
    </section>

    <section class="card settings-card">
      <div class="card-head"><div class="sec-title"><span class="sec-ic">${icon('timer')}</span><div><h3 class="card-title">Pomodoro</h3><p class="card-sub">Focus and break durations</p></div></div></div>
      <form id="s-timer" novalidate>
        <div class="field-grid">
          <div class="field"><label for="s-focus">Focus (min)</label><input id="s-focus" type="number" class="input" min="1" max="120" inputmode="numeric"><p class="field-error" role="alert"></p></div>
          <div class="field"><label for="s-short">Short break (min)</label><input id="s-short" type="number" class="input" min="1" max="60" inputmode="numeric"><p class="field-error" role="alert"></p></div>
          <div class="field"><label for="s-long">Long break (min)</label><input id="s-long" type="number" class="input" min="1" max="90" inputmode="numeric"><p class="field-error" role="alert"></p></div>
          <div class="field"><label for="s-every">Long break every</label><input id="s-every" type="number" class="input" min="2" max="8" inputmode="numeric"><p class="field-error" role="alert"></p></div>
        </div>
        <div class="form-foot"><button type="submit" class="btn btn-primary">Save timer settings</button></div>
      </form>
      ${sw('s-auto', 'Auto-start next session', 'Begin breaks and focus sessions automatically.', s.autoStart)}
      ${sw('s-sound', 'Completion sound', 'Play a soft chime when a session ends.', s.sound)}
    </section>

    <section class="card settings-card">
      <div class="card-head"><div class="sec-title"><span class="sec-ic">${icon('sliders-horizontal')}</span><div><h3 class="card-title">Productivity preferences</h3><p class="card-sub">Tune planning and scoring</p></div></div></div>
      <div class="setting-row">
        <div><label for="s-week" class="setting-label">Week starts on</label><p class="setting-desc">Used by the calendar.</p></div>
        <select id="s-week" class="input fit"><option value="1">Monday</option><option value="0">Sunday</option><option value="6">Saturday</option></select>
      </div>
      <div class="setting-row">
        <div><label for="s-goal" class="setting-label">Daily focus goal (minutes)</label><p class="setting-desc">Counts toward your weekly productivity score.</p></div>
        <div class="field fit"><input id="s-goal" type="number" class="input" min="15" max="600" step="5" inputmode="numeric"><p class="field-error" role="alert"></p></div>
      </div>
      ${sw('s-overdue', 'Show overdue tasks in Today', 'Keep unfinished tasks visible on your dashboard.', s.showOverdueToday)}
    </section>

    <section class="card settings-card danger-zone">
      <div class="card-head"><div class="sec-title"><span class="sec-ic">${icon('database')}</span><div><h3 class="card-title">Your data</h3><p class="card-sub">${tasks.length} tasks · ${habits.length} habits · ${notes.length} notes · ${sessions.length} sessions</p></div></div></div>
      <div class="setting-row">
        <div><span class="setting-label">Export data</span><p class="setting-desc">Download a JSON backup of everything.</p></div>
        <button type="button" class="btn" id="s-export">${icon('download')}Export JSON</button>
      </div>
      <div class="setting-row">
        <div><span class="setting-label">Restore sample data</span><p class="setting-desc">Replace current data with the demo workspace.</p></div>
        <button type="button" class="btn" id="s-sample">${icon('refresh-cw')}Load sample</button>
      </div>
      <div class="setting-row">
        <div><span class="setting-label">Clear all data</span><p class="setting-desc">Permanently delete tasks, habits, notes, sessions and preferences.</p></div>
        <button type="button" class="btn btn-danger" id="s-clear">${icon('trash-2')}Clear data</button>
      </div>
    </section>
  </div>`;

  const page = el.firstElementChild;
  const $ = (q) => page.querySelector(q);
  $('#s-name').value = s.name;
  $('#s-focus').value = s.focusMin;
  $('#s-short').value = s.shortMin;
  $('#s-long').value = s.longMin;
  $('#s-every').value = s.longEvery;
  $('#s-week').value = String(s.weekStart);
  $('#s-goal').value = s.dailyFocusGoal;

  $('#s-profile').addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#s-name');
    const v = inp.value.trim().replace(/\s+/g, ' ');
    if (!v) return setFieldError(inp, 'Please enter a display name.'), inp.focus();
    setFieldError(inp, '');
    update((st) => (st.settings.name = v));
    toast('Display name updated');
  });

  page.querySelectorAll('input[name=theme]').forEach((r) =>
    r.addEventListener('change', () => update((st) => (st.settings.theme = r.value)))
  );

  $('#s-timer').addEventListener('submit', (e) => {
    e.preventDefault();
    const defs = [['#s-focus', 'focusMin', 1, 120], ['#s-short', 'shortMin', 1, 60], ['#s-long', 'longMin', 1, 90], ['#s-every', 'longEvery', 2, 8]];
    let ok = true;
    const vals = {};
    defs.forEach(([sel, key, min, max]) => {
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
    update((st) => Object.assign(st.settings, vals));
    toast('Timer settings saved');
  });
  $('#s-auto').addEventListener('change', (e) => update((st) => (st.settings.autoStart = e.target.checked)));
  $('#s-sound').addEventListener('change', (e) => update((st) => (st.settings.sound = e.target.checked)));
  $('#s-overdue').addEventListener('change', (e) => update((st) => (st.settings.showOverdueToday = e.target.checked)));
  $('#s-week').addEventListener('change', (e) => {
    update((st) => (st.settings.weekStart = Number(e.target.value)));
    toast('Preference saved');
  });
  $('#s-goal').addEventListener('change', (e) => {
    const n = Number(e.target.value);
    if (!e.target.value || !Number.isInteger(n) || n < 15 || n > 600) {
      setFieldError(e.target, 'Enter 15 to 600 minutes.');
      return;
    }
    setFieldError(e.target, '');
    update((st) => (st.settings.dailyFocusGoal = n));
    toast('Focus goal saved');
  });

  $('#s-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(get(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lifeos-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup downloaded');
  });
  $('#s-sample').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Load sample data?',
      message: 'This replaces your current tasks, habits, notes and sessions with the demo workspace.',
      confirmText: 'Load sample data',
    });
    if (!ok) return;
    loadSample();
    toast('Sample data loaded', 'info');
  });
  $('#s-clear').addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Clear all local data?',
      message: 'Every task, habit, note, focus session and preference stored in this browser will be permanently deleted. This cannot be undone.',
      confirmText: 'Yes, delete everything',
      danger: true,
    });
    if (!ok) return;
    clearAll();
    toast('All local data cleared', 'info');
  });
  refreshIcons(page);
}
