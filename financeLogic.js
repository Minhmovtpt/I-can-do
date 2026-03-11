export function calculateBalance(transactions = {}) {
  return Object.values(transactions).reduce((sum, tx) => {
    const sign = tx.type === "expense" ? -1 : 1;
    return sum + sign * Number(tx.amount || 0);
  }, 0);
}
