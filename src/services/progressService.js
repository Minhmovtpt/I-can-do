import { ACTION_TYPES, emitActionEvent } from "../core/domainEvents.js";

export function recordTaskCompletion(task) {
  emitActionEvent({ type: ACTION_TYPES.TASK_COMPLETED, payload: { task } });
}

export function recordDailyTaskCompletion(task) {
  emitActionEvent({ type: ACTION_TYPES.DAILY_TASK_COMPLETED, payload: { task } });
}

export function recordHabitCompletion(habit) {
  emitActionEvent({ type: ACTION_TYPES.HABIT_COMPLETED, payload: { habit } });
}

export function recordFocusSessionCompletion(session) {
  emitActionEvent({ type: ACTION_TYPES.FOCUS_SESSION_COMPLETED, payload: { session } });
}
