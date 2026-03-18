import { tasksApi } from "../core/firebaseService.js";
import { requireNonEmptyText } from "../core/validation.js";
import { recordTaskCompletion } from "./progressService.js";
import {
  calculateTaskReward,
  createTaskPayload,
  normalizeSchedule,
  resolveTaskStatus,
  TASK_PRIORITY_VALUES,
  TASK_TAG_LAYERS,
} from "../core/workItemModel.js";

function normalizeTaskUpdatePayload(updates = {}, currentTask = {}) {
  const payload = {
    updatedAt: Date.now(),
  };

  if (updates.title !== undefined) {
    payload.title = requireNonEmptyText(updates.title, "Task title", { maxLength: 120 });
  }
  if (updates.durationMinutes !== undefined) {
    payload.durationMinutes = Number(updates.durationMinutes);
  }
  if (updates.priority !== undefined) {
    if (!TASK_PRIORITY_VALUES.includes(updates.priority)) {
      throw new Error(`Priority must be one of: ${TASK_PRIORITY_VALUES.join(", ")}.`);
    }
    payload.priority = updates.priority;
  }
  if (updates.schedule !== undefined) {
    payload.schedule = normalizeSchedule(updates.schedule);
  }
  if (updates.tags !== undefined) {
    payload.tags = { ...(currentTask.tags || {}), ...updates.tags };
  }
  if (updates.status !== undefined) {
    payload.status = resolveTaskStatus(updates.status);
    payload.completed = payload.status === "completed";
    payload.completedAt = payload.completed ? Date.now() : null;
    if (!payload.completed) {
      payload.reward = null;
    }
  }

  const nextTask = { ...currentTask, ...payload };
  const shouldRecalculate =
    payload.durationMinutes !== undefined ||
    payload.priority !== undefined ||
    payload.tags !== undefined;

  if (shouldRecalculate) {
    const preview = calculateTaskReward(nextTask);
    payload.durationMinutes = preview.durationMinutes;
    payload.tags = preview.tags;
    payload.baseStats = preview.baseStats;
    payload.durationMultiplier = preview.durationMultiplier;
    payload.priorityMultiplier = preview.priorityMultiplier;
    payload.omittedStats = preview.omittedStats;
    if (nextTask.status === "completed") {
      payload.reward = preview.reward;
    }
  }

  return payload;
}

export async function createTask(input) {
  return tasksApi.add(createTaskPayload(input));
}

export async function updateTask(taskId, updates = {}) {
  const currentTask = (await tasksApi.getById(taskId)) || {};
  const payload = normalizeTaskUpdatePayload(updates, currentTask);
  return tasksApi.updateById(taskId, payload);
}

export async function completeTask(taskId, task = null) {
  const currentTask = task || (await tasksApi.getById(taskId));
  if (!currentTask) return;

  const completion = calculateTaskReward(currentTask);
  const completedTask = {
    ...currentTask,
    ...completion,
    status: "completed",
    completed: true,
    completedAt: Date.now(),
    updatedAt: Date.now(),
  };

  await tasksApi.updateById(taskId, {
    status: completedTask.status,
    completed: completedTask.completed,
    completedAt: completedTask.completedAt,
    updatedAt: completedTask.updatedAt,
    reward: completedTask.reward,
    baseStats: completedTask.baseStats,
    durationMinutes: completedTask.durationMinutes,
    durationMultiplier: completedTask.durationMultiplier,
    priorityMultiplier: completedTask.priorityMultiplier,
    tags: completedTask.tags,
    omittedStats: completedTask.omittedStats,
  });
  recordTaskCompletion(completedTask);
}

export async function deleteTask(taskId) {
  return tasksApi.deleteById(taskId);
}

export function subscribeTasks(callback) {
  return tasksApi.subscribe(callback);
}

export function buildTaskTagsFromInputs(values = {}) {
  return TASK_TAG_LAYERS.reduce((tags, layer) => {
    tags[layer] = values[layer];
    return tags;
  }, {});
}
