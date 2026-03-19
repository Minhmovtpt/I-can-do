import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextHabitState,
  getPreviousWeeklyOccurrenceDayString,
  isScheduledOnDate,
  isWeeklyHabitDueOnDate,
} from "../src/core/habitLogic.js";

test("weekly habits can only be completed on their scheduled weekday and after time", () => {
  const habit = { schedule: { dayOfWeek: 1, time: "09:00", mode: "weekly" } };

  assert.equal(isWeeklyHabitDueOnDate(habit, new Date("2026-03-16T09:00:00Z")), true);
  assert.equal(isWeeklyHabitDueOnDate(habit, new Date("2026-03-17T09:00:00Z")), false);
  assert.throws(
    () => getNextHabitState(habit, new Date("2026-03-17T09:00:00Z")),
    /not scheduled for today/,
  );
  assert.throws(
    () => getNextHabitState(habit, new Date("2026-03-16T08:59:00Z")),
    /before its scheduled time/,
  );
});

test("multi-day routines resolve matching dates", () => {
  const routine = { schedule: { mode: "weekly", daysOfWeek: [1, 3, 5], time: "09:00" } };

  assert.equal(isScheduledOnDate(routine, new Date("2026-03-16T09:00:00Z")), true);
  assert.equal(isScheduledOnDate(routine, new Date("2026-03-18T09:00:00Z")), true);
  assert.equal(isScheduledOnDate(routine, new Date("2026-03-17T09:00:00Z")), false);
});

test("weekly habit streaks compare against the previous scheduled occurrence", () => {
  const monday = new Date("2026-03-16T09:00:00Z");
  const habit = {
    schedule: { mode: "weekly", dayOfWeek: 1, time: "09:00" },
    lastCompletedOn: getPreviousWeeklyOccurrenceDayString(1, monday),
    streak: 4,
  };

  const next = getNextHabitState(habit, monday);
  assert.equal(next.streak, 5);
  assert.equal(next.status, "completed");
  assert.equal(next.lastCompletedOn, "2026-03-16");
});
