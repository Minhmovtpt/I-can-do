import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCanCompleteOccurrence,
  buildRoutineResetPatch,
  getCurrentWorkStatus,
  getItemCompletionDayKey,
  getMillisecondsUntilNextLocalDay,
  isScheduledOnDate,
  normalizeSchedule,
  requireTimeString,
} from "../src/core/scheduling.js";

test("time inputs must use strict HH:mm 24-hour format", () => {
  assert.equal(requireTimeString("09:30"), "09:30");
  assert.throws(() => requireTimeString("25:99"), /HH:mm/);
  assert.throws(() => normalizeSchedule({ mode: "daily", time: "9:30" }), /HH:mm/);
});

test("scheduled tasks stay upcoming before time and become overdue after time", () => {
  const specificAt = new Date(2026, 2, 19, 10, 0, 0).getTime();
  const task = { schedule: { mode: "once", specificAt }, status: "todo" };

  assert.equal(getCurrentWorkStatus(task, new Date(2026, 2, 19, 9, 59, 0).getTime()), "upcoming");
  assert.equal(getCurrentWorkStatus(task, new Date(2026, 2, 19, 10, 0, 0).getTime()), "overdue");
  assert.throws(
    () => assertCanCompleteOccurrence(task, new Date(2026, 2, 19, 9, 59, 0).getTime()),
    /before its scheduled time/,
  );
});

test("legacy schedules infer once and weekly modes without an explicit mode field", () => {
  const oneOffTime = new Date(2026, 2, 19, 14, 0, 0).getTime();

  assert.equal(
    isScheduledOnDate({ schedule: { specificAt: oneOffTime } }, new Date(2026, 2, 19, 8, 0, 0)),
    true,
  );
  assert.equal(
    isScheduledOnDate(
      { schedule: { dayOfWeek: 4, time: "09:00" } },
      new Date(2026, 2, 19, 9, 0, 0),
    ),
    true,
  );
});

test("routine completion is keyed to the current local day instead of stale completed flags", () => {
  const now = new Date(2026, 2, 19, 12, 0, 0).getTime();
  const routine = {
    schedule: { mode: "daily", time: "08:00" },
    status: "completed",
    completed: true,
    lastCompleted: "2026-03-18",
  };

  const patch = buildRoutineResetPatch(routine, now);
  assert.equal(getItemCompletionDayKey(routine), "2026-03-18");
  assert.equal(patch.status, "todo");
  assert.equal(patch.completed, false);
  assert.equal(patch.lastCompletedOn, "2026-03-18");
});

test("milliseconds until next local day follow calendar midnight rather than fixed 24h intervals", () => {
  const now = new Date(2026, 2, 19, 23, 59, 30, 0).getTime();
  assert.equal(getMillisecondsUntilNextLocalDay(now), 30 * 1000);
});
