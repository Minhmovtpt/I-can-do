# Architecture

## 1) Architectural Overview
This application is a modular frontend dashboard that uses Firebase Realtime Database as its only persistence mechanism. At runtime, a single composition root (`src/ui/ui.js`) initializes all modules, starts the reward engine, and attaches Firebase subscriptions for live rendering.

The architecture is intentionally split between:
- **UI modules** (DOM rendering + interaction handlers),
- **service/use-case functions** (validated mutations),
- **core infrastructure/domain logic** (Firebase access, event bus, reward and finance rules).

A key design decision is the **event-driven progression model**: user actions (task/habit/focus completion) emit domain events, and a dedicated reward engine subscribes to those events to mutate stats and write activity entries.

---

## 2) Layered Architecture
```text
+------------------------------------------------------------+
| UI Layer (index.html, src/ui/ui.js)                        |
| - Collect DOM refs                                           |
| - Initialize modules + reward engine                         |
+-------------------------------+----------------------------+
                                |
                                v
+------------------------------------------------------------+
| Feature Modules (src/modules/*.js)                          |
| - Render Firebase data                                       |
| - Bind button/input handlers                                 |
| - Call services or APIs                                      |
+-------------------------------+----------------------------+
                                |
                                v
+------------------------------------------------------------+
| Service Layer (src/services/*.js)                           |
| - Validate input                                              |
| - Shape mutation payloads/timestamps                          |
| - Emit domain action events via progressService               |
+-------------------------------+----------------------------+
                                |
                +---------------+---------------+
                |                               |
                v                               v
+-------------------------------+     +------------------------+
| Domain Events (core/domain...)|     | Core Firebase Infra    |
| - In-memory action bus         |     | (core/firebaseService) |
+---------------+---------------+     | - path APIs            |
                |                     | - onValue listeners    |
                v                     | - transactions         |
+-------------------------------+     +------------------------+
| Reward Engine (core/reward...)|
| - Resolve reward by event type |
| - Atomic stats transaction     |
| - Activity log entries         |
+-------------------------------+
```

---

## 3) Runtime Data Flow
1. `index.html` loads `src/ui/ui.js` as an ES module entrypoint.
2. `ui.js` resolves all required DOM nodes and calls:
   - `initRewardEngine`
   - `initStats`, `initTasks`, `initHabits`, `initNotes`, `initFinance`, `initFocus`
   - activity log subscription initializer.
3. Each feature module subscribes to Firebase data and rerenders section state when snapshots change.
4. User actions trigger service functions (e.g., create/update/complete/delete).
5. Services validate/normalize payloads, persist through Firebase APIs, and emit progress events when relevant.
6. Reward engine consumes emitted events and updates `stats` via Firebase transaction.
7. Activity logger writes reward records to `activityLog`.
8. Stats and activity UI sections update automatically through active subscriptions.

---

## 4) Event System
The event system is a minimal in-memory pub/sub in `src/core/domainEvents.js`:
- `ACTION_TYPES` defines canonical action names:
  - `TASK_COMPLETED`
  - `DAILY_TASK_COMPLETED`
  - `HABIT_COMPLETED`
  - `FOCUS_SESSION_COMPLETED`
- `emitActionEvent(event)` dispatches to all registered listeners.
- `subscribeActionEvents(listener)` registers a listener and returns an unsubscribe callback.

`src/services/progressService.js` is the producer boundary that converts use-case outcomes into events. This keeps reward behavior decoupled from individual modules.

---

## 5) Reward Engine Pipeline
`src/core/rewardEngine.js` subscribes to action events and maps each event type to a reward payload and source label.

Behavior by event type:
- Task completion: task-specific reward or default `{ exp: 20 }`.
- Daily task completion: reward from daily task payload (or empty object).
- Habit completion: reward from habit payload (or empty object).
- Focus session completion: fixed `{ foc: 5, exp: 10 }`.

It then executes:
1. Resolve/normalize reward values using `applyRewardLocally(...).reward`.
2. Execute `statsApi.transact(...)` to apply reward atomically against current stats.
3. Log each non-zero stat delta to `activityLog` via `logRewardActivity`.

```text
Action Completed
   |
   v
progressService.record*Completion
   |
   v
emitActionEvent({ type, payload })
   |
   v
rewardEngine subscriber
   |
   +--> resolveEventReward(type, payload)
   |
   +--> statsApi.transact(applyRewardLocally)
   |
   +--> activityApi.addEntry(... per stat delta)
   v
Realtime listeners rerender Stats + Activity Log
```

---

## 6) Firebase Integration
Firebase is centralized in `src/core/firebaseService.js`:
- Initializes app/database with a single config object.
- Exposes low-level helpers: `read`, `write`, `patch`, `create`, `destroy`, `transaction`.
- Wraps path-specific domain APIs:
  - `statsApi`, `tasksApi`, `notesApi`, `financeApi`, `dailyTasksApi`, `habitsApi`, `focusApi`, `activityApi`.

Path constants are declared in `src/core/schema.js` (`PATHS`) to avoid string scattering.

