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

function getMonthLabel(date) {
  return date.toLocaleString([], { month: "long", year: "numeric" });
}

function toDayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getDaysGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  const cells = [];
  const leading = firstDay.getDay();
  for (let i = 0; i < leading; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function initCalendar(elements, notifyError) {
  let viewDate = new Date();
  let eventsById = {};

  function setMonthLabel() {
    elements.calendarMonthLabel.textContent = getMonthLabel(viewDate);
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

    const notes = prompt("Edit notes:", event.notes || "");
    if (notes === null) return;

    const linkType = prompt("Link type (task/focus or leave blank):", event.linkType || "");
    if (linkType === null) return;

    const linkId = prompt("Link id (optional):", event.linkId || "");
    if (linkId === null) return;

    try {
      await updateCalendarEvent(eventId, { title, startAt, endAt, notes, linkType, linkId });
    } catch (error) {
      notifyError(error, "Failed to update event");
    }
  }

  function render() {
    setMonthLabel();
    elements.calendarWeekdays.innerHTML = "";
    WEEK_DAYS.forEach((day) => {
      const header = document.createElement("div");
      header.className = "calendar-weekday";
      header.textContent = day;
      elements.calendarWeekdays.appendChild(header);
    });

    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const monthEvents = Object.entries(eventsById || {})
      .map(([id, event]) => ({ id, ...event }))
      .filter((event) => {
        const start = new Date(event.startAt || 0);
        return start.getMonth() === month && start.getFullYear() === year;
      })
      .sort((a, b) => (a.startAt || 0) - (b.startAt || 0));

    const byDay = new Map();
    monthEvents.forEach((event) => {
      const key = toDayKey(new Date(event.startAt));
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(event);
    });

    elements.calendarGrid.innerHTML = "";
    getDaysGrid(viewDate).forEach((dayDate) => {
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

      (byDay.get(key) || []).forEach((event) => {
        const row = document.createElement("div");
        row.className = "calendar-event";

        const text = document.createElement("button");
        text.className = "calendar-event-btn";
        const linkBadge = event.linkType ? ` [${event.linkType}]` : "";
        text.textContent = `${formatTimeRange(event)} ${event.title}${linkBadge}`;
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
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    render();
  });
  elements.calendarNextMonthBtn.addEventListener("click", () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    render();
  });
  elements.calendarTodayBtn.addEventListener("click", () => {
    viewDate = new Date();
    render();
  });

  const unsubscribe = subscribeCalendarEvents((events) => {
    eventsById = events || {};
    render();
  });

  render();
  return unsubscribe;
}
