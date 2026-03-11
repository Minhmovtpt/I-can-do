const actionListeners = new Set();

export const ACTION_TYPES = Object.freeze({
  TASK_COMPLETED: "TASK_COMPLETED",
  DAILY_TASK_COMPLETED: "DAILY_TASK_COMPLETED",
  HABIT_COMPLETED: "HABIT_COMPLETED",
  FOCUS_SESSION_COMPLETED: "FOCUS_SESSION_COMPLETED"
});

export function emitActionEvent(event) {
  actionListeners.forEach((listener) => listener(event));
}

export function subscribeActionEvents(listener) {
  actionListeners.add(listener);
  return () => actionListeners.delete(listener);
}
