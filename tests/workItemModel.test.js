import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateTaskReward,
  createTaskPayload,
  createWorkItemPayload,
  getDurationMultiplier,
} from "../src/core/workItemModel.js";

test("stat-based task payload defaults to todo and stores normalized preview data", () => {
  const payload = createTaskPayload({
    title: "Design portfolio homepage",
    durationMinutes: 120,
    priority: "important",
    tags: { domain: "work", nature: "deep_work", intent: "build" },
  });

  assert.equal(payload.status, "todo");
  assert.equal(payload.completed, false);
  assert.equal(payload.durationMinutes, 120);
  assert.deepEqual(payload.tags, {
    domain: "work",
    nature: "deep_work",
    intent: "build",
  });
  assert.deepEqual(payload.baseStats, { atk: 5, foc: 3 });
  assert.deepEqual(payload.omittedStats, []);
  assert.equal(payload.durationMultiplier, 1.5);
  assert.equal(payload.priorityMultiplier, 1.5);
});

test("task rewards follow tag base stats times priority and duration multipliers", () => {
  const reward = calculateTaskReward({
    title: "Design portfolio homepage",
    durationMinutes: 120,
    priority: "important",
    tags: { domain: "work", nature: "deep_work", intent: "build" },
  });

  assert.deepEqual(reward.baseStats, { atk: 5, foc: 3 });
  assert.deepEqual(reward.reward, { atk: 11.25, foc: 6.75, exp: 18 });
  assert.deepEqual(reward.omittedStats, []);
});

test("routine payloads still normalize recurring schedules", () => {
  const payload = createWorkItemPayload({
    title: "Routine",
    type: "daily",
    schedule: { mode: "weekly", daysOfWeek: [5, 1, 5], time: "08:00" },
  });

  assert.deepEqual(payload.schedule.daysOfWeek, [1, 5]);
  assert.equal(payload.schedule.dayOfWeek, 1);
  assert.equal(payload.status, "todo");
});

test("duration multiplier follows the stat-system thresholds", () => {
  assert.equal(getDurationMultiplier(20), 0.5);
  assert.equal(getDurationMultiplier(30), 1);
  assert.equal(getDurationMultiplier(90), 1);
  assert.equal(getDurationMultiplier(91), 1.5);
});

test("tasks that would touch more than 3 stats are auto-capped instead of rejected", () => {
  const reward = calculateTaskReward({
    title: "Too broad",
    durationMinutes: 60,
    priority: "optional",
    tags: { domain: "social", nature: "creative", intent: "recover" },
  });

  assert.deepEqual(reward.baseStats, { cre: 3, wis: 3, end: 2 });
  assert.deepEqual(reward.omittedStats, ["foc"]);
  assert.deepEqual(reward.reward, { cre: 3, wis: 3, end: 2, exp: 8 });
});
