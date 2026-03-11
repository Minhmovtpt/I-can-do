# Architecture Overview

## Directory layout

- `public/`
  - `index.html`: static entry page for browser and GitHub Pages deployment.
  - `style.css`: dashboard styles.
- `src/`
  - `ui/ui.js`: composition root that wires DOM elements to feature initializers.
  - `modules/`: UI feature modules (`stats`, `tasks`, `notes`, `finance`, `focus`, `habits`).
  - `services/`: validation-backed data mutation services.
  - `core/`: shared infrastructure and domain logic (`firebase`, `firebaseService`, rewards, validation, finance math).
- `tests/`
  - `reward.test.js`
  - `finance.test.js`
- `config/`
  - `vite.config.js`
  - `eslint.config.js`
  - `Backend-read.json`

## Runtime flow

1. `public/index.html` loads `../src/ui/ui.js` as the module entry point.
2. `src/ui/ui.js` initializes all feature modules on page load.
3. Feature modules subscribe to Firebase realtime listeners through `src/core/firebase.js`.
4. Services in `src/services/` perform validated writes and updates.
5. Shared domain logic in `src/core/` computes rewards, level-ups, and finance balance.

## Firebase ownership model

- Firebase is initialized in exactly one place: `src/core/firebaseService.js`.
- `src/core/firebase.js` is a thin re-export facade used by UI modules.
- All listeners (`stats`, `dailyTasks`, `tasks`, `habits`, `notes`, `finance/transactions`, `focus/sessions`, `activityLog`) are registered by module initializers called from `ui.js`.
