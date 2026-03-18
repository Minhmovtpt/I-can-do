import test from "node:test";
import assert from "node:assert/strict";
import { createWorkItemPayload } from "../src/core/workItemModel.js";

test("task-like items default to backlog while recurring trackers default to todo", () => {
  assert.equal(createWorkItemPayload({ title: "Work item", type: "work" }).status, "backlog");
  assert.equal(createWorkItemPayload({ title: "Task", type: "task" }).status, "backlog");
  assert.equal(createWorkItemPayload({ title: "Habit", type: "habit" }).status, "todo");
  assert.equal(createWorkItemPayload({ title: "Daily", type: "daily" }).status, "todo");
});

test("weekly schedules normalize multi-day selections", () => {
  const payload = createWorkItemPayload({
    title: "Routine",
    type: "daily",
    schedule: { mode: "weekly", daysOfWeek: [5, 1, 5], time: "08:00" },
  });

  assert.deepEqual(payload.schedule.daysOfWeek, [1, 5]);
  assert.equal(payload.schedule.dayOfWeek, 1);
});
