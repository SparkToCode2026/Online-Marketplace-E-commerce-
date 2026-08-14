import { useEffect, useRef, useState } from "react";
import { apiFetch, formatOMR } from "../api";
import { useToast } from "./Toast";

// A payment as returned by GET /Payment/all.
interface Payment {
  paymentId: number;
  orderId: number;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
}

// One row from GET /Payment/revenueByMethod.
interface MethodRevenue {
  method: string;
  totalAmount: number;
}

// The statuses a payment can move through. Free text on the backend; "Completed"
// is special — it flips the linked order to "Confirmed" and blocks deletion.
const PAYMENT_STATUSES = ["Pending", "Completed", "Refunded"];

// Admin "Payments" tab: revenue-by-method summary, then every payment with an
// inline status editor and delete. Rendered inside the admin-guarded page.
export default function AdminPayments() {
  const toast = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [revenue, setRevenue] = useState<MethodRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [all, byMethod] = await Promise.all([
        apiFetch("/Payment/all") as Promise<Payment[]>,
        apiFetch("/Payment/revenueByMethod") as Promise<MethodRevenue[]>,
      ]);
      all.sort((a, b) => +new Date(b.paidAt) - +new Date(a.paidAt));
      setPayments(all);
      setRevenue(byMethod);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(p: Payment, status: string) {
    try {
      await apiFetch(`/Payment/updateStatus?id=${p.paymentId}&status=${status}`, "PATCH");
      setPayments((prev) =>
        prev.map((x) => (x.paymentId === p.paymentId ? { ...x, status } : x)),
      );
      toast(`Payment #${p.paymentId} → ${status}`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(p: Payment) {
    if (!confirm(`Delete payment #${p.paymentId}?`)) return;
    try {
      // Backend returns 409 when the payment status is "Completed"; surface it.
      await apiFetch(`/Payment/delete?id=${p.paymentId}`, "DELETE");
      toast(`Payment #${p.paymentId} deleted.`, "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const totalRevenue = revenue.reduce((s, r) => s + r.totalAmount, 0);

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      {/* --- Revenue-by-method summary cards --- */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-gray-900 p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-gray-300">Total collected</p>
          <p className="mt-1 text-xl font-bold">{formatOMR(totalRevenue)}</p>
          <p className="mt-1 text-xs text-gray-400">{payments.length} payments</p>
        </div>
        {revenue.map((r) => (
          <div key={r.method} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-400">{r.method}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{formatOMR(r.totalAmount)}</p>
          </div>
        ))}
      </div>

      {/* --- Payments table --- */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
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
          <tbody className="divide-y divide-gray-100">
            {payments.map((p) => (
              <tr key={p.paymentId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">#{p.paymentId}</td>
                <td className="px-4 py-3 text-gray-500">#{p.orderId}</td>
                <td className="px-4 py-3 font-medium">{formatOMR(p.amount)}</td>
                <td className="px-4 py-3 text-gray-500">{p.method}</td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(p.paidAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={p.status}
                    onChange={(e) => changeStatus(p, e.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                      className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
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
