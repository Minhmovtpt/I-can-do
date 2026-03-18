import { isScheduledOnDate, toDayString } from "./habitLogic.js";

export function toDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseTime(time = "09:00") {
  const [h, m] = String(time)
    .split(":")
    .map((n) => Number(n || 0));
  return { h, m };
}

export function shiftCalendarViewDate(viewDate, viewMode, direction) {
  const date = new Date(viewDate);

  if (viewMode === "day") {
    date.setDate(date.getDate() + direction);
    return date;
  }

  if (viewMode === "week") {
    date.setDate(date.getDate() + direction * 7);
    return date;
  }

  return new Date(date.getFullYear(), date.getMonth() + direction, 1);
}

export function getDaysGrid(viewDate, viewMode) {
  if (viewMode === "day") {
    return [new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate())];
  }

  if (viewMode === "week") {
    const sunday = new Date(viewDate);
    sunday.setDate(viewDate.getDate() - viewDate.getDay());
    return Array.from(
      { length: 7 },
      (_, i) => new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + i),
    );
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cells = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) cells.push(null);
  for (let day = 1; day <= lastDay.getDate(); day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function resolveCalendarStatus(event) {
  return event.completed ? "completed" : "pending";
}

export function buildScheduledItems(days, tasks, dailyTasks, habits, calendarEvents) {
  const byDay = new Map();
  const allowed = new Set(days.filter(Boolean).map((d) => toDayKey(d)));

  const add = (date, event) => {
    const key = toDayKey(date);
    if (!allowed.has(key)) return;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(event);
  };

  Object.values(tasks || {}).forEach((task) => {
    const ts = task?.schedule?.specificAt;
    if (!ts) return;
    const date = new Date(ts);
    add(date, {
      title: task.title,
      kind: "task",
      startAt: ts,
      endAt: ts + 30 * 60 * 1000,
      taskTime: ts,
      completed: Boolean(task.completed),
    });
  });

  days.filter(Boolean).forEach((date) => {
    Object.values(dailyTasks || {}).forEach((task) => {
      if (!isScheduledOnDate(task, date)) return;
      const { h, m } = parseTime(task?.schedule?.time);
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime();
      add(date, {
        title: task.title,
        kind: "daily",
        startAt: at,
        endAt: at + 30 * 60 * 1000,
        taskTime: at,
        completed: task?.lastCompleted === toDayString(date),
      });
    });

    Object.values(habits || {}).forEach((habit) => {
      if (!isScheduledOnDate(habit, date)) return;
      const { h, m } = parseTime(habit?.schedule?.time);
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime();
      add(date, {
        title: habit.title,
        kind: "habit",
        startAt: at,
        endAt: at + 30 * 60 * 1000,
        taskTime: at,
        completed: habit?.lastCompleted === toDayString(date),
      });
    });
  });

  Object.values(calendarEvents || {}).forEach((event) => {
    const ts = Number(event?.startAt || 0);
    if (!ts) return;
    const date = new Date(ts);
    add(date, {
      title: event.title,
      kind: "event",
      startAt: ts,
      endAt: Number(event?.endAt || ts),
      completed: false,
    });
  });

  return byDay;
}
