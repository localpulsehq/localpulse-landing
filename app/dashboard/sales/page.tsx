'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ImportCsvModal from './ImportCsvModal'

type SalesRow = {
  id: string;
  sale_date: string;
  total_revenue: number;
  total_transactions: number | null;
  cash_revenue: number | null;
  card_revenue: number | null;
  notes: string | null;
};

type NewSalesRow = {
  saleDate: string;
  totalRevenue: string;
  totalTransactions: string;
  cashRevenue: string;
  cardRevenue: string;
  notes: string;
};

const makeEmptyRow = (date?: string): NewSalesRow => ({
  saleDate: date ?? new Date().toISOString().slice(0, 10),
  totalRevenue: '',
  totalTransactions: '',
  cashRevenue: '',
  cardRevenue: '',
  notes: '',
});


const PAGE_SIZE = 20;

export default function SalesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false); 

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form state
  const [saleDate, setSaleDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [totalRevenue, setTotalRevenue] = useState('');
  const [totalTransactions, setTotalTransactions] = useState('');
  const [cashRevenue, setCashRevenue] = useState('');
  const [cardRevenue, setCardRevenue] = useState('');
  const [notes, setNotes] = useState('');

  // Editing + modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRows, setNewRows] = useState<NewSalesRow[]>([makeEmptyRow()]);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---------- CSV helpers ----------
  function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ---------- helpers ----------
  function resetForm() {
    setSaleDate(new Date().toISOString().slice(0, 10));
    setTotalRevenue('');
    setTotalTransactions('');
    setCashRevenue('');
    setCardRevenue('');
    setNotes('');
    setEditingId(null);
  }

  function openAddModal() {
    // prepare for a new fresh set of rows
    setNewRows([makeEmptyRow()]);
    setSaveError(null);
    
    // open bulk modal, not single-entry one.
    setShowAddModal(true);
  }

  function openEditModal(row: SalesRow) {
    setEditingId(row.id);
    setSaleDate(row.sale_date);
    setTotalRevenue(row.total_revenue.toString());
    setTotalTransactions(row.total_transactions?.toString() ?? '');
    setCashRevenue(row.cash_revenue?.toString() ?? '');
    setCardRevenue(row.card_revenue?.toString() ?? '');
    setNotes(row.notes ?? '');
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingId(null);
  }

  function updateRow(index: number, field: keyof NewSalesRow, value: string) {
  setNewRows(prev => {
    const next = [...prev];
    next[index] = { ...next[index], [field]: value };
    return next;
  });
  }

  function addRow() {
    setNewRows(prev => [...prev, makeEmptyRow()]);
  }

  function removeRow(index: number) {
    setNewRows(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  // fetch first page of sales for given cafe and reset pagination state.
  // used on initial load + after bulk changes
  async function reloadSales(cafeId: string) {
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('cafe_id', cafeId)
      .order('sale_date', {ascending: false})
      .range(0, PAGE_SIZE-1);

      if (salesError) {
        console.error('Failed to load sales', salesError);
        setErrorMessage('Could not load sales data.');
        return;
      }

      setSales(salesData ?? []);
      setPage(0);
      setHasMore((salesData ?? []).length === PAGE_SIZE);
  }

  async function loadSalesForCafe(
    cafeId: string,
    setSales: (rows: SalesRow[]) => void,
    setPage: (p: number) => void,
    setHasMore: (v: boolean) => void,
    setErrorMessage: (msg: string | null) => void
  ) {
    const { data: salesData, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .eq('cafe_id', cafeId)
      .order('sale_date', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (salesError) {
      console.error('Failed to load sales:', salesError);
      setErrorMessage('Could not load sales data.');
      return;
    }

    const rows = salesData ?? [];
    setSales(rows);
    setPage(0);
    setHasMore(rows.length === PAGE_SIZE);
  }

  // ---------- initial load ----------

  useEffect(() => {
    async function load() {
      setErrorMessage(null);
      setLoading(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        setErrorMessage('You must be logged in to view sales.');
        setLoading(false);
        return;
      }

      const user = userData.user;

      const { data: cafeData, error: cafeError } = await supabase
        .from('cafes')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (cafeError || !cafeData) {
        console.error('Failed to load cafe:', cafeError);
        setErrorMessage('Could not load your café.');
        setLoading(false);
        return;
      }

      setCafeId(cafeData.id);

      // first page of sales
      await loadSalesForCafe(
        cafeData.id,
        setSales,
        setPage,
        setHasMore,
        setErrorMessage,
      );

      setLoading(false);
    }

    load();
  }, []);

  // ---------- load more ----------

  async function handleLoadMore() {
    if (!cafeId) return;
    setLoadingMore(true);

    const nextPage = page + 1;
    const from = nextPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('cafe_id', cafeId)
      .order('sale_date', { ascending: false })
      .range(from, to);

    setLoadingMore(false);

    if (error) {
      console.error('Failed to load more sales:', error);
      return;
    }

    setSales(prev => [...prev, ...(data ?? [])]);
    setPage(nextPage);
    setHasMore((data ?? []).length === PAGE_SIZE);
  }

  // ---------- submit (create / update) ----------

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!cafeId) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const totalRevenueNum = Number(totalRevenue);
    if (isNaN(totalRevenueNum) || totalRevenueNum <= 0) {
      setErrorMessage('Total revenue must be a positive number.');
      return;
    }

    const payload = {
      cafe_id: cafeId,
      sale_date: saleDate,
      total_revenue: totalRevenueNum,
      total_transactions: totalTransactions ? Number(totalTransactions) : null,
      cash_revenue: cashRevenue ? Number(cashRevenue) : null,
      card_revenue: cardRevenue ? Number(cardRevenue) : null,
      notes: notes.trim() || null,
    };

    setSaving(true);

    if (editingId) {
      // UPDATE
      const { data, error } = await supabase
        .from('sales')
        .update(payload)
        .eq('id', editingId)
        .select('*')
        .single();

      setSaving(false);

      if (error) {
        console.error('Failed to update sale:', error);
        setErrorMessage('Failed to update sale entry.');
        return;
      }

      if (data) {
        setSales(prev => prev.map(r => (r.id === editingId ? data : r)));
      }

      setSuccessMessage('Changes saved.');
    } else {
      // INSERT
      const { data, error } = await supabase
        .from('sales')
        .insert(payload)
        .select('*')
        .single();

      setSaving(false);

      if (error) {
        console.error('Failed to save sale:', error);

        // Constraint: one row per day
        if ((error as any).code === '23505') {
          setErrorMessage(
            'You already have an entry for this date. Edit it instead of adding another.',
          );
        } else {
          setErrorMessage('Failed to save sale entry.');
        }
        return;
      }

      if (data) {
        // Prepend new sale
        setSales(prev => [data, ...prev]);
      }

      setSuccessMessage('Entry added.');
      resetForm();
    }

    // Small auto-dismiss of success label
    setTimeout(() => setSuccessMessage(null), 2000);
  }

  // handle add entries
  async function handleAddEntries() {
    if (!cafeId) return;
    setSaveError(null);
    setSaving(true);

    // Build payload from all rows that have date + totalRevenue
    const payload = newRows
      .filter(row => row.saleDate && row.totalRevenue)
      .map(row => ({
        cafe_id: cafeId,
        sale_date: row.saleDate,
        total_revenue: Number(row.totalRevenue),
        total_transactions: row.totalTransactions
          ? Number(row.totalTransactions)
          : null,
        cash_revenue: row.cashRevenue ? Number(row.cashRevenue) : null,
        card_revenue: row.cardRevenue ? Number(row.cardRevenue) : null,
        notes: row.notes.trim() || null,
      }));

    if (payload.length === 0) {
      setSaveError('Please fill at least one row with a date and total revenue.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('sales').insert(payload);
    setSaving(false);

    if (error) {
      console.error('Bulk insert failed:', error);
      setSaveError('Failed to save sales entries.');
      return;
    }

    // Reset + close
    setNewRows([makeEmptyRow()]);
    setShowAddModal(false);

    await loadSalesForCafe(
      cafeId, 
      setSales, 
      setPage, 
      setHasMore, 
      setErrorMessage,
    );
}

  // ---------- delete ----------

  async function handleDelete(row: SalesRow) {
    const ok = window.confirm(
      `Delete sales entry for ${row.sale_date}? This cannot be undone.`,
    );
    if (!ok) return;

    const { error } = await supabase.from('sales').delete().eq('id', row.id);
    if (error) {
      console.error('Failed to delete sale:', error);
      setErrorMessage('Failed to delete sale entry.');
      return;
    }

    setSales(prev => prev.filter(r => r.id !== row.id));
    if (editingId === row.id) {
      closeModal();
      resetForm();
    }
  }

  // ---------- export CSV ---------- 
    async function handleExportCsv() {
    if (!cafeId) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Fetch ALL sales for this cafe (not just current page)
    const { data, error } = await supabase
      .from('sales')
      .select(
        'sale_date,total_revenue,total_transactions,cash_revenue,card_revenue,notes',
      )
      .eq('cafe_id', cafeId)
      .order('sale_date', { ascending: true });

    if (error) {
      console.error('Failed to export CSV:', error);
      setErrorMessage('Could not export sales CSV.');
      return;
    }

    const rows = data ?? [];

    if (!rows.length) {
      setErrorMessage('No sales to export yet.');
      return;
    }

    // Header matches the import format
    const header = [
      'sale_date',
      'total_revenue',
      'total_transactions',
      'cash_revenue',
      'card_revenue',
      'notes',
    ];

    const lines: string[] = [];
    lines.push(header.join(','));

    for (const row of rows) {
      const line = [
        escapeCsv(row.sale_date),
        escapeCsv(row.total_revenue),
        escapeCsv(row.total_transactions),
        escapeCsv(row.cash_revenue),
        escapeCsv(row.card_revenue),
        escapeCsv(row.notes),
      ].join(',');
      lines.push(line);
    }

    const csv = lines.join('\r\n');
    downloadCsv('localpulse-sales.csv', csv);
    setSuccessMessage('Sales exported as CSV.');
    setTimeout(() => setSuccessMessage(null), 2000);
  }

  // ---------- render ----------

  if (loading && !sales.length) {
    return (
      <section className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-white rounded animate-pulse" />
            <div className="h-3 w-56 bg-white rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-white rounded-md border border-[#E2E8F0] animate-pulse" />
            <div className="h-8 w-28 bg-white rounded-md border border-[#E2E8F0] animate-pulse" />
          </div>
        </div>

        {/* Table card skeleton */}
        <div className="rounded-xl bg-white lp-card p-4 md:p-5 shadow-sm">
          {/* Table header skeleton */}
          <div className="h-3 w-32 bg-white rounded mb-4 animate-pulse" />

          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[1.2fr_repeat(5,0.8fr)] gap-3 text-xs"
              >
                <div className="h-3 bg-[#F9FBFC] rounded animate-pulse" />
                <div className="h-3 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="h-3 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="h-3 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="h-3 bg-[#E2E8F0] rounded animate-pulse" />
                <div className="flex justify-end">
                  <div className="h-6 w-14 bg-white border border-[#E2E8F0] rounded-md animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Sales</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openAddModal}
            className="px-3 py-1.5 rounded-md bg-[#22C3A6] hover:bg-[#17A98F] text-xs font-medium text-[#0B1220]"
          >
            + Add entries
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="px-3 py-1.5 rounded-md border border-[#E2E8F0] text-xs font-medium text-[#0B1220] bg-white hover:bg-white"
          >
            Import CSV
        </button>
        
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-3 py-1.5 rounded-md bg-white lp-card hover:bg-white text-xs font-medium"
        >
          Export CSV
        </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#E2E8F0] rounded-xl bg-[#F9FBFC] p-3 md:p-4">
        <h3 className="text-sm font-semibold mb-3 text-[#0B1220]">
          Recent entries
        </h3>

        {sales.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">
            No sales recorded yet. Click “Add entry” to log your first day.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto -mx-3 md:mx-0">
              <table className="min-w-[640px] w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-[11px] md:text-xs text-[#94A3B8]">
                    <th className="py-2 px-2 md:px-3 text-left whitespace-nowrap">Date</th>
                    <th className="py-2 px-2 md:px-3 text-left whitespace-nowrap">Total revenue</th>
                    <th className="py-2 px-2 md:px-3 text-left whitespace-nowrap">Transactions</th>
                    <th className="py-2 px-2 md:px-3 text-left whitespace-nowrap">Cash</th>
                    <th className="py-2 px-2 md:px-3 text-left whitespace-nowrap">Card</th>
                    <th className="py-2 px-2 md:px-3 text-left whitespace-nowrap">Notes</th>
                    <th className="py-2 px-2 md:px-3 text-left whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(row => (
                    <tr
                      key={row.id}
                      className="border-b border-[#E2E8F0] last:border-0 text-[#0B1220]"
                    >
                      <td className="py-2 px-2 md:px-3 text-[11px] md:text-sm whitespace-nowrap">
                        {row.sale_date}
                      </td>
                      <td className="py-2 px-2 md:px-3 text-[11px] md:text-sm whitespace-nowrap">
                        ${row.total_revenue.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 md:px-3 text-[11px] md:text-sm whitespace-nowrap">
                        {row.total_transactions ?? '—'}
                      </td>
                      <td className="py-2 px-2 md:px-3 text-[11px] md:text-sm whitespace-nowrap">
                        {row.cash_revenue != null
                          ? `$${row.cash_revenue.toFixed(2)}`
                          : '—'}
                      </td>
                      <td className="py-2 px-2 md:px-3 text-[11px] md:text-sm whitespace-nowrap">
                        {row.card_revenue != null
                          ? `$${row.card_revenue.toFixed(2)}`
                          : '—'}
                      </td>
                      <td className="py-2 px-2 md:px-3 max-w-[120px] md:max-w-xs truncate">
                        {row.notes ?? '—'}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <div className="flex flex-col sm:flex-row gap-1 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => openEditModal(row)}
                            className="text-[11px] sm:text-xs px-2 py-1 rounded-md border border-[#E2E8F0] hover:bg-white"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="text-[11px] sm:text-xs px-2 py-1 rounded-md border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-xs px-3 py-1.5 rounded-md border border-[#E2E8F0] hover:bg-white disabled:opacity-60"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div
            className="
              w-full max-w-lg sm:max-w-3xl 
              max-h-[90vh] overflow-y-auto 
              rounded-xl bg-white border border-[#E2E8F0] 
              p-4 sm:p-6 shadow-xl mx-4
            "
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#0B1220]">
                {editingId ? 'Edit sales entry' : 'Add sales entry'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-xs text-[#94A3B8] hover:text-[#0B1220]"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col text-sm">
                  <label className="mb-1 text-[#94A3B8]">Date</label>
                  <input
                    type="date"
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="rounded-md bg-white border border-[#E2E8F0] px-2 py-1 text-sm outline-none focus:border-[#22C3A6]"
                    required
                  />
                </div>

                <div className="flex flex-col text-sm">
                  <label className="mb-1 text-[#94A3B8]">Total revenue ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={totalRevenue}
                    onChange={e => setTotalRevenue(e.target.value)}
                    className="rounded-md bg-white border border-[#E2E8F0] px-2 py-1 text-sm outline-none focus:border-[#22C3A6]"
                    required
                  />
                </div>

                <div className="flex flex-col text-sm">
                  <label className="mb-1 text-[#94A3B8]">
                    Total transactions
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={totalTransactions}
                    onChange={e => setTotalTransactions(e.target.value)}
                    className="rounded-md bg-white border border-[#E2E8F0] px-2 py-1 text-sm outline-none focus:border-[#22C3A6]"
                  />
                </div>

                <div className="flex flex-col text-sm">
                  <label className="mb-1 text-[#94A3B8]">Cash revenue ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cashRevenue}
                    onChange={e => setCashRevenue(e.target.value)}
                    className="rounded-md bg-white border border-[#E2E8F0] px-2 py-1 text-sm outline-none focus:border-[#22C3A6]"
                  />
                </div>

                <div className="flex flex-col text-sm">
                  <label className="mb-1 text-[#94A3B8]">Card revenue ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cardRevenue}
                    onChange={e => setCardRevenue(e.target.value)}
                    className="rounded-md bg-white border border-[#E2E8F0] px-2 py-1 text-sm outline-none focus:border-[#22C3A6]"
                  />
                </div>
              </div>

              <div className="text-sm">
                <label className="mb-1 block text-[#94A3B8]">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-md bg-white border border-[#E2E8F0] px-2 py-1 text-sm outline-none focus:border-[#22C3A6]"
                  rows={2}
                  placeholder="Optional comments (events, promos, weather, etc.)"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="space-y-1">
                  {errorMessage && (
                    <p className="text-[#EF4444]">{errorMessage}</p>
                  )}
                  {successMessage && (
                    <p className="text-[#22C3A6]">{successMessage}</p>
                  )}
                </div>

                <div className="space-x-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-3 py-1.5 rounded-md border border-[#E2E8F0] text-[#0B1220] hover:bg-white"
                    >
                      Reset
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-3 py-1.5 rounded-md bg-[#22C3A6] hover:bg-[#17A98F] text-xs font-medium text-[#0B1220] disabled:opacity-60"
                  >
                    {saving
                      ? 'Saving…'
                      : editingId
                      ? 'Save changes'
                      : 'Add entry'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div
            className="
              w-full max-w-5xl 
              max-h-[90vh] overflow-y-auto 
              rounded-2xl bg-white border border-[#E2E8F0] 
              p-4 sm:p-6 shadow-xl mx-4
            "
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Add sales entries</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-xs text-[#94A3B8] hover:text-[#0B1220]"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-[#94A3B8] mb-3">
              You can add multiple days at once. Only rows with a date and total revenue
              will be saved.
            </p>

            <div className="-mx-3 md:mx-0 overflow-x-auto">
              <table className="w-full text-xs text-[#0B1220] border-separate border-spacing-y-2">
                <thead className="text-[#94A3B8]">
                  <tr>
                    <th className="text-left px-2">Date</th>
                    <th className="text-left px-2">Total revenue ($)</th>
                    <th className="text-left px-2">Transactions</th>
                    <th className="text-left px-2">Cash ($)</th>
                    <th className="text-left px-2">Card ($)</th>
                    <th className="text-left px-2">Notes</th>
                    <th className="px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {newRows.map((row, index) => (
                    <tr key={index}>
                      <td className="px-2">
                        <input
                          type="date"
                          className="w-full rounded-md bg-white border border-[#E2E8F0] px-2 py-1 outline-none focus:border-[#22C3A6]"
                          value={row.saleDate}
                          onChange={e => updateRow(index, 'saleDate', e.target.value)}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full rounded-md bg-white border border-[#E2E8F0] px-2 py-1 outline-none focus:border-[#22C3A6]"
                          value={row.totalRevenue}
                          onChange={e => updateRow(index, 'totalRevenue', e.target.value)}
                          placeholder="Required"
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          className="w-full rounded-md bg-white border border-[#E2E8F0] px-2 py-1 outline-none focus:border-[#22C3A6]"
                          value={row.totalTransactions}
                          onChange={e =>
                            updateRow(index, 'totalTransactions', e.target.value)
                          }
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full rounded-md bg-white border border-[#E2E8F0] px-2 py-1 outline-none focus:border-[#22C3A6]"
                          value={row.cashRevenue}
                          onChange={e => updateRow(index, 'cashRevenue', e.target.value)}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full rounded-md bg-white border border-[#E2E8F0] px-2 py-1 outline-none focus:border-[#22C3A6]"
                          value={row.cardRevenue}
                          onChange={e => updateRow(index, 'cardRevenue', e.target.value)}
                        />
                      </td>
                      <td className="px-2">
                        <input
                          className="w-full rounded-md bg-white border border-[#E2E8F0] px-2 py-1 outline-none focus:border-[#22C3A6]"
                          value={row.notes}
                          onChange={e => updateRow(index, 'notes', e.target.value)}
                          placeholder="Optional"
                        />
                      </td>
                      <td className="px-2">
                        <button
                          type="button"
                          onClick={() => removeRow(index)}
                          className="text-xs text-[#94A3B8] hover:text-[#EF4444]"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {saveError && (
              <p className="text-xs text-[#EF4444] mt-3">{saveError}</p>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={addRow}
                className="text-xs text-[#22C3A6] hover:text-[#17A98F]"
              >
                + Add row
              </button>

              <button
                type="button"
                onClick={handleAddEntries}
                disabled={saving}
                className="px-4 py-2 rounded-md bg-[#22C3A6] hover:bg-[#17A98F] text-xs font-medium text-[#0B1220] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save all entries'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && cafeId && (
       <ImportCsvModal
        cafeId={cafeId}
        onClose={() => setShowImportModal(false)}
        onUploaded={async () => {
          await loadSalesForCafe(
            cafeId,
            setSales,
            setPage,
            setHasMore,
            setErrorMessage,
          );
          setShowImportModal(false);
        }}
      />
      )}

    </section>
  );
}










