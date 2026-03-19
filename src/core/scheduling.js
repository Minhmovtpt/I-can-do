import { requireEnum } from "./validation.js";

export const STORED_WORK_STATUS_VALUES = ["todo", "in_progress", "completed", "skipped", "failed"];
export const WORK_STATUS_VALUES = [...STORED_WORK_STATUS_VALUES, "upcoming", "overdue"];
export const TERMINAL_WORK_STATUS_VALUES = ["completed", "skipped", "failed"];
export const OPEN_WORK_STATUS_VALUES = ["todo", "in_progress", "upcoming", "overdue"];
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DEFAULT_SCHEDULE_TIME = "09:00";

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

export function requireTimeString(value, fieldName = "Time") {
  const normalized = String(value ?? "").trim();
  if (!TIME_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must use HH:mm in 24-hour time.`);
  }
  return normalized;
}

export function parseTimeString(time = DEFAULT_SCHEDULE_TIME) {
  const normalized = requireTimeString(time);
  const [hours, minutes] = normalized.split(":").map(Number);
  return { hours, minutes, totalMinutes: hours * 60 + minutes };
}

export function toLocalDate(dateLike = Date.now()) {
  return dateLike instanceof Date ? new Date(dateLike.getTime()) : new Date(dateLike);
}

export function toDateOnly(dateLike = Date.now()) {
  const date = toLocalDate(dateLike);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDayKey(dateLike = Date.now()) {
  const date = toDateOnly(dateLike);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function normalizeStoredDayKey(value) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return toDayKey(parsed);
}

export function getScheduledDays(schedule = {}) {
  if (Array.isArray(schedule?.daysOfWeek) && schedule.daysOfWeek.length) {
    return normalizeDaysOfWeek(schedule.daysOfWeek);
  }

  if (schedule?.dayOfWeek !== undefined && schedule?.dayOfWeek !== null) {
    return normalizeDaysOfWeek(schedule.dayOfWeek);
  }

  return [];
}

export function getScheduleMode(schedule = {}) {
  if (schedule.mode === "daily" || schedule.mode === "weekly" || schedule.mode === "once") {
    return schedule.mode;
  }

  if (schedule.specificAt !== undefined && schedule.specificAt !== null) {
    const specificAt = Number(schedule.specificAt);
    if (Number.isFinite(specificAt) && specificAt > 0) {
      return "once";
    }
  }

  if (getScheduledDays(schedule).length) {
    return "weekly";
  }

  if (
    schedule.time !== undefined &&
    schedule.time !== null &&
    String(schedule.time).trim() !== ""
  ) {
    return "daily";
  }

  return null;
}

export function normalizeSchedule(scheduleInput, { defaultTime = DEFAULT_SCHEDULE_TIME } = {}) {
  if (scheduleInput === undefined) return undefined;
  if (scheduleInput === null || scheduleInput === "") return null;

  if (typeof scheduleInput === "object" && scheduleInput.mode) {
    if (scheduleInput.mode === "daily") {
      return {
        mode: "daily",
        time: requireTimeString(scheduleInput.time ?? defaultTime, "Schedule time"),
        timezone: "local",
      };
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
        time: requireTimeString(scheduleInput.time ?? defaultTime, "Schedule time"),
        timezone: "local",
      };
    }

    if (scheduleInput.mode === "once") {
      const specificAt = Number(scheduleInput.specificAt);
      if (!Number.isFinite(specificAt) || specificAt <= 0) {
        throw new Error("Schedule must be a valid date/time.");
      }

      return { mode: "once", specificAt, timezone: "local" };
    }

    throw new Error("Schedule mode is invalid.");
  }

  const specificAt = Date.parse(scheduleInput);
  if (!Number.isFinite(specificAt)) {
    throw new Error("Schedule must be a valid date/time.");
  }

  return { mode: "once", specificAt, timezone: "local" };
}

export function getBaseStatus(item = {}) {
  if (item.status === "done") return "completed";
  if (STORED_WORK_STATUS_VALUES.includes(item.status)) return item.status;
  if (item.completed === true) return "completed";
  return "todo";
}

export function isTerminalStatus(status) {
  return TERMINAL_WORK_STATUS_VALUES.includes(status);
}

export function isOpenStatus(status) {
  return OPEN_WORK_STATUS_VALUES.includes(status);
}

export function isScheduledOnDate(item, dateLike = Date.now()) {
  const schedule = item?.schedule || {};
  const scheduleMode = getScheduleMode(schedule);

  if (scheduleMode === null) {
    return false;
  }

  if (scheduleMode === "daily") {
    return true;
  }

  if (scheduleMode === "weekly") {
    return getScheduledDays(schedule).includes(toDateOnly(dateLike).getDay());
  }

  if (scheduleMode === "once") {
    return toDayKey(schedule.specificAt) === toDayKey(dateLike);
  }

  return false;
}

export function getItemCompletionDayKey(item = {}) {
  return normalizeStoredDayKey(item.lastCompletedOn ?? item.lastCompleted);
}

export function getScheduledStartForDate(schedule = {}, dateLike = Date.now()) {
  const scheduleMode = getScheduleMode(schedule);

  if (scheduleMode === "once") {
    return Number(schedule.specificAt || 0) || null;
  }

  const { hours, minutes } = parseTimeString(schedule.time ?? DEFAULT_SCHEDULE_TIME);
  const day = toDateOnly(dateLike);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes, 0, 0).getTime();
}

export function getOccurrenceCloseAt(schedule = {}, dateLike = Date.now()) {
  const scheduleMode = getScheduleMode(schedule);

  if (scheduleMode === "once") {
    return null;
  }

  const day = toDateOnly(dateLike);
  const nextDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0, 0);
  return nextDay.getTime();
}

export function getOccurrenceStateForDate(item, dateLike, now = Date.now()) {
  const schedule = item?.schedule || null;
  const baseStatus = getBaseStatus(item);

  if (!schedule) {
    return {
      status: baseStatus,
      baseStatus,
      availableAt: null,
      overdueAt: null,
      closesAt: null,
      dayKey: null,
      isScheduled: false,
      isCompletedForOccurrence: baseStatus === "completed",
    };
  }

  const scheduleMode = getScheduleMode(schedule);
  const isScheduled = isScheduledOnDate({ schedule }, dateLike);
  const dayKey = scheduleMode === "once" ? toDayKey(schedule.specificAt) : toDayKey(dateLike);
  const availableAt = getScheduledStartForDate(schedule, dateLike);
  const overdueAt = availableAt;
  const closesAt = getOccurrenceCloseAt(schedule, dateLike);
  const completedDayKey = getItemCompletionDayKey(item);
  const isCompletedForOccurrence = completedDayKey === dayKey;
  const currentTime = Number(now);

  if (baseStatus === "skipped" || baseStatus === "failed") {
    return {
      status: baseStatus,
      baseStatus,
      availableAt,
      overdueAt,
      closesAt,
      dayKey,
      isScheduled,
      isCompletedForOccurrence,
    };
  }

  if (!isScheduled) {
    return {
      status: "todo",
      baseStatus,
      availableAt,
      overdueAt,
      closesAt,
      dayKey,
      isScheduled,
      isCompletedForOccurrence,
    };
  }

  if (isCompletedForOccurrence || (scheduleMode === "once" && baseStatus === "completed")) {
    return {
      status: "completed",
      baseStatus,
      availableAt,
      overdueAt,
      closesAt,
      dayKey,
      isScheduled,
      isCompletedForOccurrence: true,
    };
  }

  if (availableAt !== null && currentTime < availableAt) {
    return {
      status: "upcoming",
      baseStatus,
      availableAt,
      overdueAt,
      closesAt,
      dayKey,
      isScheduled,
      isCompletedForOccurrence: false,
    };
  }

  return {
    status: "overdue",
    baseStatus,
    availableAt,
    overdueAt,
    closesAt,
    dayKey,
    isScheduled,
    isCompletedForOccurrence: false,
  };
}

export function getCurrentWorkStatus(item, now = Date.now()) {
  const schedule = item?.schedule || null;
  if (!schedule) {
    return getBaseStatus(item);
  }

  const scheduleMode = getScheduleMode(schedule);

  if (scheduleMode === "once") {
    return getOccurrenceStateForDate(item, schedule.specificAt, now).status;
  }

  return getOccurrenceStateForDate(item, now, now).status;
}

export function assertCanCompleteOccurrence(item, now = Date.now()) {
  const schedule = item?.schedule || null;
  const currentTime = Number(now);
  const state = getCurrentWorkStatus(item, currentTime);

  if (state === "completed") {
    throw new Error("Item already completed for this occurrence.");
  }
  if (state === "skipped" || state === "failed") {
    throw new Error(`Item is already ${state}.`);
  }

  if (!schedule) {
    return;
  }

  if (getScheduleMode(schedule) !== "once" && !isScheduledOnDate(item, currentTime)) {
    throw new Error("Item is not scheduled for today.");
  }

  const availableAt = getScheduledStartForDate(schedule, currentTime);
  if (availableAt !== null && currentTime < availableAt) {
    throw new Error("Item cannot be completed before its scheduled time.");
  }

  const closesAt = getOccurrenceCloseAt(schedule, currentTime);
  if (closesAt !== null && currentTime >= closesAt) {
    throw new Error("Item can no longer be completed for this occurrence.");
  }
}

export function buildCompletionPatch(item, now = Date.now()) {
  assertCanCompleteOccurrence(item, now);
  const timestamp = Number(now);
  const schedule = item?.schedule || null;
  const dayKey = schedule && getScheduleMode(schedule) !== "once" ? toDayKey(timestamp) : null;

  return {
    status: "completed",
    completed: true,
    completedAt: timestamp,
    updatedAt: timestamp,
    ...(dayKey
      ? {
          lastCompletedOn: dayKey,
          lastCompletedAt: timestamp,
          lastCompleted: dayKey,
        }
      : {}),
  };
}

export function buildRoutineResetPatch(item, now = Date.now()) {
  const timestamp = Number(now);
  const currentStatus = getCurrentWorkStatus(item, timestamp);
  const completionDayKey = getItemCompletionDayKey(item);
  const todayKey = toDayKey(timestamp);
  const patch = { updatedAt: timestamp };

  if (completionDayKey && item.lastCompletedOn === undefined) {
    patch.lastCompletedOn = completionDayKey;
  }

  if (currentStatus === "completed") {
    patch.status = "completed";
    patch.completed = true;
    patch.completedAt = item.completedAt ?? item.lastCompletedAt ?? timestamp;
    return patch;
  }

  patch.status = "todo";
  patch.completed = false;
  patch.completedAt = null;

  if (completionDayKey && completionDayKey !== todayKey && item.lastCompleted !== undefined) {
    patch.lastCompleted = completionDayKey;
  }

  return patch;
}

export function mergeExistingSchedule(currentSchedule, updates = {}, builder) {
  if (!Object.prototype.hasOwnProperty.call(updates, "schedule")) {
    return builder(currentSchedule, updates);
  }

  if (updates.schedule === null) {
    return null;
  }

  return normalizeSchedule(updates.schedule);
}

export function resolveStoredStatus(value) {
  return requireEnum(value === "done" ? "completed" : value, STORED_WORK_STATUS_VALUES, "Status");
}

export function getMillisecondsUntilNextLocalDay(now = Date.now()) {
  const date = toLocalDate(now);
  const nextMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(0, nextMidnight.getTime() - date.getTime());
}
