import { tasksApi } from "../core/firebaseService.js";
import { requireNonEmptyText } from "../core/validation.js";
import { recordTaskCompletion } from "./progressService.js";
import {
  createWorkItemPayload,
  normalizeSchedule,
  resolveWorkItemStatus,
} from "../core/workItemModel.js";

export async function createTask(input) {
  return tasksApi.add(createWorkItemPayload(input));
}

export async function updateTask(taskId, updates = {}) {
  const payload = {
    updatedAt: Date.now(),
  };

  if (updates.title !== undefined) {
    payload.title = requireNonEmptyText(updates.title, "Task title", { maxLength: 120 });
  }
  if (updates.description !== undefined) {
    payload.description = String(updates.description || "").trim();
  }
  if (updates.condition !== undefined) {
    payload.condition = String(updates.condition || "").trim();
  }
  if (updates.type !== undefined) {
    payload.type = updates.type;
  }
  if (updates.priority !== undefined) {
    payload.priority = updates.priority;
  }
  if (updates.schedule !== undefined) {
    payload.schedule = normalizeSchedule(updates.schedule);
  }
  if (updates.status !== undefined) {
    payload.status = resolveWorkItemStatus(updates.status);
    payload.completed = payload.status === "done";
  }

  return tasksApi.updateById(taskId, payload);
}

export async function completeTask(taskId, task = null) {
  await tasksApi.updateById(taskId, {
    completed: true,
    completedAt: Date.now(),
    status: "done",
    updatedAt: Date.now(),
  });
  recordTaskCompletion(task || {});
}

export async function deleteTask(taskId) {
  return tasksApi.deleteById(taskId);
}

export function subscribeTasks(callback) {
  return tasksApi.subscribe(callback);
}
