import { dailyTasksApi } from "../core/firebaseService.js";
import { recordDailyTaskCompletion } from "./progressService.js";
import { createWorkItemPayload } from "../core/workItemModel.js";

export async function createDailyTask({ title, time, condition = "" }) {
  return dailyTasksApi.add(
    createWorkItemPayload({
      title,
      type: "daily",
      priority: "medium",
      schedule: { mode: "daily", time },
      condition,
    }),
  );
}

export async function updateDailyTask(taskId, updates = {}) {
  const payload = { updatedAt: Date.now() };
  if (updates.title !== undefined) payload.title = String(updates.title || "").trim();
  if (updates.condition !== undefined) payload.condition = String(updates.condition || "").trim();
  if (updates.time !== undefined) {
    payload.schedule = { mode: "daily", time: String(updates.time || "09:00") };
  }
  return dailyTasksApi.patchById(taskId, payload);
}

export async function completeDailyTask(taskId) {
  const task = await dailyTasksApi.getById(taskId);
  if (!task) return;

  const today = new Date().toDateString();
  if (task.lastCompleted === today) {
    throw new Error("Already completed today");
  }

  await dailyTasksApi.patchById(taskId, {
    lastCompleted: today,
    status: "done",
    completedAt: Date.now(),
    updatedAt: Date.now(),
  });
  recordDailyTaskCompletion(task);
}

export async function resetDailyTasksForToday() {
  const tasks = (await dailyTasksApi.list()) || {};
  const today = new Date().toDateString();
  const work = Object.entries(tasks).map(([id, task]) => {
    if (!task || task.lastCompleted === today) return Promise.resolve();
    return dailyTasksApi.patchById(id, {
      status: "todo",
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
