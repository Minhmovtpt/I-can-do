import { financeApi } from "../core/firebaseService.js";
import { requireAmount, requireEnum } from "../core/validation.js";

import { calculateBalance } from "../core/financeLogic.js";

export async function createTransaction({ amount, type }) {
  return financeApi.addTransaction({
    amount: requireAmount(amount),
    type: requireEnum(type, ["income", "expense"], "Transaction type"),
    date: Date.now()
  });
}

export async function updateTransaction(txId, { amount, type }) {
  const payload = {
    date: Date.now()
  };

  if (amount !== undefined) {
    payload.amount = requireAmount(amount);
  }

  if (type !== undefined) {
    payload.type = requireEnum(type, ["income", "expense"], "Transaction type");
  }

  return financeApi.updateTransactionById(txId, payload);
}

export async function deleteTransaction(txId) {
  return financeApi.deleteTransactionById(txId);
}

export async function syncBalance(transactions) {
  const balance = calculateBalance(transactions);
  await financeApi.patchFinance({ balance });
  return balance;
}
