Architecture Analysis
This repository is a frontend-only, modular dashboard app built around a Realtime Firebase backend. It follows a layered structure:

UI composition/root

Feature modules

Service layer (validated mutations)

Core infrastructure/domain logic

Minimal unit tests for pure logic

At runtime, index.html loads one JS entrypoint (src/ui/ui.js), which wires all feature modules and shared DOM references. The feature modules then subscribe to Firebase data and render/react to updates. Writes are mostly routed through services that enforce validation before persisting. rewardEngine/rewardLogic and financeLogic are the core domain engines.

High-Level Structure
Entry/UI shell:

index.html defines all dashboard sections (stats, tasks, habits, focus, notes, finance, activity log) and imports src/ui/ui.js.

Composition root:

src/ui/ui.js collects DOM elements and initializes every feature module (stats, tasks, habits, notes, finance, focus) plus activity log subscription.

Feature modules (src/modules):

Handle rendering + event handlers + subscriptions for each domain area (tasks, notes, habits, focus, finance, stats).

Service layer (src/services):

Encapsulates writes and validation for tasks/notes/finance before calling Firebase APIs.

Core (src/core):

Firebase setup and APIs (firebaseService.js), facade export (firebase.js), reward math/leveling (rewardLogic.js, rewardEngine.js), finance math, and generic validation utilities.

Tests:

Node test runner verifies pure business logic (reward and finance calculations).

Runtime Flow (Request/Update Lifecycle)
Read path (reactive)
Modules subscribe to Firebase via APIs in firebaseService.js (through core/firebase.js facade).

subscribe() uses onValue and tracks active handlers in a map, allowing listener replacement and cleanup per path.

Write path (validated)
UI actions call service methods (e.g., create task/transaction/note).

Services validate input (requireNonEmptyText, requireAmount, requireEnum) and format payloads/timestamps.

Services call specific Firebase API methods (add/update/delete).

Reward path
Features like tasks/habits/focus call applyReward.

rewardEngine computes normalized reward locally, applies atomic stats transaction in Firebase, then writes activity log entries for each non-zero reward field.

Layer Responsibilities
UI modules: DOM operations, prompt/alert UX, attach handlers, render lists.

Services: contract enforcement and payload shaping.

Core Firebase: persistence API abstraction and path ownership.

Domain logic: deterministic, testable pure functions (rewardLogic, financeLogic).

This is a clean separation for a small app: impure side effects (DOM/Firebase IO) live in modules/services, while calculations are isolated and unit-tested.

Notable Architectural Characteristics
Single Firebase initialization point in firebaseService.js and a thin re-export facade in firebase.js, reducing direct dependency spread.

Feature-isolated modules with similar internal patterns (buildActions, subscribe+render).

Realtime-first design: UI mirrors backend state continuously through listeners.

State restoration for long-running focus session via persisted focus/sessionState.

Potential coupling issue: UI modules sometimes directly use core Firebase APIs and sometimes services; consistency could be improved by routing all writes through services for stricter boundaries.
