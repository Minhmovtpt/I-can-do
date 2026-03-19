import { tasksApi } from "../core/firebaseService.js";
import { requireNonEmptyText } from "../core/validation.js";
import { recordTaskCompletion } from "./progressService.js";
import {
  buildCompletionPatch,
  getBaseStatus,
  normalizeSchedule,
  resolveStoredStatus,
} from "../core/scheduling.js";
import {
  calculateTaskReward,
  createTaskPayload,
  TASK_PRIORITY_VALUES,
  TASK_TAG_LAYERS,
} from "../core/workItemModel.js";

function buildOccurrenceTrackingUpdate(completionPatch = {}) {
  if (completionPatch.lastCompletedOn !== undefined) {
    return {
      lastCompletedOn: completionPatch.lastCompletedOn,
      lastCompletedAt: completionPatch.lastCompletedAt,
      lastCompleted: completionPatch.lastCompleted,
    };
  }

  return {
    lastCompletedOn: null,
    lastCompletedAt: null,
    lastCompleted: null,
  };
}

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
    payload.schedule =
      normalizeSchedule(updates.schedule, { defaultTime: currentTask.schedule?.time ?? "09:00" }) ??
      null;
  }
  if (updates.tags !== undefined) {
    payload.tags = { ...(currentTask.tags || {}), ...updates.tags };
  }
  if (updates.status !== undefined) {
    const nextStatus = resolveStoredStatus(updates.status);
    const effectiveTask = {
      ...currentTask,
      ...payload,
      status: nextStatus,
    };

    if (nextStatus === "completed") {
      const completionPatch = buildCompletionPatch(effectiveTask, Date.now());
      Object.assign(payload, completionPatch, buildOccurrenceTrackingUpdate(completionPatch));
    } else {
      payload.status = nextStatus;
      payload.completed = false;
      payload.completedAt = null;
      payload.reward = null;
    }
  }

  const nextTask = { ...currentTask, ...payload };
  const shouldRecalculate =
    payload.durationMinutes !== undefined ||
    payload.priority !== undefined ||
    payload.tags !== undefined ||
    getBaseStatus(nextTask) === "completed";

  if (shouldRecalculate) {
    const preview = calculateTaskReward(nextTask);
    payload.durationMinutes = preview.durationMinutes;
    payload.tags = preview.tags;
    payload.baseStats = preview.baseStats;
    payload.durationMultiplier = preview.durationMultiplier;
    payload.priorityMultiplier = preview.priorityMultiplier;
    payload.reward = getBaseStatus(nextTask) === "completed" ? preview.reward : null;
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
  const completionPatch = buildCompletionPatch(currentTask, Date.now());
  const occurrenceTrackingUpdate = buildOccurrenceTrackingUpdate(completionPatch);
  const completedTask = {
    ...currentTask,
    ...completion,
    ...completionPatch,
    ...occurrenceTrackingUpdate,
  };

  await tasksApi.updateById(taskId, {
    status: completedTask.status,
    completed: completedTask.completed,
    completedAt: completedTask.completedAt,
    updatedAt: completedTask.updatedAt,
    ...occurrenceTrackingUpdate,
    reward: completedTask.reward,
    baseStats: completedTask.baseStats,
    durationMinutes: completedTask.durationMinutes,
    durationMultiplier: completedTask.durationMultiplier,
    priorityMultiplier: completedTask.priorityMultiplier,
    tags: completedTask.tags,
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
