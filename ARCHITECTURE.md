# Architecture

## 1) Layered UI model

The frontend is intentionally split into 3 UI layers:

1. **Navigation Layer** (`index.html` sidebar + `ui.js` view switching)
2. **Work Layer** (main view container)
3. **Action Layer** (persistent right task panel)

This keeps mode switching separate from data-entry actions.

## 2) Module composition

`src/ui/ui.js` is the composition root. It initializes:

- `initStats`
- `initTasks`
- `initHabits`
- `initNotes`
- `initFocus`
- `initFinance`
- `initCalendar`
- reward engine + activity log binding

## 3) Core data model

`src/core/workItemModel.js` provides a shared model for task-like entities.

Supported schedule types:

- `once` (`specificAt`)
- `daily` (`time`)
- `weekly` (`dayOfWeek`, `time`)

This is used by Task/Daily/Habit creation services to reduce schema drift.

## 4) Calendar-centric orchestration

Calendar view renders from multiple realtime streams:

- calendar events
- tasks
- daily tasks
- habits

`src/modules/calendar.js` materializes scheduled daily/habit/task instances into the visible date range and merges them with normal calendar events.

## 5) Firebase subscription model

`src/core/firebaseService.js` exposes shared APIs and a multi-callback subscription registry per path. Multiple modules can subscribe to the same Firebase path without replacing each other.

## 6) Service boundaries

Services (`src/services/*`) handle:

- validation
- payload normalization
- timestamping
- persistence orchestration
- domain progress event emission on completion

## 7) Feature notes

- **Task Board** only displays normal tasks (not habits/daily tasks).
- **Calendar** shows all scheduled entities.
- **Action panel** supports creation forms for Daily Tasks, Habits, and Tasks including time/schedule + condition inputs.
- **Focus/Notes** remain standalone work modes and are fully initialized from UI root.
