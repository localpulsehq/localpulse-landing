// app/dashboard/sales/parseCsv.ts

export type CsvRow = {
  sale_date?: string;
  total_revenue?: string;
  total_transactions?: string;
  cash_revenue?: string;
  card_revenue?: string;
  notes?: string;
};

export type ParsedRow = {
  sale_date: string; // ISO yyyy-mm-dd
  total_revenue: number;
  total_transactions: number | null;
  cash_revenue: number | null;
  card_revenue: number | null;
  notes: string | null;
};

/**
 * Convert various text date formats into ISO yyyy-mm-dd.
 * Supports:
 *   - 2025-10-31
 *   - 31/10/2025 or 31-10-2025 (day-first, AU style)
 */
function normaliseDate(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  // Already ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Day-first dd/mm/yyyy or dd-mm-yyyy
  const m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/.exec(raw);
  if (m) {
    const day = m[1].padStart(2, "0");
    const month = m[2].padStart(2, "0");
    let year = m[3];
    if (year.length === 2) {
      // Naive pivot for 2-digit years, adjust if you care
      year = Number(year) >= 70 ? "19" + year : "20" + year;
    }
    // Basic sanity: 1–31, 1–12
    const dNum = Number(day);
    const mNum = Number(month);
    if (dNum < 1 || dNum > 31 || mNum < 1 || mNum > 12) return null;

    return `${year}-${month}-${day}`; // ISO for Postgres
  }

  // Unrecognised format
  return null;
}

export default function parseCsv(data: CsvRow[]): {
  validRows: ParsedRow[];
  validationErrors: string[];
} {
  const validRows: ParsedRow[] = [];
  const validationErrors: string[] = [];

  data.forEach((row, index) => {
    const rowNum = index + 1;

    if (!row.sale_date || !row.total_revenue) {
      validationErrors.push(`Row ${rowNum}: Missing date or total revenue`);
      return;
    }

    const isoDate = normaliseDate(row.sale_date);
    if (!isoDate) {
      validationErrors.push(
        `Row ${rowNum}: Invalid date format "${row.sale_date}". Use DD/MM/YYYY or YYYY-MM-DD.`
      );
      return;
    }

    const total = Number(row.total_revenue);
    const tx = row.total_transactions ? Number(row.total_transactions) : null;
    const cash = row.cash_revenue ? Number(row.cash_revenue) : null;
    const card = row.card_revenue ? Number(row.card_revenue) : null;

    if (Number.isNaN(total)) {
      validationErrors.push(
        `Row ${rowNum}: total_revenue is not a number ("${row.total_revenue}")`
      );
      return;
    }

    validRows.push({
      sale_date: isoDate,
      total_revenue: total,
      total_transactions: tx,
      cash_revenue: cash,
      card_revenue: card,
      notes: row.notes?.trim() || null,
    });
  });

  return { validRows, validationErrors };
}
