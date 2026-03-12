import { tasksApi, dailyTasksApi, habitsApi } from "../core/firebase.js";
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  subscribeCalendarEvents,
} from "../services/calendarService.js";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateTimeValue(value) {
  const d = new Date(value);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatTimeRange(event) {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  const options = { hour: "2-digit", minute: "2-digit" };
  return `${start.toLocaleTimeString([], options)}-${end.toLocaleTimeString([], options)}`;
}

function getMonthLabel(date, viewMode) {
  return `${viewMode.toUpperCase()} • ${date.toLocaleString([], { month: "long", year: "numeric" })}`;
}

function toDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDaysGrid(viewDate, viewMode) {
  if (viewMode === "day")
    return [new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate())];

  if (viewMode === "week") {
    const anchor = new Date(viewDate);
    const sunday = new Date(anchor);
    sunday.setDate(anchor.getDate() - anchor.getDay());
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
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function parseTime(time = "09:00") {
  const [h, m] = String(time)
    .split(":")
    .map((n) => Number(n || 0));
  return { h, m };
}

function rangeDayKeys(days) {
  return new Set(days.filter(Boolean).map((d) => toDayKey(d)));
}

function scheduledItems(days, tasks, dailyTasks, habits) {
  const byDay = new Map();
  const keys = rangeDayKeys(days);

  const add = (dayKey, item) => {
    if (!keys.has(dayKey)) return;
    if (!byDay.has(dayKey)) byDay.set(dayKey, []);
    byDay.get(dayKey).push(item);
  };

  Object.entries(tasks || {}).forEach(([id, task]) => {
    const ts = task.schedule?.specificAt;
    if (!ts) return;
    const date = new Date(ts);
    add(toDayKey(date), {
      id: `task-${id}`,
      kind: "task",
      title: task.title,
      startAt: ts,
      endAt: ts + 30 * 60 * 1000,
    });
  });

  days.filter(Boolean).forEach((d) => {
    Object.entries(dailyTasks || {}).forEach(([id, task]) => {
      const { h, m } = parseTime(task.schedule?.time);
      const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
      add(toDayKey(d), {
        id: `daily-${id}-${toDayKey(d)}`,
        kind: "daily",
        title: task.title,
        startAt,
        endAt: startAt + 30 * 60 * 1000,
      });
    });

    Object.entries(habits || {}).forEach(([id, habit]) => {
      if (Number(habit.schedule?.dayOfWeek) !== d.getDay()) return;
      const { h, m } = parseTime(habit.schedule?.time);
      const startAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
      add(toDayKey(d), {
        id: `habit-${id}-${toDayKey(d)}`,
        kind: "habit",
        title: habit.title,
        startAt,
        endAt: startAt + 30 * 60 * 1000,
      });
    });
  });

  return byDay;
}

export function initCalendar(elements, notifyError) {
  let viewDate = new Date();
  let viewMode = "month";
  let eventsById = {};
  let viewMode = "month";

  function setMonthLabel() {
    elements.calendarMonthLabel.textContent = getMonthLabel(viewDate, viewMode);
  }

  async function handleCreateEvent() {
    try {
      await createCalendarEvent({
        title: elements.calendarTitleInput.value,
        startAt: elements.calendarStartInput.value,
        endAt: elements.calendarEndInput.value,
        notes: elements.calendarNotesInput.value,
        linkType: elements.calendarLinkTypeInput.value,
        linkId: elements.calendarLinkIdInput.value,
      });
      elements.calendarTitleInput.value = "";
      elements.calendarNotesInput.value = "";
      elements.calendarLinkTypeInput.value = "";
      elements.calendarLinkIdInput.value = "";
    } catch (error) {
      notifyError(error, "Failed to create event");
    }
  }

  async function handleEditEvent(eventId, event) {
    const title = prompt("Edit event title:", event.title || "");
    if (title === null) return;
    const startAt = prompt(
      "Edit start date/time (YYYY-MM-DDTHH:mm):",
      formatDateTimeValue(event.startAt),
    );
    if (startAt === null) return;
    const endAt = prompt(
      "Edit end date/time (YYYY-MM-DDTHH:mm):",
      formatDateTimeValue(event.endAt),
    );
    if (endAt === null) return;

    try {
      await updateCalendarEvent(eventId, { title, startAt, endAt });
    } catch (error) {
      notifyError(error, "Failed to update event");
    }
  }

  function render() {
    setMonthLabel();
    elements.calendarWeekdays.innerHTML = "";

    if (viewMode === "month" || viewMode === "week") {
      WEEK_DAYS.forEach((day) => {
        const header = document.createElement("div");
        header.className = "calendar-weekday";
        header.textContent = day;
        elements.calendarWeekdays.appendChild(header);
      });
    }

    const gridDays = getDaysGrid(viewDate, viewMode);
    const byDay = new Map();
    Object.entries(eventsById || {}).forEach(([id, event]) => {
      const key = toDayKey(new Date(event.startAt || 0));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push({ id, ...event });
    });

    elements.calendarGrid.innerHTML = "";
    if (viewMode === "day") elements.calendarGrid.style.gridTemplateColumns = "1fr";
    else if (viewMode === "week")
      elements.calendarGrid.style.gridTemplateColumns = "repeat(7,minmax(0,1fr))";
    else elements.calendarGrid.style.gridTemplateColumns = "repeat(7,minmax(0,1fr))";

    gridDays.forEach((dayDate) => {
      const cell = document.createElement("div");
      cell.className = "calendar-day";

      if (!dayDate) {
        cell.classList.add("is-empty");
        elements.calendarGrid.appendChild(cell);
        return;
      }

      const key = toDayKey(dayDate);
      const dayLabel = document.createElement("div");
      dayLabel.className = "calendar-day-label";
      dayLabel.textContent = String(dayDate.getDate());
      cell.appendChild(dayLabel);

      (byDay.get(key) || [])
        .sort((a, b) => (a.startAt || 0) - (b.startAt || 0))
        .forEach((event) => {
          const row = document.createElement("div");
          row.className = "calendar-event";

          const text = document.createElement("button");
          text.className = "calendar-event-btn";
          text.textContent = `${formatTimeRange(event)} ${event.title}${event.linkType ? ` [${event.linkType}]` : ""}`;
          text.addEventListener("click", () => handleEditEvent(event.id, event));

          const removeBtn = document.createElement("button");
          removeBtn.className = "btn-danger";
          removeBtn.textContent = "X";
          removeBtn.addEventListener("click", () =>
            deleteCalendarEvent(event.id).catch((e) => notifyError(e, "Failed to delete event")),
          );

          row.appendChild(text);
          row.appendChild(removeBtn);
          cell.appendChild(row);
        });

      elements.calendarGrid.appendChild(cell);
    });
  }

  elements.addCalendarEventBtn.addEventListener("click", handleCreateEvent);
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

  const unsubscribe = subscribeCalendarEvents((events) => {
    eventsById = events || {};
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
    subscribeCalendarEvents((events) => {
      eventsById = events || {};
      render();
    }),
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
