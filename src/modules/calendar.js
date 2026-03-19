import { tasksApi, dailyTasksApi, habitsApi, calendarApi } from "../core/firebase.js";
import {
  buildScheduledItems,
  getDaysGrid,
  resolveCalendarStatus,
  shiftCalendarViewDate,
  toDayKey,
} from "../core/calendarLogic.js";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;

function getMonthLabel(date, viewMode) {
  return `${viewMode.toUpperCase()} • ${date.toLocaleString([], { month: "long", year: "numeric" })}`;
}

function formatTimeRange(event) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const options = { hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleTimeString([], options)}-${end.toLocaleTimeString([], options)}`;
}

function snapshotPrefix(status) {
  if (status === "completed") return "✔";
  if (status === "overdue") return "!";
  if (status === "upcoming" || status === "scheduled") return "○";
  if (status === "failed") return "✖";
  if (status === "skipped") return "↷";
  return "●";
}

function createStatusDot(status) {
  const dot = document.createElement("span");
  dot.className = `calendar-status-dot is-${status}`;
  dot.textContent = "●";
  return dot;
}

export function initCalendar(elements) {
  let viewDate = new Date();
  let viewMode = "month";
  let tasksById = {};
  let dailyTasksById = {};
  let habitsById = {};
  let calendarEventsById = {};

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
    const byDay = buildScheduledItems(
      gridDays,
      tasksById,
      dailyTasksById,
      habitsById,
      calendarEventsById,
    );
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
          const status = resolveCalendarStatus(event);
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
    viewDate = shiftCalendarViewDate(viewDate, viewMode, -1);
    render();
  });
  elements.calendarNextMonthBtn.addEventListener("click", () => {
    viewDate = shiftCalendarViewDate(viewDate, viewMode, 1);
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
    calendarApi.subscribeEvents((events) => {
      calendarEventsById = events || {};
      render();
    }),
  ];

  render();
  return () => unsubscribers.forEach((fn) => fn());
}
