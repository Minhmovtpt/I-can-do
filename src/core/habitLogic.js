export function toDateOnly(dateLike = Date.now()) {
  const date = dateLike instanceof Date ? new Date(dateLike) : new Date(dateLike);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function toDayString(dateLike = Date.now()) {
  return toDateOnly(dateLike).toDateString();
}

export function isWeeklyHabitDueOnDate(habit, dateLike = Date.now()) {
  return Number(habit?.schedule?.dayOfWeek) === toDateOnly(dateLike).getDay();
}

export function getPreviousWeeklyOccurrenceDayString(dayOfWeek, dateLike = Date.now()) {
  const previous = toDateOnly(dateLike);
  previous.setDate(previous.getDate() - 1);

  while (previous.getDay() !== Number(dayOfWeek)) {
    previous.setDate(previous.getDate() - 1);
  }

  return previous.toDateString();
}

export function getNextHabitState(habit, now = Date.now()) {
  if (!isWeeklyHabitDueOnDate(habit, now)) {
    throw new Error("Habit can only be completed on its scheduled weekday");
  }

  const today = toDayString(now);
  if (habit?.lastCompleted === today) {
    throw new Error("Habit already completed for this scheduled occurrence");
  }

  const previousOccurrence = getPreviousWeeklyOccurrenceDayString(habit?.schedule?.dayOfWeek, now);
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
