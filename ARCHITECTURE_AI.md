# ARCHITECTURE_AI.md

## High-Level Architecture

This is a frontend-only SPA using layered modules around Firebase Realtime Database.

### 1) UI Layer

- `index.html` provides all major screens and control elements.
- `src/ui/ui.js` is the composition root:
  - gathers DOM references,
  - initializes feature modules,
  - handles main-view and calendar-tab switching,
  - derives dashboard quick summaries.
- `src/modules/*` render data and bind per-feature events.

### 2) Logic Layer

- `src/services/*` implement use cases:
  - input validation,
  - payload normalization,
  - persistence operations,
  - completion-event emission for rewards.
- `src/core/workItemModel.js` enforces shared schema for task-like entities.
- `src/core/validation.js` enforces value constraints.

### 3) Firebase Service Layer

- `src/core/firebaseService.js` initializes Firebase and defines path-scoped APIs.
- Exposes CRUD wrappers and unified subscription helpers.
- `src/core/firebase.js` re-exports selected APIs for module-level imports.

### 4) External Services

- Firebase App + Realtime Database SDKs loaded from gstatic CDN.
- No other third-party runtime APIs are used.

---

## Firebase Integration

## Initialization

- Performed once in `src/core/firebaseService.js`:
  - `initializeApp(firebaseConfig)`
  - `getDatabase(app)`
- `firebaseConfig` is hardcoded in source.

## Auth flow

- No Firebase Auth implementation found.
- No login/session/user identity flow in current codebase.

## Realtime Database usage

- Canonical DB paths defined in `src/core/schema.js` (`stats`, `tasks`, `dailyTasks`, `habits`, `notes`, `finance/transactions`, `focus/*`, `calendar/events`, `activityLog`).
- Domain APIs in `firebaseService.js` wrap each path (e.g., `tasksApi`, `focusApi`, `calendarApi`).

## Subscription model

- `subscribe(path, callback)` maintains a single `onValue` listener per path and fan-outs updates to multiple callbacks.
- Listener cleanup occurs when the last callback unsubscribes.

## Storage usage

- Firebase Storage bucket exists in config but Storage APIs are not called in runtime code.

---

## State Management

## Local state

Each module keeps local JS variables for view state, e.g.:

- `calendar.js`: `viewDate`, `viewMode`, and local caches (`eventsById`, `tasksById`, etc.).
- `focus.js`: active session id/start/duration and timer interval.
- `tasks.js`: `taskMap`, kanban binding flags.

## Global/shared state

- Persistent state lives in Firebase RTDB.
- Shared logical state is coordinated through:
  - centralized schema paths,
  - shared service APIs,
  - event bus (`domainEvents.js`) for reward-triggering events.

## Firebase listeners

- Each module subscribes to relevant collections and rerenders on snapshot changes.
- `stats.js` subscribes directly to `stats` path.
- `ui.js` also subscribes to activity log for recent activity and quick stats enrichment.

---

## Data Flow

## Standard write/read cycle

1. User action in UI module (click/change/drag/drop).
2. Module invokes service function.
3. Service validates + normalizes payload.
4. Service writes to Firebase via domain API.
5. Realtime listeners emit updated snapshots.
6. Module rerenders visible state.

## Reward event pipeline

1. Completion services call `recordTaskCompletion`, `recordDailyTaskCompletion`, `recordHabitCompletion`, or `recordFocusSessionCompletion`.
2. `progressService.js` emits typed domain event.
3. `rewardEngine.js` maps event to reward payload.
4. Stat update runs in RTDB transaction (`statsApi.transact(...)`).
5. `activityLogger.js` writes activity entries.
6. Stats/activity subscriptions rerender dashboard.

## Calendar aggregation flow

- Calendar subscribes to four streams: calendar events, tasks, daily tasks, habits.
- It materializes synthetic day events from schedules (task once, daily time, weekly day/time).
- Rendered cells merge persisted and generated events, with generated rows marked as non-editable.

---

## Key Modules

### `src/ui/ui.js`

- **Responsibility:** app bootstrap, element registry, navigation switching, dashboard observer summaries.
- **Depends on:** all `init*` modules, reward engine, activity API.

### `src/core/firebaseService.js`

- **Responsibility:** Firebase bootstrap + all path APIs + subscription multiplexer.
- **Depends on:** Firebase CDN SDK imports + `src/core/schema.js`.

### `src/modules/calendar.js`

- **Responsibility:** calendar rendering, date-grid calculations, scheduled item materialization, event CRUD UI.
- **Depends on:** `calendarService`, plus `tasksApi`, `dailyTasksApi`, `habitsApi` subscriptions.

### `src/services/taskService.js` + `src/core/workItemModel.js`

- **Responsibility:** normalize task payloads, validate updates, map status to completion fields.
- **Depends on:** validation and Firebase task API.

### `src/modules/focus.js` + `src/services/focusService.js`

- **Responsibility:** start/restore/cancel focus sessions, live timer updates, session history display.
- **Depends on:** focus session RTDB paths and completion event pipeline.

### `src/core/rewardEngine.js` + `src/core/rewardLogic.js`

- **Responsibility:** translate completion events to stat rewards and EXP/level updates.
- **Depends on:** stats transaction API and activity logger.

### `src/modules/finance.js` + `src/core/financeLogic.js`

- **Responsibility:** display transactions, recurring transaction expansion, totals/balance computation and sync.
- **Depends on:** finance service API and finance logic helpers.

---

## Configuration

## `package.json`

- ESM project (`"type": "module"`).
- Scripts:
  - `test`: `node --test tests/*.test.js`
  - `lint`: `eslint . --config config/eslint.config.js`
  - `format`: `prettier --check .`
  - `format:write`: `prettier --write .`

## `config/eslint.config.js`

- Applies browser + node globals.
- Enforces `no-unused-vars` and `no-undef`.

## `.prettierrc`

- `semi: true`, `singleQuote: false`, `printWidth: 100`.

## Firebase config files

- `firebase.json`: absent.
- `.firebaserc`: absent.

## `.env` usage

- No `.env` file or `process.env`/`import.meta.env` references in source.

---

## Build / Tooling

- No bundler, transpiler, or framework compiler.
- Run app as static files in browser.
- Dev quality gates are lint/test/format only.
- Existing tests focus on deterministic pure logic (`rewardLogic`, `financeLogic`).

---

## Potential Risks or Complexity

1. **Hardcoded Firebase credentials/config**
   - Environment switching (dev/stage/prod) is not parameterized.

2. **No explicit auth boundary**
   - App behavior assumes direct RTDB access with no user-scoped isolation logic in frontend.

3. **Listener-driven rerendering**
   - Multiple modules independently subscribe/rerender; cross-module UI consistency relies on DOM timing and realtime snapshots.

4. **Dashboard derived via `MutationObserver`**
   - `ui.js` derives summary stats/events by observing DOM changes instead of a shared state store.

5. **Calendar synthesized events**
   - Calendar merges generated schedule items with persisted events; edits/deletes only apply to persisted rows.

6. **No deployment metadata in repo**
   - Hosting setup and deploy pipeline cannot be reconstructed from repository alone.

7. **Prompt-based edit UX**
   - Several modules use `prompt()` for edit flows, which can hinder automated E2E interaction and richer validation UX.
