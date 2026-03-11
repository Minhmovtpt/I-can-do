# I-can-do Dashboard

## Project overview
I-can-do is a frontend-only life dashboard that stores and syncs data in Firebase Realtime Database. The app organizes personal activities (tasks, habits, focus sessions, notes, and finance transactions), emits domain events when progress actions are completed, and converts those events into stat/EXP rewards. The UI is composed from modular feature initializers and updates in realtime through Firebase subscriptions.

## Key features
- **Realtime stat tracking** with RPG-like attributes (`atk`, `int`, `disc`, `cre`, `end`, `foc`, `wis`), EXP, and level progression.
- **Task systems**:
  - One-off tasks with title/description, edit/delete, and completion reward.
  - Daily tasks with once-per-day completion guard.
- **Habit streak tracking** with daily completion and streak continuity logic.
- **Focus sessions** with persisted active-session state, countdown timer, completion/cancel transitions, and reward emission on successful completion.
- **Notes module** for quick text notes with edit/delete.
- **Finance module** for income/expense transactions with computed and synchronized balance.
- **Activity log** that records reward deltas (e.g., `+10 EXP`) and displays the most recent entries.
- **Event-driven reward engine** that listens for domain action events and applies rewards atomically to stats.

## Technology stack
- **Runtime/UI:** Vanilla JavaScript (ES modules), HTML, CSS.
- **Backend service:** Firebase Realtime Database (browser SDK imported from Google CDN).
- **Testing:** Node.js built-in test runner (`node:test`) + `assert/strict`.
- **Code quality tools:** ESLint + Prettier.

## Project structure
```text
.
├── index.html                  # UI layout and module entry script tag
├── style.css                   # Dashboard styling
├── src
│   ├── ui
│   │   └── ui.js               # Composition root: wires all modules
│   ├── modules                 # Feature UI modules (render + user interactions)
│   │   ├── stats.js
│   │   ├── tasks.js
│   │   ├── habits.js
│   │   ├── focus.js
│   │   ├── notes.js
│   │   └── finance.js
│   ├── services                # Validated mutation/use-case layer
│   │   ├── taskService.js
│   │   ├── dailyTaskService.js
│   │   ├── habitService.js
│   │   ├── focusService.js
│   │   ├── noteService.js
│   │   ├── financeService.js
│   │   └── progressService.js  # Emits domain action events
│   └── core                    # Infrastructure and domain logic
│       ├── firebaseService.js  # Firebase init + path APIs + subscriptions
│       ├── firebase.js         # Facade exports
│       ├── schema.js           # Realtime DB path constants
│       ├── domainEvents.js     # In-memory event bus
│       ├── rewardEngine.js     # Event->reward application pipeline
│       ├── rewardLogic.js      # Pure reward/level math
│       ├── financeLogic.js     # Pure balance math
│       ├── activityLogger.js   # Reward activity writer
│       └── validation.js       # Shared validation helpers
├── tests
│   ├── reward.test.js          # rewardLogic unit tests
│   └── finance.test.js         # financeLogic unit tests
└── config                      # Tooling configs
```

## Setup instructions
### Prerequisites
- Node.js 18+ (for tests/lint/format commands).
- Internet access for Firebase CDN imports at runtime.

### Install dependencies
```bash
npm install
```

### Run the app locally
This project does not include a dev server script. Serve the repository root with any static server so `index.html` can load ES modules.

Examples:
```bash
npx serve .
# or
python -m http.server 3000
```
Then open `http://localhost:<port>/`.

> Firebase config is hardcoded in `src/core/firebaseService.js`. For production hardening, move config to environment-specific injection.

## Development workflow
1. **Edit a feature module** in `src/modules` for UI behavior and rendering.
2. **Use services** in `src/services` for mutations (validation + payload shaping).
3. **Keep pure business rules** in `src/core/*Logic.js` for testability.
4. **Emit progress events** through `progressService` when user actions complete.
5. **Let reward engine react** to events (`initRewardEngine` subscription) rather than applying stats directly in feature code.
6. Run checks before committing:
   ```bash
   npm test
   npm run lint
   npm run format
   ```

## Testing
Current automated tests cover pure domain logic:
- `tests/reward.test.js` validates reward normalization and level-up behavior.
- `tests/finance.test.js` validates balance computation from income/expense transactions.

Run:
```bash
npm test
```

## Future roadmap
- Add CRUD services for currently read-only seeded modules (daily tasks/habits definitions).
- Unify module write paths to always go through services (some modules currently subscribe directly via core APIs).
- Add integration tests around service + event + reward pipeline behavior.
- Introduce environment-based Firebase config handling.
- Add listener teardown lifecycle from UI root for explicit app cleanup.
- Add typed contracts (TypeScript or JSDoc typedefs) for events, rewards, and persisted entities.
