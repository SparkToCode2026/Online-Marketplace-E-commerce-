import { useEffect, useRef, useState } from "react";
import { apiFetch, formatOMR } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";

// A payment as returned by GET /Payment/all.
interface Payment {
  paymentId: number;
  orderId: number;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
}

// GET /Payment/summary — grand total, count, and the per-method breakdown.
interface MethodRevenue {
  method: string;
  count: number;
  totalAmount: number;
}
interface PaymentSummary {
  totalCollected: number;
  totalCount: number;
  byMethod: MethodRevenue[];
}

// Method options offered by the filter bar (matches what the checkout writes).
const PAYMENT_METHODS = ["Card", "Cash"];

// The statuses a payment can move through. Free text on the backend; "Completed"
// is special — it flips the linked order to "Confirmed" and blocks deletion.
const PAYMENT_STATUSES = ["Pending", "Completed", "Refunded"];

// Admin "Payments" tab: revenue-by-method summary, then every payment with an
// inline status editor and delete. Rendered inside the admin-guarded page.
export default function AdminPayments() {
  const toast = useToast();
  const confirm = useConfirm();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Server-side filters (GET /Payment/filter).
  const [fStatus, setFStatus] = useState("");
  const [fMethod, setFMethod] = useState("");
  const [fMin, setFMin] = useState("");
  const [fMax, setFMax] = useState("");

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-query whenever a filter changes, debounced for the amount inputs.
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fStatus, fMethod, fMin, fMax]);

  async function loadSummary() {
    try {
      setSummary((await apiFetch("/Payment/summary")) as PaymentSummary);
    } catch {
      setSummary(null);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fStatus) params.set("status", fStatus);
      if (fMethod) params.set("method", fMethod);
      if (fMin) params.set("minAmount", fMin);
      if (fMax) params.set("maxAmount", fMax);
      const qs = params.toString();
      const all = (await apiFetch(`/Payment/filter${qs ? `?${qs}` : ""}`)) as Payment[];
      all.sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt));
      setPayments(all);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // After a mutation, refresh both the table and the summary tiles.
  function reload() {
    load();
    loadSummary();
  }

  async function changeStatus(p: Payment, status: string) {
    try {
      await apiFetch(`/Payment/updateStatus?id=${p.paymentId}&status=${status}`, "PATCH");
      setPayments((prev) =>
        prev.map((x) => (x.paymentId === p.paymentId ? { ...x, status } : x)),
      );
      toast(`Payment #${p.paymentId} → ${status}`, "success");
      loadSummary();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(p: Payment) {
    const ok = await confirm(
      `Delete payment #${p.paymentId}? It's hidden from every view but kept on record.`,
      { title: "Delete payment", confirmLabel: "Delete" },
    );
    if (!ok) return;
    try {
      // Soft-delete on the backend; returns 409 when the payment is "Completed".
      await apiFetch(`/Payment/delete?id=${p.paymentId}`, "DELETE");
      toast(`Payment #${p.paymentId} deleted.`, "info");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (loading) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div>
      {/* --- Revenue-by-method summary cards --- */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-ink p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/70">Total collected</p>
          <p className="mt-1 text-xl font-bold">{formatOMR(summary?.totalCollected ?? 0)}</p>
          <p className="mt-1 text-xs text-white/60">{summary?.totalCount ?? 0} payments</p>
        </div>
        {(summary?.byMethod ?? []).map((r) => (
          <div key={r.method} className="rounded-2xl bg-white/60 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-ink/40">{r.method}</p>
            <p className="mt-1 text-xl font-bold text-ink">{formatOMR(r.totalAmount)}</p>
            <p className="mt-1 text-xs text-ink/40">{r.count} payments</p>
          </div>
        ))}
      </div>

      {/* --- Filters (GET /Payment/filter) --- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        >
          <option value="">All statuses</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={fMethod}
          onChange={(e) => setFMethod(e.target.value)}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        >
          <option value="">All methods</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          value={fMin}
          onChange={(e) => setFMin(e.target.value)}
          placeholder="Min amount"
          className="w-32 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <input
          type="number"
          min={0}
          value={fMax}
          onChange={(e) => setFMax(e.target.value)}
          placeholder="Max amount"
          className="w-32 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <span className="text-sm text-ink/50">{payments.length} shown</span>
      </div>

      {/* --- Payments table --- */}
      <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent-100 text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Paid at</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {payments.map((p) => (
              <tr key={p.paymentId} className="hover:bg-ink/5">
                <td className="px-4 py-3 font-medium text-ink">#{p.paymentId}</td>
                <td className="px-4 py-3 text-ink/50">#{p.orderId}</td>
                <td className="px-4 py-3 font-medium">{formatOMR(p.amount)}</td>
                <td className="px-4 py-3 text-ink/50">{p.method}</td>
                <td className="px-4 py-3 text-ink/50">
                  {new Date(p.paidAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    onChange={(e) => changeStatus(p, e.target.value)}
                    className="rounded-full border border-ink/15 px-2 py-1 text-xs outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                  >
                    {/* Keep an unknown saved status visible instead of snapping. */}
                    {!PAYMENT_STATUSES.includes(p.status) && (
                      <option value={p.status}>{p.status}</option>
                    )}
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => remove(p)}
                      className="rounded-full border border-accent-200 px-2.5 py-1 text-xs font-medium text-accent-700 hover:bg-accent-100"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/40">
                  No payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
