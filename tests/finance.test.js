import test from "node:test";
import assert from "node:assert/strict";
import { calculateBalance } from "../src/core/financeLogic.js";

test("calculateBalance sums income and subtracts expenses", () => {
  const transactions = {
    a: { amount: 100, type: "income" },
    b: { amount: 30, type: "expense" },
    c: { amount: 15, type: "income" }
  };

  assert.equal(calculateBalance(transactions), 85);
});
