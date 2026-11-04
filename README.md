# LifeOS

A calm, frontend-only personal productivity app: tasks, habits, calendar, Pomodoro focus mode, notes and analytics.
Built with HTML, CSS and vanilla JavaScript (ES modules), bundled with Vite. Charts by Chart.js, icons by Lucide.
All data is stored in your browser's `localStorage`. There is no backend, no account and no tracking.

**Live demo:** https://YOUR-PROJECT.vercel.app

## Features

- **Overview:** today's tasks, habit streaks, focus time and a weekly score
- **Tasks:** priorities, categories, due dates, overdue tracking
- **Habits:** daily check-ins with streaks and completion rates
- **Calendar:** month view with tasks on their due dates
- **Focus mode:** Pomodoro timer with session history
- **Notes:** create, edit and search notes
- **Analytics:** charts for completion trends, habits and focus minutes
- **Settings:** light, dark or system theme; load sample data or clear everything

## Structure

- `index.html`: app shell (sidebar, top bar, view container)
- `css/style.css`: design system and component styles (light and dark themes)
- `js/app.js`: bootstrap, hash router, search, notifications, theme
- `js/store.js`, `seed.js`, `stats.js`, `utils.js`: state, sample data, derived metrics, helpers
- `js/overview.js`, `tasks.js`, `habits.js`, `calendar.js`, `timer.js`, `notes.js`, `analytics.js`, `settings.js`: pages
- `js/ui.js`, `js/charts.js`: modal, toast and icon helpers, Chart.js setup

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Import the repo into Vercel. It detects Vite automatically (build command `npm run build`, output directory `dist`).
