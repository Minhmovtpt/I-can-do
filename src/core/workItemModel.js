import { requireNonEmptyText, requireEnum } from "./validation.js";
import { normalizeSchedule, resolveStoredStatus, STORED_WORK_STATUS_VALUES } from "./scheduling.js";

const ROUTINE_PRIORITY_VALUES = ["low", "medium", "high"];
const ROUTINE_TYPE_VALUES = ["daily", "habit"];

export const TASK_STATUS_VALUES = STORED_WORK_STATUS_VALUES;
export const TASK_PRIORITY_VALUES = ["critical", "important", "optional"];
export const TASK_TAG_LAYERS = ["domain", "nature", "intent"];

export const TASK_PRIORITY_MULTIPLIERS = {
  critical: 2,
  important: 1.5,
  optional: 1,
};

export const TASK_TAGS = {
  domain: {
    work: { atk: 2 },
    study: { int: 2, foc: 1 },
    drawing: { cre: 2, foc: 1 },
    health: { end: 2, disc: 1 },
    life: { disc: 2, wis: 1 },
    social: { wis: 2, cre: 1 },
  },
  nature: {
    deep_work: { foc: 2, atk: 1 },
    practice: { disc: 2, end: 1 },
    learning: { int: 2, wis: 1 },
    creative: { cre: 2, foc: 1 },
    maintenance: { disc: 2, end: 1 },
    admin: { disc: 1, wis: 1 },
  },
  intent: {
    build: { atk: 2, foc: 1 },
    improve: { int: 1, disc: 1 },
    maintain: { disc: 2, end: 1 },
    explore: { cre: 1, wis: 2 },
    recover: { end: 2, wis: 1 },
  },
};

function roundStat(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function normalizeDurationMinutes(value) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    throw new Error("Duration must be a positive number of minutes.");
  }
  return Math.round(minutes);
}

function normalizeTaskTags(tags = {}) {
  const normalized = {};

  TASK_TAG_LAYERS.forEach((layer) => {
    const rawValue = tags[layer];
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      throw new Error(`Task ${layer} tag is required.`);
    }

    normalized[layer] = requireEnum(rawValue, Object.keys(TASK_TAGS[layer]), `${layer} tag`);
  });

  return normalized;
}

export function getDurationMultiplier(durationMinutes) {
  if (durationMinutes < 30) return 0.5;
  if (durationMinutes <= 90) return 1;
  return 1.5;
}

function mergeStats(target, source) {
  Object.entries(source).forEach(([stat, value]) => {
    target[stat] = roundStat((target[stat] || 0) + value);
  });
  return target;
}

export function getTaskBaseStats(tags) {
  const normalizedTags = normalizeTaskTags(tags);
  const baseStats = TASK_TAG_LAYERS.reduce((stats, layer) => {
    return mergeStats(stats, TASK_TAGS[layer][normalizedTags[layer]]);
  }, {});

  const affectedStats = Object.keys(baseStats);
  if (affectedStats.length > 3) {
    throw new Error("Task tags must affect at most 3 unique stats.");
  }

  return baseStats;
}

export function calculateTaskReward(task) {
  const durationMinutes = normalizeDurationMinutes(task.durationMinutes);
  const priority = requireEnum(task.priority, TASK_PRIORITY_VALUES, "Priority");
  const tags = normalizeTaskTags(task.tags);
  const baseStats = getTaskBaseStats(tags);
  const durationMultiplier = getDurationMultiplier(durationMinutes);
  const priorityMultiplier = TASK_PRIORITY_MULTIPLIERS[priority];
  const reward = Object.entries(baseStats).reduce((acc, [stat, value]) => {
    acc[stat] = roundStat(value * priorityMultiplier * durationMultiplier);
    return acc;
  }, {});

  reward.exp = roundStat(
    Object.entries(reward)
      .filter(([stat]) => stat !== "exp")
      .reduce((total, [, value]) => total + value, 0),
  );

  return {
    tags,
    baseStats,
    reward,
    durationMinutes,
    durationMultiplier,
    priorityMultiplier,
  };
}

export function createTaskPayload({
  title,
  durationMinutes,
  priority = "important",
  tags,
  schedule = null,
}) {
  const now = Date.now();
  const task = {
    title: requireNonEmptyText(title, "Title", { maxLength: 120 }),
    durationMinutes: normalizeDurationMinutes(durationMinutes),
    priority: requireEnum(priority, TASK_PRIORITY_VALUES, "Priority"),
    tags: normalizeTaskTags(tags),
    schedule: normalizeSchedule(schedule, { defaultTime: "09:00" }) ?? null,
    status: "todo",
    completed: false,
    reward: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };

  const preview = calculateTaskReward(task);
  return {
    ...task,
    baseStats: preview.baseStats,
    durationMultiplier: preview.durationMultiplier,
    priorityMultiplier: preview.priorityMultiplier,
  };
}

export function createWorkItemPayload({
  title,
  type = "daily",
  priority = "medium",
  schedule = null,
  condition = "",
}) {
  const now = Date.now();
  const normalizedSchedule = normalizeSchedule(schedule, { defaultTime: "09:00" }) ?? null;

  return {
    title: requireNonEmptyText(title, "Title", { maxLength: 120 }),
    type: requireEnum(type, ROUTINE_TYPE_VALUES, "Type"),
    priority: requireEnum(priority, ROUTINE_PRIORITY_VALUES, "Priority"),
    schedule: normalizedSchedule,
    status: "todo",
    condition: String(condition || "").trim(),
    completed: false,
    reward: {},
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    lastCompletedOn: null,
    lastCompletedAt: null,
  };
}

export function resolveTaskStatus(value) {
  return resolveStoredStatus(value);
}
