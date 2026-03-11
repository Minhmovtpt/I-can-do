# Architecture Overview

## High-level structure

This repository is a small, client-only web app that implements a "Life RPG Dashboard". It has no local backend service; instead, it uses Firebase Realtime Database as its backend.

- `index.html`: Static page structure and UI sections.
- `style.css`: Visual styling for the dashboard.
- `scripts.js`: Application logic, Firebase integration, and UI-to-data wiring.
- `Backend-read.json`: Example/seed backend data model for Firebase.
- `README.md`: Minimal project title.

## Runtime architecture

1. Browser loads `index.html`.
2. `index.html` loads `style.css` and module script `scripts.js`.
3. `scripts.js` imports Firebase SDK modules directly from Google CDN.
4. App initializes Firebase (`initializeApp`) + Realtime Database (`getDatabase`).
5. App attaches realtime listeners (`onValue`) to database nodes and updates the DOM.
6. User actions (add task, complete daily task, save note, add transaction, run focus timer) write to Firebase (`push`/`update`), then UI reflects updates via listeners.

This is effectively a **single-tier frontend + managed BaaS** architecture.

## Data model (Firebase Realtime Database)

Top-level nodes (as documented in `Backend-read.json` and used in code):

- `stats`: Character attributes, EXP, level.
- `dailyTasks`: Daily buttons with reward payloads + `lastCompleted` date.
- `tasks`: User tasks.
- `habits`: Habit metadata (present in schema, currently not rendered/used by JS UI).
- `focusSessions`: Placeholder object (currently unused by JS).
- `notes`: Free-form note entries.
- `finance`: Contains `balance` and `transactions`; JS currently writes/listens to `finance/transactions` only.

## Module/function responsibilities in `scripts.js`

- **Bootstrap / infra**
  - Firebase imports and config
  - `db` setup

- **Stats + progression**
  - `loadStats()`: Realtime subscription to `stats` and DOM updates.
  - `applyReward(reward)`: Reads current stats, applies reward deltas, checks level-up, writes back.
  - `checkLevelUp(stats)`: Simple loop with threshold `level * 100`.

- **Daily tasks**
  - `loadDailyTasks()`: Realtime render of daily tasks as buttons.
  - `completeDailyTask(taskId)`: Enforces once-per-day completion, applies reward, stores completion date.

- **Tasks**
  - Add task click handler pushes a new task.
  - `loadTasks()` renders titles from `tasks`.

- **Focus timer**
  - `startFocus(minutes)` runs `setInterval` countdown in browser memory and awards fixed reward on completion.

- **Notes**
  - Save note click handler pushes note records.
  - `loadNotes()` subscribes and renders notes.

- **Finance**
  - Add transaction click handler pushes to `finance/transactions`.
  - (No implemented balance recalculation/render pipeline yet.)

## UI composition

`index.html` is organized as independent dashboard cards:

- Character Stats
- Daily Tasks
- Tasks
- Habits (UI placeholder)
- Focus Session
- Notes
- Finance

Each card has stable element IDs consumed by `scripts.js` for imperative DOM updates.

## Architectural characteristics

### Strengths

- Very small deployment surface (static hosting only).
- Realtime sync provided by Firebase listeners.
- Straightforward, low-complexity code path.

### Current limitations / technical debt

- **No explicit layering**: UI rendering, domain logic, and data access are all in one file.
- **No build/test tooling**: direct CDN imports, no linting/tests.
- **Partial feature implementation**:
  - Habits section present in HTML/data, not wired in JS.
  - Finance balance element exists, but code doesn’t compute/update `balance`.
- **Potential race conditions**: `applyReward()` performs read-modify-write without transaction semantics.
- **Client-exposed Firebase config and no visible auth rules in repo**.

## Suggested evolution path

1. Split `scripts.js` into modules (`firebase.js`, `stats.js`, `tasks.js`, etc.).
2. Introduce a thin data-access layer to isolate Firebase calls.
3. Replace reward updates with Realtime Database transactions for stat consistency.
4. Complete habits + finance balance flows to match UI/schema.
5. Add basic linting/tests and optional bundling (e.g., Vite) for maintainability.
