import test from "node:test";
import assert from "node:assert/strict";
import {
  assertCanCompleteOccurrence,
  buildRoutineResetPatch,
  getCurrentWorkStatus,
  getItemCompletionDayKey,
  getMillisecondsUntilNextLocalDay,
  normalizeSchedule,
  requireTimeString,
} from "../src/core/scheduling.js";

test("time inputs must use strict HH:mm 24-hour format", () => {
  assert.equal(requireTimeString("09:30"), "09:30");
  assert.throws(() => requireTimeString("25:99"), /HH:mm/);
  assert.throws(() => normalizeSchedule({ mode: "daily", time: "9:30" }), /HH:mm/);
});

test("scheduled tasks stay upcoming before time and become overdue after time", () => {
  const specificAt = new Date("2026-03-19T10:00:00Z").getTime();
  const task = { schedule: { mode: "once", specificAt }, status: "todo" };

  assert.equal(getCurrentWorkStatus(task, new Date("2026-03-19T09:59:00Z").getTime()), "upcoming");
  assert.equal(getCurrentWorkStatus(task, new Date("2026-03-19T10:00:00Z").getTime()), "overdue");
  assert.throws(
    () => assertCanCompleteOccurrence(task, new Date("2026-03-19T09:59:00Z").getTime()),
    /before its scheduled time/,
  );
});

test("routine completion is keyed to the current local day instead of stale completed flags", () => {
  const now = new Date("2026-03-19T12:00:00Z").getTime();
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
