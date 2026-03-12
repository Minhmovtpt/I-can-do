export function calculateBalance(transactions = {}) {
  return Object.values(transactions).reduce((sum, tx) => {
    const sign = tx.type === "expense" ? -1 : 1;
    return sum + sign * Number(tx.amount || 0);
  }, 0);
}

export function calculateFinanceTotals(transactions = {}) {
  return Object.values(transactions).reduce(
    (acc, tx) => {
      const amount = Number(tx.amount || 0);
      if (tx.type === "expense") acc.expense += amount;
      else acc.income += amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );
}

function monthKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function materializeRecurringTransactions(transactions = {}, now = Date.now()) {
  const currentMonth = monthKey(now);
  const expanded = { ...transactions };

  Object.entries(transactions).forEach(([id, tx]) => {
    if (!tx.recurringMonthly) return;
    const sourceDate = Number(tx.date || 0);
    if (!sourceDate) return;

    const source = new Date(sourceDate);
    const current = new Date(now);
    const months =
      (current.getFullYear() - source.getFullYear()) * 12 +
      (current.getMonth() - source.getMonth());

    for (let i = 1; i <= months; i += 1) {
      const copyDate = new Date(
        source.getFullYear(),
        source.getMonth() + i,
        source.getDate(),
      ).getTime();
      if (monthKey(copyDate) !== currentMonth) continue;
      expanded[`${id}__rec__${currentMonth}`] = {
        ...tx,
        recurringGenerated: true,
        date: copyDate,
      };
    }
  });

  return expanded;
}
