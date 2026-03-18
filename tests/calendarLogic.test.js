import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScheduledItems,
  resolveCalendarStatus,
  shiftCalendarViewDate,
  toDayKey,
} from "../src/core/calendarLogic.js";

test("month navigation advances by calendar month", () => {
  const shifted = shiftCalendarViewDate(new Date("2026-01-31T12:00:00Z"), "month", 1);
  assert.equal(shifted.getUTCFullYear(), 2026);
  assert.equal(shifted.getUTCMonth(), 1);
  assert.equal(shifted.getUTCDate(), 1);
});

test("scheduled items include calendar events and weekly habits only on due dates", () => {
  const day = new Date("2026-03-16T00:00:00Z");
  const events = buildScheduledItems(
    [day],
    {
      task1: {
        title: "Task",
        schedule: { specificAt: new Date("2026-03-16T10:00:00Z").getTime() },
      },
    },
    {
      daily1: { title: "Daily", schedule: { time: "08:30" } },
    },
    {
      habit1: { title: "Weekly", schedule: { dayOfWeek: 1, time: "09:00" } },
      habit2: { title: "Wrong day", schedule: { dayOfWeek: 2, time: "09:00" } },
    },
    {
      event1: {
        title: "Meeting",
        startAt: new Date("2026-03-16T11:00:00Z").getTime(),
        endAt: new Date("2026-03-16T12:00:00Z").getTime(),
      },
    },
  );

  const rows = events.get(toDayKey(day)) || [];
  assert.deepEqual(rows.map((row) => row.kind).sort(), ["daily", "event", "habit", "task"]);
});

test("calendar status only exposes pending or completed", () => {
  assert.equal(resolveCalendarStatus({ completed: false }), "pending");
  assert.equal(resolveCalendarStatus({ completed: true }), "completed");
});
