"use client";

import Papa from "papaparse";
import {
  useState,
  ChangeEvent,
  DragEvent,
} from "react";
import parseCsv, { ParsedRow, CsvRow } from "./parseCsv";
import uploadCsv from "./uploadCsv";
import { useToast } from "@/components/ui/toast";

type ImportCsvModalProps = {
  cafeId: string;
  onClose: () => void;
  onUploaded: () => void;
};

export default function ImportCsvModal({
  cafeId,
  onClose,
  onUploaded,
}: ImportCsvModalProps) {

  const { showToast } = useToast();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // success toast + button animation
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [justImported, setJustImported] = useState(false);

  // --- helpers --------------------------------------------------------

  function processFile(file: File) {
    setFileName(file.name);
    setErrors([]);
    setRows([]);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const { validRows, validationErrors } = parseCsv(result.data);
        setRows(validRows);
        setErrors(validationErrors);
      },
    });
  }

  function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  }

  async function handleSave() {
    if (!rows.length) {
      setErrors(["No valid rows to import."]);
      return;
    }

    setSaving(true);

    const { error } = await uploadCsv(cafeId, rows);

    setSaving(false);

    if (error) {
      console.error("CSV upload error:", error);
      showToast("Failed to upload CSV. Please check your file and try again.", "error");
      return;
    }

    showToast(`Imported ${rows.length} days of sales.`, "success");
    onUploaded();
  }

  // --- render ---------------------------------------------------------

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-3">
      <div className="w-full max-w-3xl max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-4 md:p-6 shadow-xl">
        {/* Toast */}
        {toast && (
          <div className="absolute top-3 right-3">
            <div
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs shadow-lg transform transition-all ${
                toast.type === "success"
                  ? "bg-emerald-600 text-emerald-50"
                  : "bg-red-600 text-red-50"
              }`}
            >
              <span
                className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  toast.type === "success"
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              >
                ✓
              </span>
              <span>{toast.message}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              Import sales from CSV
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Upload a CSV with one row per day. We’ll validate before
              saving.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Close
          </button>
        </div>

        {/* File chooser + drag-and-drop */}
        <div
          className={`space-y-2 mb-4 rounded-lg border p-4 transition-colors ${
            isDragging
              ? "border-sky-500 bg-sky-500/10"
              : "border-slate-800 bg-slate-900/40"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="text-xs font-medium text-slate-300">
            CSV file
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-xs font-medium text-slate-100 cursor-pointer hover:bg-slate-800">
              <span>Choose file</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>

            <span className="text-xs text-slate-400 truncate max-w-xs">
              {fileName ?? "No file chosen"}
            </span>

            <span className="ml-auto text-[11px] text-slate-500">
              Drag &amp; drop a CSV here, or click “Choose file”.
            </span>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed">
            <div className="mt-2 space-y-1 text-[11px] text-slate-400">
            <div>
                <span className="font-medium text-slate-300">Expected columns:</span>{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-900/70 border border-slate-700/70">
                sale_date, total_revenue, total_transactions, cash_revenue, card_revenue, notes
                </code>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-medium text-slate-300">Date formats:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/80">
                <code>YYYY-MM-DD</code>
                <span className="ml-1 text-[10px] text-slate-500">(2025-10-31)</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700/80">
                <code>DD/MM/YYYY</code>
                <span className="ml-1 text-[10px] text-slate-500">(31/10/2025)</span>
                </span>
            </div>

            <div>
                <span className="font-medium text-slate-300">Revenue values:</span>{' '}
                use plain numbers (e.g. <code>400</code>, not <code>$400</code>).
            </div>
            </div>
          </div>

        </div>

        {/* Errors – highlighted in red */}
        {errors.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/5 p-3">
            <p className="text-xs font-semibold text-red-300 mb-1">
              Some rows could not be imported:
            </p>
            <ul className="text-[11px] text-red-100 list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
              {errors.slice(0, 10).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {errors.length > 10 && (
                <li>…and {errors.length - 10} more.</li>
              )}
            </ul>
          </div>
        )}

        {/* Preview table (valid rows) */}
        {rows.length > 0 && (
          <div className="mb-4 border border-slate-800 rounded-lg bg-slate-900/60 p-3">
            <p className="text-xs text-slate-300 mb-2">
              Previewing first {Math.min(rows.length, 5)} of {rows.length}{" "}
              valid rows:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-left border-collapse">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-1 pr-2">Date</th>
                    <th className="py-1 pr-2">Total</th>
                    <th className="py-1 pr-2">Tx</th>
                    <th className="py-1 pr-2">Cash</th>
                    <th className="py-1 pr-2">Card</th>
                    <th className="py-1 pr-2">Notes</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-900 last:border-0"
                    >
                      <td className="py-1 pr-2 whitespace-nowrap">
                        {row.sale_date}
                      </td>
                      <td className="py-1 pr-2">
                        ${row.total_revenue.toFixed(2)}
                      </td>
                      <td className="py-1 pr-2">
                        {row.total_transactions ?? "—"}
                      </td>
                      <td className="py-1 pr-2">
                        {row.cash_revenue != null
                          ? `$${row.cash_revenue.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-1 pr-2">
                        {row.card_revenue != null
                          ? `$${row.card_revenue.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-1 pr-2 max-w-[150px] truncate">
                        {row.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <p className="text-[11px] text-slate-500">
            {rows.length === 0
              ? "Select a CSV file to begin."
              : `Ready to import ${rows.length} valid row${
                  rows.length === 1 ? "" : "s"
                }.`}
          </p>

          <div className="space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || rows.length === 0}
              className={`px-4 py-1.5 rounded-md text-xs font-medium disabled:opacity-60 transition-colors ${
                justImported
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-sky-600 hover:bg-sky-500"
              }`}
            >
              {saving
                ? "Importing…"
                : justImported
                ? "Imported!"
                : "Import CSV"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
