import test from "node:test";
import assert from "node:assert/strict";
import {
  getNextHabitState,
  getPreviousWeeklyOccurrenceDayString,
  isWeeklyHabitDueOnDate,
} from "../src/core/habitLogic.js";

test("weekly habits can only be completed on their scheduled weekday", () => {
  const habit = { schedule: { dayOfWeek: 1, time: "09:00" } };

  assert.equal(isWeeklyHabitDueOnDate(habit, new Date("2026-03-16T09:00:00Z")), true);
  assert.equal(isWeeklyHabitDueOnDate(habit, new Date("2026-03-17T09:00:00Z")), false);
  assert.throws(
    () => getNextHabitState(habit, new Date("2026-03-17T09:00:00Z")),
    /scheduled weekday/,
  );
});

test("weekly habit streaks compare against the previous scheduled occurrence", () => {
  const monday = new Date("2026-03-16T09:00:00Z");
  const habit = {
    schedule: { dayOfWeek: 1, time: "09:00" },
    lastCompleted: getPreviousWeeklyOccurrenceDayString(1, monday),
    streak: 4,
  };

  const next = getNextHabitState(habit, monday);
  assert.equal(next.streak, 5);
});
