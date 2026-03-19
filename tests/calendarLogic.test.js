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
        schedule: { mode: "once", specificAt: new Date("2026-03-16T10:00:00Z").getTime() },
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
        startAt: new Date("2026-03-16T11:00:00Z").getTime(),
        endAt: new Date("2026-03-16T12:00:00Z").getTime(),
      },
    },
    new Date("2026-03-16T12:00:00Z").getTime(),
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
  assert.equal(resolveCalendarStatus({}), "scheduled");
});
