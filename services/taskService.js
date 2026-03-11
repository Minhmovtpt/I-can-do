import { tasksApi } from "../firebaseService.js";
import { requireNonEmptyText } from "../validation.js";

function formatTaskPayload({ title, description = "" }) {
  return {
    title: requireNonEmptyText(title, "Task title", { maxLength: 120 }),
    description: String(description || "").trim(),
    completed: false,
    reward: { exp: 20 },
    createdAt: Date.now()
  };
}

export async function createTask(input) {
  return tasksApi.add(formatTaskPayload(input));
}

export async function updateTask(taskId, updates = {}) {
  const payload = {
    updatedAt: Date.now()
  };

  if (updates.title !== undefined) {
    payload.title = requireNonEmptyText(updates.title, "Task title", { maxLength: 120 });
  }
  if (updates.description !== undefined) {
    payload.description = String(updates.description || "").trim();
  }

  return tasksApi.updateById(taskId, payload);
}

export async function completeTask(taskId) {
  return tasksApi.updateById(taskId, { completed: true, completedAt: Date.now() });
}

export async function deleteTask(taskId) {
  return tasksApi.deleteById(taskId);
}
