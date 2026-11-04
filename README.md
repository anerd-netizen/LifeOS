# LifeOS

A calm, frontend-only personal productivity app that brings tasks, habits, a calendar, a focus timer, notes and analytics into one workspace.

**Live demo:** https://LifeOS-anerd.vercel.app

## Features

- **Overview:** today's tasks, habit streaks, focus time and a weekly score at a glance
- **Tasks:** priorities, categories, due dates and overdue tracking
- **Habits:** daily check-ins with streaks and completion rates
- **Calendar:** month view showing tasks on their due dates
- **Focus mode:** Pomodoro timer with session tracking
- **Notes:** create, edit and search notes
- **Analytics:** charts for task completion, habits and focus minutes
- **Settings:** light, dark or system theme; load sample data or clear everything

## Privacy

All data stays in your browser's `localStorage`. There is no backend, no account and no analytics or tracking. The only outside request is Google Fonts, used for the Geist typeface. Clearing your browser data removes your LifeOS data, so back up anything you need first.

## Tech stack

| Area       | Choice                                           |
| ---------- | ------------------------------------------------ |
| Language   | Vanilla JavaScript (ES modules), HTML5, CSS3     |
| Build tool | Vite                                             |
| Charts     | Chart.js                                         |
| Icons      | Lucide                                           |
| Routing    | Hash-based router (`#/overview`, `#/tasks`, ...) |
| State      | Central store persisted to `localStorage`        |
| Theming    | CSS custom properties with light and dark themes |

## Project structure

```
index.html          App shell (sidebar, top bar, view container)
css/style.css       Design system and component styles
js/app.js           Bootstrap, router, search, notifications, theme
js/store.js         State store with localStorage persistence
js/seed.js          Sample data
js/stats.js         Derived metrics (streaks, completion rates, scores)
js/utils.js         Date and string helpers
js/ui.js            Modals, toasts, icon helpers
js/charts.js        Chart.js setup
js/overview.js      Overview page
js/tasks.js         Tasks page
js/habits.js        Habits page
js/calendar.js      Calendar page
js/timer.js         Focus timer page
js/notes.js         Notes page
js/analytics.js     Analytics page
js/settings.js      Settings page
```

## Run locally

You need [Node.js](https://nodejs.org) (LTS).

```bash
git clone https://github.com/anerd-netizen/LifeOS.git
cd LifeOS
npm install
npm run dev
```

Open the address Vite prints (usually `http://localhost:5173`).

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # serves the production build locally
```

## Deploy

Import the repository into [Vercel](https://vercel.com). It detects Vite automatically (build command `npm run build`, output directory `dist`). Every push to `main` redeploys.

## Ideas for next steps

- Export and import data as JSON
- Recurring tasks and reminders
- Drag and drop to reorder tasks
- Installable PWA with offline support
- Optional cloud sync

## License

MIT
