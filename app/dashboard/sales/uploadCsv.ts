// app/dashboard/sales/uploadCsv.ts
import { supabase } from "@/lib/supabaseClient";
import type { ParsedRow } from "./parseCsv";

export default async function uploadCsv(
  cafeId: string,
  rows: ParsedRow[]
) {
  // Shape rows for the `sales` table
  const payload = rows.map((r) => ({
    cafe_id: cafeId,
    sale_date: r.sale_date,                 // currently whatever parseCsv gives you
    total_revenue: r.total_revenue,
    total_transactions: r.total_transactions,
    cash_revenue: r.cash_revenue,
    card_revenue: r.card_revenue,
    notes: r.notes ?? null,
  }));

  // Bulk INSERT (no upsert)
  const { data, error } = await supabase
    .from("sales")
    .insert(payload)
    .select("*");

  if (error) {
    // Better logging so we can see *what* Postgres/RLS is complaining about
    console.error("CSV upload error:", {
      message: (error as any).message,
      code: (error as any).code,
      details: (error as any).details,
      hint: (error as any).hint,
    });
  }

  return { data, error };
}
