import { habitsApi } from "../core/firebaseService.js";
import { recordHabitCompletion } from "./progressService.js";
import {
  buildRoutineResetPatch,
  normalizeSchedule,
  requireTimeString,
} from "../core/scheduling.js";
import { createWorkItemPayload } from "../core/workItemModel.js";
import { getNextHabitState } from "../core/habitLogic.js";

function buildHabitSchedule({ dayOfWeek, time }, currentSchedule = null) {
  const resolvedTime = requireTimeString(time ?? currentSchedule?.time ?? "09:00", "Schedule time");
  const resolvedDay = dayOfWeek ?? currentSchedule?.dayOfWeek ?? currentSchedule?.daysOfWeek?.[0];
  return normalizeSchedule({ mode: "weekly", dayOfWeek: Number(resolvedDay), time: resolvedTime });
}

export async function createHabit({ title, dayOfWeek, time, condition = "" }) {
  return habitsApi.add(
    createWorkItemPayload({
      title,
      type: "habit",
      priority: "medium",
      schedule: buildHabitSchedule({ dayOfWeek, time }),
      condition,
    }),
  );
}

export async function updateHabit(habitId, updates = {}) {
  const currentHabit = (await habitsApi.getById(habitId)) || {};
  const payload = { updatedAt: Date.now() };
  if (updates.title !== undefined) payload.title = String(updates.title || "").trim();
  if (updates.condition !== undefined) payload.condition = String(updates.condition || "").trim();
  if (updates.dayOfWeek !== undefined || updates.time !== undefined) {
    payload.schedule = buildHabitSchedule(
      {
        dayOfWeek: updates.dayOfWeek,
        time: updates.time,
      },
      currentHabit.schedule,
    );
  }
  return habitsApi.patchById(habitId, payload);
}

export async function completeHabit(habitId, habit = null) {
  const currentHabit = habit || (await habitsApi.getById(habitId));
  if (!currentHabit) return;

  const nextState = getNextHabitState(currentHabit, Date.now());
  await habitsApi.patchById(habitId, nextState);
  recordHabitCompletion({ ...currentHabit, ...nextState });
}

export async function resetHabitsForToday(now = Date.now()) {
  const habits = (await habitsApi.list()) || {};
  const work = Object.entries(habits).map(([id, habit]) => {
    if (!habit) {
      return Promise.resolve();
    }

    return habitsApi.patchById(id, buildRoutineResetPatch(habit, now));
  });
  await Promise.all(work);
}

export async function deleteHabit(habitId) {
  return habitsApi.deleteById(habitId);
}

export function subscribeHabits(callback) {
  return habitsApi.subscribe(callback);
}
