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

export async function deleteDailyTask(taskId) {
  return dailyTasksApi.deleteById(taskId);
}

export function subscribeDailyTasks(callback) {
  return dailyTasksApi.subscribe(callback);
}
