import { requireEnum, requireNonEmptyText } from "./validation.js";

const STATUS_VALUES = ["new", "progress", "done", "canceled"];
const PRIORITY_VALUES = ["low", "medium", "high"];
const TYPE_VALUES = ["task", "daily", "habit", "work", "personal", "study"];

export function normalizeSchedule(scheduleInput) {
  if (!scheduleInput) return null;

  if (typeof scheduleInput === "object" && scheduleInput.mode) {
    if (scheduleInput.mode === "daily") {
      return { mode: "daily", time: String(scheduleInput.time || "09:00") };
    }
    if (scheduleInput.mode === "weekly") {
      return {
        mode: "weekly",
        dayOfWeek: Number(scheduleInput.dayOfWeek ?? 1),
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
  return {
    title: requireNonEmptyText(title, "Title", { maxLength: 120 }),
    type: requireEnum(type, TYPE_VALUES, "Type"),
    priority: requireEnum(priority, PRIORITY_VALUES, "Priority"),
    schedule: normalizeSchedule(schedule),
    status: "new",
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
