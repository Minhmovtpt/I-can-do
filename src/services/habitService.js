import { habitsApi } from "../core/firebaseService.js";
import { recordHabitCompletion } from "./progressService.js";
import { createWorkItemPayload } from "../core/workItemModel.js";

function nextHabitState(habit) {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
  const last = habit.lastCompleted;

  if (last === today) {
    throw new Error("Habit already completed today");
  }

  const streak = last === yesterday ? (habit.streak || 0) + 1 : 1;
  return { lastCompleted: today, streak, status: "done", updatedAt: Date.now() };
}

export async function createHabit({ title, dayOfWeek, time, condition = "" }) {
  return habitsApi.add(
    createWorkItemPayload({
      title,
      type: "habit",
      priority: "medium",
      schedule: { mode: "weekly", dayOfWeek, time },
      condition,
    }),
  );
}

export async function completeHabit(habitId, habit) {
  const nextState = nextHabitState(habit);
  await habitsApi.patchById(habitId, nextState);
  recordHabitCompletion(habit);
}

export async function deleteHabit(habitId) {
  return habitsApi.deleteById(habitId);
}

export function subscribeHabits(callback) {
  return habitsApi.subscribe(callback);
}
