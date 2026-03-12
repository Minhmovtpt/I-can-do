import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateBalance,
  calculateFinanceTotals,
  materializeRecurringTransactions,
} from "../src/core/financeLogic.js";

test("calculateBalance sums income and subtracts expenses", () => {
  const transactions = {
    a: { amount: 100, type: "income" },
    b: { amount: 30, type: "expense" },
    c: { amount: 15, type: "income" },
  };

  assert.equal(calculateBalance(transactions), 85);
});

test("calculateFinanceTotals returns income and outcome totals", () => {
  const totals = calculateFinanceTotals({
    a: { amount: 100, type: "income" },
    b: { amount: 40, type: "expense" },
    c: { amount: 10, type: "expense" },
  });

  assert.deepEqual(totals, { income: 100, expense: 50 });
});

test("materializeRecurringTransactions generates current month synthetic rows", () => {
  const base = {
    salary: {
      amount: 1000,
      type: "income",
      recurringMonthly: true,
      date: new Date("2026-01-05").getTime(),
    },
  };

  const output = materializeRecurringTransactions(base, new Date("2026-03-20").getTime());
  assert.equal(Object.keys(output).length, 2);
  assert.ok(output["salary__rec__2026-03"]);
});
