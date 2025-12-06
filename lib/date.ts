import { format, parseISO, addDays, startOfDay } from "date-fns";

/**
 * Safely parse an ISO YYYY-MM-DD (or full ISO timestamp)
 * Always returns a clean Date at local midnight.
 */
export function parseDate(dateStr: string): Date {
  try {
    return startOfDay(parseISO(dateStr));
  } catch {
    return new Date(dateStr);
  }
}

/**
 * Format a date as dd/MM/yyyy (AU cafe-friendly)
 */
export function formatDateAU(date: Date | string): string {
  const d = typeof date === "string" ? parseDate(date) : date;
  return format(d, "dd/MM/yyyy");
}

/**
 * Format short label for charts → e.g. "12 Jan"
 */
export function formatShortLabel(date: Date | string): string {
  const d = typeof date === "string" ? parseDate(date) : date;
  return format(d, "d MMM");
}
/**
 * Convert Date → "YYYY-MM-DD"
 */
export function toYMD(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Add days (safe / timezone-resistant)
 */
export function addDaysSafe(date: Date, amount: number): Date {
  return addDays(date, amount);
}

/**
 * Get day index (0–6)
 */
export function weekday(date: Date | string): number {
  const d = typeof date === "string" ? parseDate(date) : date;
  return d.getDay();
}
