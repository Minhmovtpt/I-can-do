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

test("scheduled items include recurring routines on matching days only", () => {
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
      daily1: { title: "Daily", schedule: { mode: "daily", time: "08:30" } },
      weekly1: {
        title: "Mon routine",
        schedule: { mode: "weekly", daysOfWeek: [1], time: "07:45" },
      },
      weekly2: { title: "Wrong day", schedule: { mode: "weekly", daysOfWeek: [2], time: "12:00" } },
    },
    {
      habit1: { title: "Legacy habit", schedule: { dayOfWeek: 1, time: "09:00" } },
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
  assert.deepEqual(rows.map((row) => row.title).sort(), [
    "Daily",
    "Legacy habit",
    "Meeting",
    "Mon routine",
    "Task",
  ]);
});

test("calendar status only exposes pending or completed", () => {
  assert.equal(resolveCalendarStatus({ completed: false }), "pending");
  assert.equal(resolveCalendarStatus({ completed: true }), "completed");
});
