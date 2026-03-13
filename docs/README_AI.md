# README_AI.md

## Project Overview

### What this application does

I-can-do is a browser-based personal productivity workspace with RPG-style progression. Users can create/manage tasks, daily tasks, habits, calendar events, focus sessions, notes, and finance transactions. Completion events trigger rewards that update RPG-like stats and EXP.

### Tech stack summary

- Vanilla JavaScript (ES modules, no framework)
- HTML/CSS single-page UI (`index.html`, `style.css`)
- Firebase Realtime Database via Firebase Web SDK CDN imports
- Node-based tooling for tests/lint/format

### Deployment target

- Static frontend hosting + Firebase backend services.
- This repo does **not** include `firebase.json` or `.firebaserc`; deployment target metadata is inferred from hardcoded Firebase config in source.

## Tech Stack

- JavaScript (ESM)
- HTML5 / CSS3
- Firebase App SDK (`firebase-app`)
- Firebase Realtime Database SDK (`firebase-database`)
- Node.js test runner (`node --test`)
- ESLint 9
- Prettier 3

Not detected in runtime code: Firebase Auth usage, Firestore usage, Cloud Functions usage, Storage API calls, bundlers (Vite/Webpack/Parcel).

## Directory Structure

### `/src/ui`

- **Responsibility:** Composition root and application bootstrap.
- **Important file:** `src/ui/ui.js`
- **Dependencies:** All feature modules, reward engine, activity API.

### `/src/modules`

- **Responsibility:** Feature-level UI rendering and DOM event binding.
- **Important files:**
  - `tasks.js` (tasks + daily tasks + kanban drag/drop)
  - `habits.js`
  - `notes.js`
  - `focus.js`
  - `finance.js`
  - `calendar.js` (month/week/day + generated schedule items)
  - `stats.js`
- **Dependencies:** Services + core Firebase facade.

### `/src/services`

- **Responsibility:** Use-case logic and persistence orchestration.
- **Important files:**
  - `taskService.js`, `dailyTaskService.js`, `habitService.js`
  - `calendarService.js`, `focusService.js`, `noteService.js`, `financeService.js`
  - `progressService.js` (domain event emission)
- **Dependencies:** `src/core/firebaseService.js`, core validation/model logic.

### `/src/core`

- **Responsibility:** Shared infrastructure + domain core.
- **Important files:**
  - `firebaseService.js` (Firebase init, CRUD wrappers, subscription multiplexer)
  - `firebase.js` (re-export facade)
  - `schema.js` (RTDB path constants)
  - `workItemModel.js` (task/daily/habit payload normalization)
  - `domainEvents.js`, `rewardEngine.js`, `rewardLogic.js`, `activityLogger.js`
  - `financeLogic.js`, `validation.js`
- **Dependencies:** Firebase SDK and browser APIs.

### `/tests`

- **Responsibility:** Unit tests for pure logic.
- **Important files:** `tests/reward.test.js`, `tests/finance.test.js`.

### `/config`

- **Responsibility:** Tooling and reference config.
- **Important files:** `config/eslint.config.js`, `config/Backend-read.json`, `config/scripts.js`.

### Root files

- `index.html`: single app shell + all DOM mount points.
- `style.css`: full styling.
- `package.json`: scripts and dev dependencies.

## Application Flow

### User → UI → Firebase → State → Rendering

1. `index.html` loads `src/ui/ui.js` as module entry point.
2. `ui.js` captures DOM elements and initializes all modules.
3. Module handlers call service functions for create/update/delete/complete actions.
4. Services validate/normalize payloads and write via `src/core/firebaseService.js` APIs.
5. Firebase `onValue` subscriptions push updated snapshots.
6. Modules rerender UI from latest in-memory snapshot.

### Routing logic

- No URL-based router.
- View routing is class-toggle based (`.main-view`, `.nav-btn`) in `ui.js`.
- Calendar has internal mode switching (board vs timeline, and month/week/day).

### Firebase initialization

- Done in `src/core/firebaseService.js` via `initializeApp(firebaseConfig)` and `getDatabase(app)`.
- A path-scoped listener registry allows multiple callbacks per path without duplicate listeners.

### Data flow details

- Completion actions emit domain events (`src/core/domainEvents.js`).
- Reward engine subscribes to events, applies stat updates via RTDB transaction, and writes activity log entries.
- Stats/activity dashboard updates via realtime subscriptions and mutation observers in `ui.js`.

## Environment Setup

### Required environment variables

- None currently required.
- No `.env` usage found; Firebase config is hardcoded in `src/core/firebaseService.js`.

### Firebase configuration

- RTDB paths are centralized in `src/core/schema.js`.
- APIs by domain are exposed from `src/core/firebaseService.js` (tasks, habits, notes, finance, focus, calendar, activity, stats).

### Local development setup

```bash
npm install
python -m http.server 3000
# open http://localhost:3000
```

### Build / run commands

```bash
npm test
npm run lint
npm run format
npm run format:write
```

## Deployment

### How deployment works

- Runtime model: static frontend served by any static host; data/state stored in Firebase RTDB.
- This repository has no deploy scripts or hosting config files.

### Firebase hosting configuration

- `firebase.json`: not present.
- `.firebaserc`: not present.

### Build pipeline

- No bundler/transpiler build stage.
- Browser consumes source files directly as ES modules.

## AI-Agent Safety Notes

- Prefer service-layer changes (`src/services/*`) over direct Firebase writes in UI modules.
- Reuse `createWorkItemPayload` and validation helpers to keep schema consistency.
- Add new DB paths in `src/core/schema.js` before adding APIs/modules.
- Calendar rendering merges persisted events + generated schedule instances; preserve this behavior when editing calendar logic.
