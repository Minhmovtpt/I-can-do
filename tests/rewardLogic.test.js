import test from "node:test";
import assert from "node:assert/strict";
import { applyRewardLocally, resolveReward } from "../rewardLogic.js";

test("resolveReward normalizes numeric reward values", () => {
  assert.deepEqual(resolveReward({ exp: "20", foc: 5 }), { exp: 20, foc: 5 });
});

test("applyRewardLocally advances levels when exp threshold is exceeded", () => {
  const current = { level: 1, exp: 90, atk: 0, int: 0, disc: 0, cre: 0, end: 0, foc: 0, wis: 0 };
  const { next } = applyRewardLocally(current, { exp: 20 });
  assert.equal(next.level, 2);
  assert.equal(next.exp, 10);
});
