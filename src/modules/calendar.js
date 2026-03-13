import { tasksApi, dailyTasksApi, habitsApi } from "../core/firebase.js";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function toDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthLabel(date, viewMode) {
  return `${viewMode.toUpperCase()} • ${date.toLocaleString([], { month: "long", year: "numeric" })}`;
}

function formatTimeRange(event) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const options = { hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleTimeString([], options)}-${end.toLocaleTimeString([], options)}`;
}

function resolveStatus(event, now) {
  if (event.completed) return "completed";
  if ((event.taskTime || event.startAt) < now) return "fail";
  return "pending";
}

function snapshotPrefix(status) {
  if (status === "fail") return "● FAIL";
  if (status === "completed") return "✔";
  return "●";
}

function createStatusDot(status) {
  const dot = document.createElement("span");
  dot.className = `calendar-status-dot is-${status}`;
  dot.textContent = "●";
  return dot;
}

function parseTime(time = "09:00") {
  const [h, m] = String(time)
    .split(":")
    .map((n) => Number(n || 0));
  return { h, m };
}

function getDaysGrid(viewDate, viewMode) {
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

function scheduledItems(days, tasks, dailyTasks, habits) {
  const byDay = new Map();
  const allowed = new Set(days.filter(Boolean).map((d) => toDayKey(d)));

  const add = (date, event) => {
    const key = toDayKey(date);
    if (!allowed.has(key)) return;
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(event);
  };

  Object.values(tasks || {}).forEach((task) => {
    const ts = task.schedule?.specificAt;
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
      const { h, m } = parseTime(task.schedule?.time);
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime();
      const done = task.lastCompleted === date.toDateString();
      add(date, {
        title: task.title,
        kind: "daily",
        startAt: at,
        endAt: at + 30 * 60 * 1000,
        taskTime: at,
        completed: done,
      });
    });

    Object.values(habits || {}).forEach((habit) => {
      if (Number(habit.schedule?.dayOfWeek) !== date.getDay()) return;
      const { h, m } = parseTime(habit.schedule?.time);
      const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime();
      const done = habit.lastCompleted === date.toDateString();
      add(date, {
        title: habit.title,
        kind: "habit",
        startAt: at,
        endAt: at + 30 * 60 * 1000,
        taskTime: at,
        completed: done,
      });
    });
  });

  return byDay;
}

export function initCalendar(elements) {
  let viewDate = new Date();
  let viewMode = "month";
  let tasksById = {};
  let dailyTasksById = {};
  let habitsById = {};

  function render() {
    elements.calendarMonthLabel.textContent = getMonthLabel(viewDate, viewMode);
    elements.calendarWeekdays.innerHTML = "";

    if (viewMode !== "day") {
      WEEK_DAYS.forEach((day) => {
        const header = document.createElement("div");
        header.className = "calendar-weekday";
        header.textContent = day;
        elements.calendarWeekdays.appendChild(header);
      });
    }

    const gridDays = getDaysGrid(viewDate, viewMode);
    const byDay = scheduledItems(gridDays, tasksById, dailyTasksById, habitsById);
    const now = Date.now();
    const maxVisible = now + FOUR_DAYS_MS;

    elements.calendarGrid.innerHTML = "";
    elements.calendarGrid.style.gridTemplateColumns =
      viewMode === "day" ? "1fr" : "repeat(7, minmax(0,1fr))";

    gridDays.forEach((dayDate) => {
      const cell = document.createElement("div");
      cell.className = "calendar-day";

      if (!dayDate) {
        cell.classList.add("is-empty");
        elements.calendarGrid.appendChild(cell);
        return;
      }

      const key = toDayKey(dayDate);
      if (dayDate.getTime() > maxVisible) {
        cell.classList.add("calendar-day-future");
      }

      const label = document.createElement("div");
      label.className = "calendar-day-label";
      label.textContent = String(dayDate.getDate());
      cell.appendChild(label);

      (byDay.get(key) || [])
        .sort((a, b) => (a.startAt || 0) - (b.startAt || 0))
        .forEach((event) => {
          const status = resolveStatus(event, now);
          const row = document.createElement("div");
          row.className = "calendar-event";

          const button = document.createElement("button");
          button.className = `calendar-event-btn is-generated status-${status}`;
          button.disabled = true;
          button.appendChild(createStatusDot(status));

          const text = document.createElement("span");
          text.textContent = `${snapshotPrefix(status)} ${formatTimeRange(event)} ${event.title} [${event.kind}]`;
          button.appendChild(text);

          row.appendChild(button);
          cell.appendChild(row);
        });

      elements.calendarGrid.appendChild(cell);
    });
  }

  elements.calendarPrevMonthBtn.addEventListener("click", () => {
    const delta = viewMode === "day" ? -1 : viewMode === "week" ? -7 : -30;
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + delta);
    render();
  });
  elements.calendarNextMonthBtn.addEventListener("click", () => {
    const delta = viewMode === "day" ? 1 : viewMode === "week" ? 7 : 30;
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate() + delta);
    render();
  });
  elements.calendarTodayBtn.addEventListener("click", () => {
    viewDate = new Date();
    render();
  });
  elements.calendarViewMonthBtn.addEventListener("click", () => {
    viewMode = "month";
    render();
  });
  elements.calendarViewWeekBtn.addEventListener("click", () => {
    viewMode = "week";
    render();
  });
  elements.calendarViewDayBtn.addEventListener("click", () => {
    viewMode = "day";
    render();
  });

  const unsubscribers = [
    tasksApi.subscribe((tasks) => {
      tasksById = tasks || {};
      render();
    }),
    dailyTasksApi.subscribe((daily) => {
      dailyTasksById = daily || {};
      render();
    }),
    habitsApi.subscribe((habits) => {
      habitsById = habits || {};
      render();
    }),
  ];

  render();
  return () => unsubscribers.forEach((fn) => fn());
}
