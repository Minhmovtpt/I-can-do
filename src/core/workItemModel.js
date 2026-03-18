import { requireEnum, requireNonEmptyText } from "./validation.js";

const STATUS_VALUES = ["backlog", "todo", "in_progress", "done", "cancelled"];
const PRIORITY_VALUES = ["low", "medium", "high"];
const TYPE_VALUES = ["task", "daily", "habit", "work", "personal", "study"];

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

export function createWorkItemPayload({
  title,
  type = "task",
  priority = "medium",
  schedule = null,
  description = "",
  condition = "",
}) {
  const resolvedType = requireEnum(type, TYPE_VALUES, "Type");

  return {
    title: requireNonEmptyText(title, "Title", { maxLength: 120 }),
    type: resolvedType,
    priority: requireEnum(priority, PRIORITY_VALUES, "Priority"),
    schedule: normalizeSchedule(schedule),
    status: ["daily", "habit"].includes(resolvedType) ? "todo" : "backlog",
    description: String(description || "").trim(),
    condition: String(condition || "").trim(),
    completed: false,
    reward: { exp: 20 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function resolveWorkItemStatus(value) {
  return requireEnum(value, STATUS_VALUES, "Status");
}
