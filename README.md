# I-can-do Dashboard

## Product layout

The UI is organized into 3 logical layers:

- **Navigation Layer**: sidebar mode selector.
- **Work Layer**: main workspace (Dashboard / Calendar / Focus / Notes / Finance / Stats).
- **Action Layer**: always-visible right panel for creating and tracking Daily Tasks, Habits, and Tasks.

## Current modules

- **Dashboard (Overview mode)**
  - Today Summary
  - Today Calendar Events
  - Quick Stats (including EXP and focus-today signal)
  - Recent Activity (latest 5 logs)
- **Calendar workspace**
  - Single workspace with tabs: `Task Board` and `Calendar`
  - Task Board uses Kanban columns (`New`, `In Progress`, `Completed`, `Canceled`)
  - Calendar supports `month / week / day` views
  - Calendar displays scheduled **tasks + habits + daily tasks + calendar events**
- **Focus sessions**
  - Start/restore/cancel sessions
  - Session history list
- **Notes**
  - Create/edit/delete note entries
- **Finance**
  - Income/expense transactions
  - Monthly recurring transactions
  - Income/Outcome totals and synced balance

## Unified work-item model

`Task`, `Daily Task`, and `Habit` share a common shape via `src/core/workItemModel.js`:

```json
{
  "title": "",
  "type": "task | daily | habit | work | personal | study",
  "priority": "low | medium | high",
  "schedule": {},
  "status": "new | progress | done | canceled",
  "description": "",
  "condition": ""
}
```

Schedule modes currently used:

- `once` (specific datetime)
- `daily` (time)
- `weekly` (dayOfWeek + time)

## Development

```bash
npm install
npm run lint
npm test
npm run format
```

To run the app locally:

```bash
python -m http.server 3000
```

Then open `http://localhost:3000`.