Subscription model:
- Generic `subscribe(path, callback)` binds `onValue`.
- `activeListeners` map ensures only one active handler per path, replacing previous listeners safely.
- `unsubscribeAll()` detaches all tracked listeners.

---

## 7) Service Layer Responsibilities
Service files in `src/services` act as use-case boundaries:
- **Validation:**
  - `requireNonEmptyText`
  - `requireAmount`
  - `requireEnum`
- **Payload shaping:** timestamps (`createdAt`, `updatedAt`, `date`, `completedAt`), default reward values.
- **Mutation orchestration:** calls into specific Firebase APIs.
- **Event emission:** completion-oriented use cases call `progressService` to emit domain events.

Notable per-service behavior:
- `taskService`: create/update/complete/delete tasks, default completion reward `{ exp: 20 }`.
- `dailyTaskService`: blocks duplicate completion by comparing `lastCompleted` with today string.
- `habitService`: computes streak continuity based on yesterday/today completion dates.
- `focusService`: manages both session history and singleton active-session state.
- `financeService`: transaction validation + DB balance synchronization using domain math.
- `noteService`: validation and CRUD for note content.

---

## 8) Module Responsibilities
Feature modules in `src/modules` are primarily UI adapters:
- **`stats.js`**: subscribes to `stats`, updates text values and progress bars.
- **`tasks.js`**: renders daily tasks and one-off tasks, handles add/edit/delete/complete flows.
- **`habits.js`**: renders habits with streak values and completion action.
- **`focus.js`**: starts/cancels/restores timers, renders session list, supports delete.
- **`notes.js`**: add/edit/delete notes and render notes ordered by latest timestamp.
- **`finance.js`**: add/edit/delete transactions, render ordered list, compute local balance and sync it remotely.

`src/ui/ui.js` is the composition root: it owns DOM element discovery and initializer sequencing.

---

## 9) Domain Logic (`rewardEngine`, `financeLogic`)
### Reward logic (`src/core/rewardLogic.js`)
Pure functions:
- `resolveReward(rawReward, context)` converts values to numbers and applies multiplier/skill-bonus rules.
- `applyRewardLocally(currentStats, rawReward, context)` merges with default stats and applies stat deltas.
- `applyLevelUps(stats)` loops while EXP exceeds level scaling threshold (`level * 100`).

This file is deterministic and unit-tested.

### Finance logic (`src/core/financeLogic.js`)
`calculateBalance(transactions)` reduces transaction map into signed sum:
- `income` adds
- `expense` subtracts

Also deterministic and unit-tested.

---

## 10) Activity Logging System
`src/core/activityLogger.js` logs each non-zero reward component as its own row in `activityLog`.

For each stat delta it stores:
- `stat`
- `value`
- `source`
- `createdAt`
- human-readable `message` (`+{value} {STAT} ({source})`)

UI rendering in `ui.js`:
- subscribes to `activityLog`,
- sorts by `createdAt` descending,
- shows latest 20 entries.

---

## 11) Listener Lifecycle Management
Listener lifecycle is mostly managed in `firebaseService.subscribe`:
- Subscribing to an already-subscribed path detaches old handler and registers new one.
- Every subscribe returns an explicit unsubscribe closure.
- `unsubscribeAll()` can be used for global teardown.

Current behavior notes:
- Feature initializers return unsubscribe callbacks, but `ui.js` does not aggregate/dispose them during app lifecycle teardown.
- In browser usage (single-page static app), this is usually acceptable, but explicit teardown hooks would improve embeddability/testing.

---

## 12) Future extensibility
Architecture supports straightforward extension:
- Add a new module/service by following existing `initX + service + core API` pattern.
- Add new action types in `ACTION_TYPES` and reward mapping in `resolveEventReward`.
- Extend reward rules (multipliers, skill bonuses, level scaling) in one pure domain file.
- Introduce additional projections (analytics/history) by subscribing to existing event bus or activity log.

Suggested next evolutions:
1. Introduce app-level lifecycle manager that stores and disposes all unsubscribe handlers.
2. Move Firebase config to environment-driven injection.
3. Add integration tests around service/event/reward orchestration.
4. Standardize all writes through services (some modules currently read through direct API while mutating through services).
5. Add typed entity/event contracts for safer module boundaries.

---

## Event Flow Diagram
```text
[User clicks Complete]
        |
        v
[Feature Module Handler]
        |
        v
[Service complete*()]
        |
        v
[progressService.record*Completion]
        |
        v
[domainEvents.emitActionEvent]
        |
        v
[rewardEngine subscriber]
        |
        +--> [stats transaction]
        |
        +--> [activity log writes]
        v
[Firebase onValue listeners]
        |
        v
[UI rerender]
```

## Reward Pipeline Diagram
```text
raw event
  |
  v
resolveEventReward
  |
  v
resolveReward / applyRewardLocally
  |
  v
statsApi.transact(current -> next)
  |
  v
applyLevelUps (inside reward logic)
  |
  v
logRewardActivity (one row per non-zero stat)
  |
  v
activity log + stats listeners update UI
```
