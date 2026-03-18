import { habitsApi } from "../core/firebaseService.js";
import { recordHabitCompletion } from "./progressService.js";
import { createWorkItemPayload } from "../core/workItemModel.js";
import { getNextHabitState, isWeeklyHabitDueOnDate, toDayString } from "../core/habitLogic.js";

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
  const nextState = getNextHabitState(habit, Date.now());
  await habitsApi.patchById(habitId, nextState);
  recordHabitCompletion(habit);
}

export async function resetHabitsForToday(now = Date.now()) {
  const habits = (await habitsApi.list()) || {};
  const today = toDayString(now);
  const work = Object.entries(habits).map(([id, habit]) => {
    if (!habit || !isWeeklyHabitDueOnDate(habit, now) || habit.lastCompleted === today) {
      return Promise.resolve();
    }

    return habitsApi.patchById(id, {
      status: "todo",
      completed: false,
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
