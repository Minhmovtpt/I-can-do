export function toDateOnly(dateLike = Date.now()) {
  const date = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDayString(dateLike = Date.now()) {
  return toDateOnly(dateLike).toDateString();
}

export function getScheduledDays(schedule = {}) {
  if (Array.isArray(schedule?.daysOfWeek) && schedule.daysOfWeek.length) {
    return [
      ...new Set(
        schedule.daysOfWeek
          .map((day) => Number(day))
          .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
      ),
    ].sort((a, b) => a - b);
  }

  if (schedule?.dayOfWeek !== undefined && schedule?.dayOfWeek !== null) {
    const day = Number(schedule.dayOfWeek);
    return Number.isInteger(day) && day >= 0 && day <= 6 ? [day] : [];
  }

  return [];
}

export function isScheduledOnDate(item, dateLike = Date.now()) {
  const schedule = item?.schedule || {};
  if (schedule.mode === "daily" || (!schedule.mode && !getScheduledDays(schedule).length)) {
    return true;
  }

  if (schedule.mode === "weekly" || getScheduledDays(schedule).length) {
    return getScheduledDays(schedule).includes(toDateOnly(dateLike).getDay());
  }

  return false;
}

export function isWeeklyHabitDueOnDate(habit, dateLike = Date.now()) {
  return isScheduledOnDate(habit, dateLike);
}

export function getPreviousScheduledOccurrenceDayString(schedule, dateLike = Date.now()) {
  const days = getScheduledDays(schedule);
  if (!days.length) {
    const previous = toDateOnly(dateLike);
    previous.setDate(previous.getDate() - 1);
    return previous.toDateString();
  }

  const previous = toDateOnly(dateLike);
  previous.setDate(previous.getDate() - 1);

  while (!days.includes(previous.getDay())) {
    previous.setDate(previous.getDate() - 1);
  }

  return previous.toDateString();
}

export function getPreviousWeeklyOccurrenceDayString(dayOfWeek, dateLike = Date.now()) {
  return getPreviousScheduledOccurrenceDayString({ dayOfWeek }, dateLike);
}

export function getNextHabitState(habit, now = Date.now()) {
  if (!isScheduledOnDate(habit, now)) {
    throw new Error("Habit can only be completed on its scheduled weekday");
  }

  const today = toDayString(now);
  if (habit?.lastCompleted === today) {
    throw new Error("Habit already completed for this scheduled occurrence");
  }

  const previousOccurrence = getPreviousScheduledOccurrenceDayString(habit?.schedule, now);
  const streak = habit?.lastCompleted === previousOccurrence ? Number(habit?.streak || 0) + 1 : 1;
  const timestamp = dateLikeToTimestamp(now);

  return {
    lastCompleted: today,
    streak,
    status: "done",
    completed: true,
    completedAt: timestamp,
    updatedAt: timestamp,
  };
}

function dateLikeToTimestamp(dateLike) {
  return dateLike instanceof Date ? dateLike.getTime() : Number(dateLike || Date.now());
}
