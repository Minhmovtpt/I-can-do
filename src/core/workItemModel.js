import { requireEnum, requireNonEmptyText } from "./validation.js";

const STATUS_VALUES = ["new", "progress", "done", "canceled"];
const PRIORITY_VALUES = ["low", "medium", "high"];
const TYPE_VALUES = ["task", "daily", "habit", "work", "personal", "study"];

export function normalizeSchedule(scheduleInput) {
  if (!scheduleInput) return null;
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
}) {
  return {
    title: requireNonEmptyText(title, "Title", { maxLength: 120 }),
    type: requireEnum(type, TYPE_VALUES, "Type"),
    priority: requireEnum(priority, PRIORITY_VALUES, "Priority"),
    schedule: normalizeSchedule(schedule),
    status: "new",
    description: String(description || "").trim(),
    completed: false,
    reward: { exp: 20 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function resolveWorkItemStatus(value) {
  return requireEnum(value, STATUS_VALUES, "Status");
}
