export function requireNonEmptyText(value, fieldName, { maxLength = 200 } = {}) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  if (normalized.length > maxLength) {
    throw new Error(`${fieldName} exceeds max length ${maxLength}.`);
  }
  return normalized;
}

export function requireAmount(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Amount must be a positive number.");
  }
  return parsed;
}

export function requireEnum(value, options, fieldName) {
  if (!options.includes(value)) {
    throw new Error(`${fieldName} must be one of: ${options.join(", ")}.`);
  }
  return value;
}
