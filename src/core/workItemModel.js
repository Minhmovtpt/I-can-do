import { requireEnum, requireNonEmptyText } from "./validation.js";

const ROUTINE_PRIORITY_VALUES = ["low", "medium", "high"];
const ROUTINE_TYPE_VALUES = ["daily", "habit"];

export const TASK_STATUS_VALUES = ["todo", "in_progress", "completed", "skipped", "failed"];
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

function normalizeDaysOfWeek(input) {
  const values = Array.isArray(input) ? input : [input];

  return [
    ...new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
    ),
  ].sort((a, b) => a - b);
}

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

export function normalizeSchedule(scheduleInput) {
  if (!scheduleInput) return null;

  if (typeof scheduleInput === "object" && scheduleInput.mode) {
    if (scheduleInput.mode === "daily") {
      return { mode: "daily", time: String(scheduleInput.time || "09:00") };
    }
    if (scheduleInput.mode === "weekly") {
      const daysOfWeek = normalizeDaysOfWeek(scheduleInput.daysOfWeek ?? scheduleInput.dayOfWeek);
      if (!daysOfWeek.length) {
        throw new Error("Weekly schedule must include at least one day.");
      }

      return {
        mode: "weekly",
        dayOfWeek: daysOfWeek[0],
        daysOfWeek,
        time: String(scheduleInput.time || "09:00"),
      };
    }
    if (scheduleInput.mode === "once") {
      const specificAt = Number(scheduleInput.specificAt || 0);
      if (!Number.isFinite(specificAt) || specificAt <= 0) {
        throw new Error("Schedule must be a valid date/time.");
      }
      return { mode: "once", specificAt };
    }
  }

  const specificAt = Date.parse(scheduleInput);
  if (!Number.isFinite(specificAt)) {
    throw new Error("Schedule must be a valid date/time.");
  }
  return { mode: "once", specificAt };
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

const TASK_STAT_ORDER = ["atk", "int", "disc", "cre", "end", "foc", "wis"];

function mergeStats(target, source) {
  Object.entries(source).forEach(([stat, value]) => {
    target[stat] = roundStat((target[stat] || 0) + value);
  });
  return target;
}

function compareStats([leftStat, leftValue], [rightStat, rightValue]) {
  if (rightValue !== leftValue) {
    return rightValue - leftValue;
  }

  return TASK_STAT_ORDER.indexOf(leftStat) - TASK_STAT_ORDER.indexOf(rightStat);
}

export function getTaskBaseStats(tags) {
  const normalizedTags = normalizeTaskTags(tags);
  const mergedStats = TASK_TAG_LAYERS.reduce((stats, layer) => {
    return mergeStats(stats, TASK_TAGS[layer][normalizedTags[layer]]);
  }, {});

  const rankedStats = Object.entries(mergedStats).sort(compareStats);
  const baseStats = Object.fromEntries(rankedStats.slice(0, 3));
  const omittedStats = rankedStats.slice(3).map(([stat]) => stat);

  return { baseStats, omittedStats };
}

export function calculateTaskReward(task) {
  const durationMinutes = normalizeDurationMinutes(task.durationMinutes);
  const priority = requireEnum(task.priority, TASK_PRIORITY_VALUES, "Priority");
  const tags = normalizeTaskTags(task.tags);
  const { baseStats, omittedStats } = getTaskBaseStats(tags);
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
    omittedStats,
  };
}

export function createTaskPayload({
  title,
  durationMinutes,
  priority = "important",
  tags,
  schedule = null,
}) {
  const task = {
    title: requireNonEmptyText(title, "Title", { maxLength: 120 }),
    durationMinutes: normalizeDurationMinutes(durationMinutes),
    priority: requireEnum(priority, TASK_PRIORITY_VALUES, "Priority"),
    tags: normalizeTaskTags(tags),
    schedule: normalizeSchedule(schedule),
    status: "todo",
    completed: false,
    reward: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    completedAt: null,
  };

  const preview = calculateTaskReward(task);
  return {
    ...task,
    baseStats: preview.baseStats,
    durationMultiplier: preview.durationMultiplier,
    priorityMultiplier: preview.priorityMultiplier,
    omittedStats: preview.omittedStats,
  };
}

export function createWorkItemPayload({
  title,
  type = "daily",
  priority = "medium",
  schedule = null,
  condition = "",
}) {
  const resolvedType = requireEnum(type, ROUTINE_TYPE_VALUES, "Type");

  return {
    title: requireNonEmptyText(title, "Title", { maxLength: 120 }),
    type: resolvedType,
    priority: requireEnum(priority, ROUTINE_PRIORITY_VALUES, "Priority"),
    schedule: normalizeSchedule(schedule),
    status: "todo",
    condition: String(condition || "").trim(),
    completed: false,
    reward: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function resolveTaskStatus(value) {
  return requireEnum(value, TASK_STATUS_VALUES, "Status");
}
