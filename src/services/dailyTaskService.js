import { dailyTasksApi } from "../core/firebaseService.js";
import { recordDailyTaskCompletion } from "./progressService.js";
import { createWorkItemPayload } from "../core/workItemModel.js";
import { isScheduledOnDate } from "../core/habitLogic.js";

function buildRoutineSchedule({ daysOfWeek = [], time }) {
  const normalizedDays = [
    ...new Set(
      (daysOfWeek || [])
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  ].sort((a, b) => a - b);

  if (!normalizedDays.length) {
    return { mode: "daily", time };
  }

  return { mode: "weekly", daysOfWeek: normalizedDays, dayOfWeek: normalizedDays[0], time };
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
  const payload = { updatedAt: Date.now() };
  if (updates.title !== undefined) payload.title = String(updates.title || "").trim();
  if (updates.condition !== undefined) payload.condition = String(updates.condition || "").trim();
  if (updates.time !== undefined || updates.daysOfWeek !== undefined) {
    payload.schedule = buildRoutineSchedule({
      daysOfWeek: updates.daysOfWeek,
      time: String(updates.time || "09:00"),
    });
  }
  return dailyTasksApi.patchById(taskId, payload);
}

export async function completeDailyTask(taskId) {
  const task = await dailyTasksApi.getById(taskId);
  if (!task) return;

  const today = new Date().toDateString();
  if (!isScheduledOnDate(task, Date.now())) {
    throw new Error("Task is not scheduled for today");
  }
  if (task.lastCompleted === today) {
    throw new Error("Already completed today");
  }

  await dailyTasksApi.patchById(taskId, {
    lastCompleted: today,
    status: "done",
    completed: true,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });
  recordDailyTaskCompletion(task);
}

export async function resetDailyTasksForToday(now = Date.now()) {
  const tasks = (await dailyTasksApi.list()) || {};
  const today = new Date(now).toDateString();
  const work = Object.entries(tasks).map(([id, task]) => {
    if (!task || !isScheduledOnDate(task, now) || task.lastCompleted === today)
      return Promise.resolve();
    return dailyTasksApi.patchById(id, {
      status: "todo",
      completed: false,
      completedAt: null,
      updatedAt: Date.now(),
    });
  });
  await Promise.all(work);
}

export async function deleteDailyTask(taskId) {
  return dailyTasksApi.deleteById(taskId);
}

export function subscribeDailyTasks(callback) {
  return dailyTasksApi.subscribe(callback);
}
