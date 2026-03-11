import { financeApi } from "../core/firebase.js";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  syncBalance
} from "../services/financeService.js";
import { calculateBalance } from "../core/financeLogic.js";

function buildActions(actions) {
  const wrap = document.createElement("div");
  wrap.className = "item-actions";
  actions.forEach(({ label, onClick, className }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.className = className || "";
    btn.addEventListener("click", onClick);
    wrap.appendChild(btn);
  });
  return wrap;
}

export function initFinance(elements, notifyError) {
  async function addTransaction() {
    try {
      await createTransaction({ amount: elements.amountInput.value, type: elements.typeInput.value });
      elements.amountInput.value = "";
    } catch (error) {
      notifyError(error, "Failed to add transaction");
    }
  }

  async function editTransaction(txId, tx) {
    const nextAmount = prompt("Edit amount:", String(tx.amount));
    if (nextAmount === null) return;

    try {
      await updateTransaction(txId, { amount: nextAmount, type: tx.type });
    } catch (error) {
      notifyError(error, "Failed to update transaction");
    }
  }

  elements.addTransactionBtn.addEventListener("click", addTransaction);

  const unsubscribe = financeApi.subscribeTransactions(async (transactions) => {
    elements.transactionList.innerHTML = "";
    const rows = transactions ? Object.entries(transactions) : [];

    rows
      .sort(([, a], [, b]) => (b.date || 0) - (a.date || 0))
      .forEach(([id, tx]) => {
        const li = document.createElement("li");
        const text = document.createElement("span");
        text.textContent = `${tx.type}: ${tx.amount}`;
        li.appendChild(text);
        li.appendChild(
          buildActions([
            { label: "Edit", onClick: () => editTransaction(id, tx) },
            {
              label: "Delete",
              className: "btn-danger",
              onClick: () => deleteTransaction(id).catch((e) => notifyError(e, "Failed to delete transaction"))
            }
          ])
        );
        elements.transactionList.appendChild(li);
      });

    const balance = calculateBalance(transactions || {});
    elements.balance.textContent = balance;

    try {
      await syncBalance(transactions || {});
    } catch (error) {
      notifyError(error, "Failed to sync balance");
    }
  });

  return unsubscribe;
}
