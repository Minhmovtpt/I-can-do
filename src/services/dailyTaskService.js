import { dailyTasksApi } from "../core/firebaseService.js";
import { recordDailyTaskCompletion } from "./progressService.js";
import {
  buildCompletionPatch,
  buildRoutineResetPatch,
  getScheduledDays,
  normalizeSchedule,
  requireTimeString,
} from "../core/scheduling.js";
import { createWorkItemPayload } from "../core/workItemModel.js";

function buildRoutineSchedule({ daysOfWeek, time }, currentSchedule = null) {
  const resolvedTime = requireTimeString(time ?? currentSchedule?.time ?? "09:00", "Schedule time");
  const resolvedDays =
    daysOfWeek !== undefined ? [...daysOfWeek] : getScheduledDays(currentSchedule ?? {});

  return normalizeSchedule(
    resolvedDays.length
      ? { mode: "weekly", daysOfWeek: resolvedDays, time: resolvedTime }
      : { mode: "daily", time: resolvedTime },
  );
}

export async function createDailyTask({ title, time, condition = "", daysOfWeek = [] }) {
  return dailyTasksApi.add(
    createWorkItemPayload({
      title,
      type: "daily",
      priority: "medium",
      schedule: buildRoutineSchedule({ daysOfWeek, time }),
      condition,
    }),
  );
}

export async function updateDailyTask(taskId, updates = {}) {
  const currentTask = (await dailyTasksApi.getById(taskId)) || {};
  const payload = { updatedAt: Date.now() };
  if (updates.title !== undefined) payload.title = String(updates.title || "").trim();
  if (updates.condition !== undefined) payload.condition = String(updates.condition || "").trim();
  if (updates.time !== undefined || updates.daysOfWeek !== undefined) {
    payload.schedule = buildRoutineSchedule(
      {
        daysOfWeek: updates.daysOfWeek,
        time: updates.time,
      },
      currentTask.schedule,
    );
  }
  return dailyTasksApi.patchById(taskId, payload);
}

export async function completeDailyTask(taskId) {
  const task = await dailyTasksApi.getById(taskId);
  if (!task) return;

  const patch = buildCompletionPatch(task, Date.now());
  await dailyTasksApi.patchById(taskId, patch);
  recordDailyTaskCompletion({ ...task, ...patch });
}

export async function resetDailyTasksForToday(now = Date.now()) {
  const tasks = (await dailyTasksApi.list()) || {};
  const work = Object.entries(tasks).map(([id, task]) => {
    if (!task) return Promise.resolve();
    return dailyTasksApi.patchById(id, buildRoutineResetPatch(task, now));
  });
  await Promise.all(work);
}

export async function deleteDailyTask(taskId) {
  return dailyTasksApi.deleteById(taskId);
}

export function subscribeDailyTasks(callback) {
  return dailyTasksApi.subscribe(callback);
}
