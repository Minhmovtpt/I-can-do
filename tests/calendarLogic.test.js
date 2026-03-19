import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScheduledItems,
  resolveCalendarStatus,
  shiftCalendarViewDate,
  toDayKey,
} from "../src/core/calendarLogic.js";

test("month navigation advances by calendar month", () => {
  const shifted = shiftCalendarViewDate(new Date(2026, 0, 31, 12, 0, 0), "month", 1);
  assert.equal(shifted.getFullYear(), 2026);
  assert.equal(shifted.getMonth(), 1);
  assert.equal(shifted.getDate(), 1);
});

test("scheduled items include recurring routines on matching days only", () => {
  const day = new Date(2026, 2, 16, 0, 0, 0);
  const events = buildScheduledItems(
    [day],
    {
      task1: {
        title: "Task",
        schedule: { mode: "once", specificAt: new Date(2026, 2, 16, 10, 0, 0).getTime() },
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
      habit1: { title: "Legacy habit", schedule: { mode: "weekly", dayOfWeek: 1, time: "09:00" } },
    },
    {
      event1: {
        title: "Meeting",
        startAt: new Date(2026, 2, 16, 11, 0, 0).getTime(),
        endAt: new Date(2026, 2, 16, 12, 0, 0).getTime(),
      },
    },
    new Date(2026, 2, 16, 12, 0, 0).getTime(),
  );

  const rows = events.get(toDayKey(day)) || [];
  assert.deepEqual(rows.map((row) => row.title).sort(), [
    "Daily",
    "Legacy habit",
    "Meeting",
    "Mon routine",
    "Task",
  ]);
  assert.equal(rows.find((row) => row.title === "Task")?.status, "overdue");
});

test("calendar status exposes scheduled, upcoming, overdue, and terminal states", () => {
  assert.equal(resolveCalendarStatus({ status: "overdue" }), "overdue");
  assert.equal(resolveCalendarStatus({ status: "completed" }), "completed");
  assert.equal(resolveCalendarStatus({ completed: true }), "completed");
  assert.equal(resolveCalendarStatus({}), "scheduled");
});
