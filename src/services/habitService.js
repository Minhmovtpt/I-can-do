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

export async function updateHabit(habitId, updates = {}) {
  const payload = { updatedAt: Date.now() };
  if (updates.title !== undefined) payload.title = String(updates.title || "").trim();
  if (updates.condition !== undefined) payload.condition = String(updates.condition || "").trim();
  if (updates.dayOfWeek !== undefined || updates.time !== undefined) {
    payload.schedule = {
      mode: "weekly",
      dayOfWeek: Number(updates.dayOfWeek ?? 1),
      time: String(updates.time || "09:00"),
    };
  }
  return habitsApi.patchById(habitId, payload);
}

export async function completeHabit(habitId, habit) {
  const nextState = nextHabitState(habit);
  await habitsApi.patchById(habitId, nextState);
  recordHabitCompletion(habit);
}

export async function resetHabitsForToday() {
  const habits = (await habitsApi.list()) || {};
  const today = new Date().toDateString();
  const work = Object.entries(habits).map(([id, habit]) => {
    if (!habit || habit.lastCompleted === today) return Promise.resolve();
    return habitsApi.patchById(id, {
      status: "todo",
      completedAt: null,
      updatedAt: Date.now(),
    });
  });
  await Promise.all(work);
}

export async function deleteHabit(habitId) {
  return habitsApi.deleteById(habitId);
}

export function subscribeHabits(callback) {
  return habitsApi.subscribe(callback);
}
