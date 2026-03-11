import { dailyTasksApi } from "../core/firebaseService.js";
import { recordDailyTaskCompletion } from "./progressService.js";

export async function completeDailyTask(taskId) {
  const task = await dailyTasksApi.getById(taskId);
  if (!task) return;

  const today = new Date().toDateString();
  if (task.lastCompleted === today) {
    throw new Error("Already completed today");
  }

  await dailyTasksApi.patchById(taskId, { lastCompleted: today });
  recordDailyTaskCompletion(task);
}

export function subscribeDailyTasks(callback) {
  return dailyTasksApi.subscribe(callback);
}
