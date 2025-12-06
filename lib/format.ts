// lib/format.ts

/**
 * Format AUD currency as "A$1,234.56"
 */
export function formatCurrencyAUD(
  value: number,
  opts?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = opts ?? {};

  return `A$${value.toLocaleString('en-AU', {
    minimumFractionDigits,
    maximumFractionDigits,
  })}`;
}

/**
 * Helper to format percentage change for display.
 * Returns e.g. "12.3%" or "—" if null/undefined/NaN.
 */
export function formatPercent(change: number | null | undefined): string {
  if (change == null || Number.isNaN(change)) return '—';
  return `${change.toFixed(1)}%`;
}
