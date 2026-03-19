import {
  buildCompletionPatch,
  getItemCompletionDayKey,
  getScheduledDays,
  isScheduledOnDate,
  toDateOnly,
  toDayKey,
} from "./scheduling.js";

export { getScheduledDays, isScheduledOnDate, toDateOnly, toDayKey as toDayString };

export function isWeeklyHabitDueOnDate(habit, dateLike = Date.now()) {
  return isScheduledOnDate(habit, dateLike);
}

export function getPreviousScheduledOccurrenceDayString(schedule, dateLike = Date.now()) {
  const days = getScheduledDays(schedule);
  const previous = toDateOnly(dateLike);
  previous.setDate(previous.getDate() - 1);

  if (!days.length) {
    return toDayKey(previous);
  }

  while (!days.includes(previous.getDay())) {
    previous.setDate(previous.getDate() - 1);
  }

  return toDayKey(previous);
}

export function getPreviousWeeklyOccurrenceDayString(dayOfWeek, dateLike = Date.now()) {
  return getPreviousScheduledOccurrenceDayString({ dayOfWeek }, dateLike);
}

export function getNextHabitState(habit, now = Date.now()) {
  const completionPatch = buildCompletionPatch(habit, now);
  const previousOccurrence = getPreviousScheduledOccurrenceDayString(habit?.schedule, now);
  const lastCompletedOn = getItemCompletionDayKey(habit);
  const streak = lastCompletedOn === previousOccurrence ? Number(habit?.streak || 0) + 1 : 1;

  return {
    ...completionPatch,
    streak,
  };
}
