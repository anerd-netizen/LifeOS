/* Realistic first-launch sample data, generated relative to today */
import { addDays, todayKey, uid, dateKey } from './utils.js';

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = (key, h, m) => {
  const [y, mo, d] = key.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).toISOString();
};

export function buildSeed(defaults) {
  const r = rng(240611);
  const ri = (n) => Math.floor(r() * n);
  const today = todayKey();
  const now = Date.now();
  const prios = ['low', 'medium', 'medium', 'high'];

  /* ---------- tasks ---------- */
  const tasks = [];
  const active = [
    ['Send invoice to Northwind Studio', 'Finance', 'high', -1, 'October retainer – attach the time summary.'],
    ['Declutter home office desk', 'Home', 'low', -3, ''],
    ['Finalize Q4 product roadmap', 'Work', 'high', 0, 'Align priorities with design and engineering leads.'],
    ['Review pull requests for design system', 'Work', 'medium', 0, ''],
    ['Reply to client feedback on onboarding flow', 'Work', 'medium', 0, 'Summarize the three biggest changes requested.'],
    ['Call mum', 'Personal', 'low', 1, ''],
    ['Book dentist appointment', 'Health', 'low', 1, ''],
    ['Prepare slides for Friday team sync', 'Work', 'high', 2, 'Include sprint metrics and demo recording.'],
    ['Pay electricity and internet bills', 'Finance', 'medium', 3, ''],
    ['Finish TypeScript generics chapter', 'Learning', 'medium', 4, 'Do the exercises at the end.'],
    ['Plan weekend hike with friends', 'Personal', 'low', 5, ''],
    ['Renew car insurance', 'Finance', 'high', 6, 'Compare at least three quotes before renewing.'],
    ['Sprint retrospective notes', 'Work', 'low', 8, ''],
    ['Draft blog post: lessons from shipping v2', 'Work', 'medium', 9, ''],
    ['Schedule annual health checkup', 'Health', 'medium', 12, ''],
    ['Update portfolio case study', 'Work', 'medium', 16, ''],
    ['Take Spanish A2 practice test', 'Learning', 'medium', 20, ''],
    ['Team offsite logistics', 'Work', 'high', 24, 'Venue, catering, and travel for 14 people.'],
  ];
  active.forEach(([title, category, priority, off, desc], i) => {
    tasks.push({
      id: uid(),
      title,
      desc,
      category,
      priority,
      due: addDays(today, off),
      done: false,
      createdAt: at(addDays(today, -(2 + (i % 6))), 9, 10 + i),
      completedAt: null,
    });
  });

  const todayDone = [
    ['Send weekly status update', 'Work', 'medium'],
    ['Water the plants', 'Home', 'low'],
  ];
  todayDone.forEach(([title, category, priority], i) => {
    tasks.push({
      id: uid(), title, desc: '', category, priority, due: today, done: true,
      createdAt: at(addDays(today, -2), 9, 0),
      completedAt: at(today, 0, 5 + i),
    });
  });

  const pool = [
    ['Outline onboarding email sequence', 'Work'], ['Refactor settings page components', 'Work'],
    ['Renew gym membership', 'Health'], ['Read chapter on system design', 'Learning'],
    ['Reconcile monthly budget', 'Finance'], ['Clean up inbox', 'Work'],
    ['Prepare 1:1 agenda', 'Work'], ['Fix flaky test in CI', 'Work'],
    ['Order printer ink', 'Home'], ['Write meeting recap', 'Work'],
    ['Update résumé', 'Personal'], ['Meal prep for the week', 'Health'],
    ['Review analytics dashboard', 'Work'], ['Call insurance provider', 'Finance'],
    ['Practice Spanish vocabulary', 'Learning'], ['Backup photos to drive', 'Personal'],
    ['Draft quarterly OKRs', 'Work'], ['Organize project files', 'Work'],
    ['Review contract draft', 'Finance'], ['Plan trip itinerary', 'Personal'],
    ['Vacuum and tidy living room', 'Home'], ['Book physio session', 'Health'],
  ];
  let pi = 0;
  let doneCount = 0;
  for (let off = 1; off <= 55 && doneCount < 44; off++) {
    const key = addDays(today, -off);
    const dow = new Date(key + 'T12:00:00').getDay();
    const weekend = dow === 0 || dow === 6;
    if (off > 5 && r() > (weekend ? 0.25 : 0.82)) continue;
    const n = r() < 0.75 ? 1 : 2;
    for (let j = 0; j < n; j++) {
      const [title, category] = pool[pi++ % pool.length];
      const dueShift = r() < 0.7 ? 0 : r() < 0.5 ? 1 : -1;
      tasks.push({
        id: uid(), title, desc: '', category,
        priority: prios[ri(4)],
        due: addDays(key, dueShift),
        done: true,
        createdAt: at(addDays(key, -(1 + ri(4))), 9, ri(60)),
        completedAt: at(key, 10 + ri(8), ri(60)),
      });
      doneCount++;
    }
  }

  /* ---------- habits ---------- */
  const created = addDays(today, -60);
  const habitDefs = [
    ['Read 20 minutes', 'book-open', '#5B66E0', 0.72, 9, true],
    ['Exercise', 'dumbbell', '#E2603F', 0.55, 3, false],
    ['Drink enough water', 'droplets', '#2E8FD6', 0.82, 14, true],
    ['Practice coding', 'code', '#2F9E5B', 0.7, 6, false],
    ['Sleep on time', 'moon', '#8A5CD6', 0.5, 2, true],
  ];
  const habits = habitDefs.map(([name, icon, color, p, streak, doneToday]) => {
    const log = {};
    const start = doneToday ? 0 : 1;
    for (let i = 0; i < 58; i++) {
      const key = addDays(today, -i);
      if (i < start) continue;
      if (i < start + streak) log[key] = true;
      else if (i === start + streak) continue;
      else if (r() < p) log[key] = true;
    }
    return { id: uid(), name, icon, color, createdAt: created, log };
  });

  /* ---------- sessions ---------- */
  const labels = ['Deep work: roadmap', 'Code review', 'Reading', 'Writing docs', 'Spanish practice', 'Design system refactor', 'Inbox zero', 'Study: TypeScript'];
  const sessions = [];
  for (let off = 55; off >= 1; off--) {
    const key = addDays(today, -off);
    const dow = new Date(key + 'T12:00:00').getDay();
    const weekend = dow === 0 || dow === 6;
    const n = weekend ? (r() < 0.3 ? 1 : 0) : 1 + ri(4);
    for (let j = 0; j < n; j++) {
      sessions.push({
        id: uid(), type: 'focus', minutes: 25,
        label: labels[ri(labels.length)],
        completedAt: at(key, 9 + j * 2, 10 + ri(40)),
      });
    }
  }
  const startOfToday = new Date(dateKey(new Date()) + 'T00:00:00').getTime();
  [95, 50].forEach((minsAgo, i) => {
    sessions.push({
      id: uid(), type: 'focus', minutes: 25,
      label: labels[i],
      completedAt: new Date(Math.max(startOfToday + 60e3 * (1 + i), now - minsAgo * 60e3)).toISOString(),
    });
  });

  /* ---------- notes ---------- */
  const ago = (h) => new Date(now - h * 3600e3).toISOString();
  const notes = [
    {
      id: uid(), title: 'Product ideas', category: 'Ideas', pinned: true,
      body: '• Weekly review assistant that summarizes completed work\n• Shareable focus rooms for pairing sessions\n• Habit streak widget for the home screen\n• Keyboard-first quick capture (press N anywhere)\n\nNext step: validate with five users before building anything.',
      createdAt: ago(240), updatedAt: ago(3),
    },
    {
      id: uid(), title: 'Weekly review template', category: 'Reference', pinned: true,
      body: 'Every Friday, 20 minutes:\n\n1. What did I finish this week?\n2. What slipped, and why?\n3. Which habits held up?\n4. Top three priorities for next week\n5. One thing to stop doing',
      createdAt: ago(900), updatedAt: ago(52),
    },
    {
      id: uid(), title: 'Roadmap sync – meeting notes', category: 'Work', pinned: false,
      body: 'Attendees: Priya, Marcus, Jo, Alex\n\nDecisions\n- Ship the calendar redesign before the end of the quarter\n- Push the mobile app beta to January\n- Hire one more frontend engineer\n\nAction items\n- Alex: finalize the Q4 roadmap doc\n- Marcus: estimate effort for the billing migration',
      createdAt: ago(80), updatedAt: ago(26),
    },
    {
      id: uid(), title: 'Deep Work – book highlights', category: 'Learning', pinned: false,
      body: '“Clarity about what matters provides clarity about what does not.”\n\nKey takeaways\n- Schedule deep work blocks like meetings\n- Embrace boredom, resist constant stimulation\n- Shut down fully at the end of the workday',
      createdAt: ago(400), updatedAt: ago(120),
    },
    {
      id: uid(), title: 'Gratitude journal', category: 'Journal', pinned: false,
      body: 'Three good things today:\n\n1. Long walk before breakfast\n2. Finally cracked the layout bug\n3. Dinner with Sam and Lena',
      createdAt: ago(500), updatedAt: ago(30),
    },
    {
      id: uid(), title: 'Weekend trip packing list', category: 'Personal', pinned: false,
      body: 'Hiking boots\nRain jacket\nPower bank\nWater bottle\nTrail snacks\nFirst-aid kit\nPaper map (just in case)',
      createdAt: ago(300), updatedAt: ago(200),
    },
  ];

  return {
    version: 1,
    settings: { ...defaults, name: 'Alex' },
    tasks, habits, notes, sessions,
  };
}
