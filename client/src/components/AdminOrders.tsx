import { useEffect, useRef, useState } from "react";
import { apiFetch, formatOMR } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { TrashIcon } from "./icons";
import { ORDER_STATUSES } from "./OrderStatusBadge";

// One order row in the admin table. Same "flat" shape the /Order/all endpoint
// returns — line items carry productId/quantity/unitPrice only.
interface OrderItem {
  quantity: number;
}
interface Order {
  orderId: number;
  userId: number;
  status: string;
  orderDate: string;
  totalAmount: number;
  orderItems?: OrderItem[];
}

// One bucket from /Order/stats: how many orders sit in a given status and how
// much revenue they represent.
interface StatusStat {
  status: string;
  orderCount: number;
  totalRevenue: number;
}

// GET /Order/stats — grand totals plus the per-status breakdown.
interface OrderStats {
  totalSales: number;
  totalOrders: number;
  byStatus: StatusStat[];
}

// Admin "Orders" tab: a revenue-by-status summary on top, then every order in a
// table where the admin can change each order's status inline. Rendered inside
// the Admin page (see Admin.tsx), which already enforces the admin-only guard.
export default function AdminOrders() {
  const toast = useToast();
  const confirm = useConfirm();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Server-side filters (GET /Order/filter).
  const [fStatus, setFStatus] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fUserId, setFUserId] = useState("");

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-query the list whenever a filter changes, debounced so typing a user id
  // or date doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fStatus, fFrom, fTo, fUserId]);

  async function loadStats() {
    try {
      setStats((await apiFetch("/Order/stats")) as OrderStats);
    } catch {
      setStats(null);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fStatus) params.set("status", fStatus);
      if (fFrom) params.set("from", fFrom);
      if (fTo) params.set("to", fTo);
      if (fUserId) params.set("userId", fUserId);
      const qs = params.toString();
      const rawOrders = (await apiFetch(`/Order/filter${qs ? `?${qs}` : ""}`)) as Order[];
      rawOrders.sort((a, b) => +new Date(b.orderDate) - +new Date(a.orderDate));
      setOrders(rawOrders);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Change one order's status. We send the change to the server first, and only
  // touch local state after it succeeds — so a failed request never leaves the
  // UI showing a status the database didn't actually save. Revenue is grouped
  // by status, so we refresh the stats afterwards too.
  async function changeStatus(order: Order, status: string) {
    try {
      await apiFetch(`/Order/updateStatus?id=${order.orderId}&status=${status}`, "PUT");
      setOrders((prev) =>
        prev.map((o) => (o.orderId === order.orderId ? { ...o, status } : o)),
      );
      toast(`Order #${order.orderId} → ${status}`, "success");
      // Reload just the revenue buckets; the order list is already up to date.
      loadStats();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  // Delete an order. The backend blocks deletion once a payment exists (409),
  // so a failed request surfaces that message via the toast. Drop the row from
  // local state only after the server confirms, and refresh the revenue buckets.
  async function deleteOrder(order: Order) {
    if (!(await confirm(`Delete order #${order.orderId}? This can't be undone.`))) return;
    try {
      await apiFetch(`/Order/delete?id=${order.orderId}`, "DELETE");
      setOrders((prev) => prev.filter((o) => o.orderId !== order.orderId));
      toast(`Order #${order.orderId} deleted.`, "info");
      loadStats();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (loading && !stats) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div>
      {/* --- Revenue summary cards (one per status + a grand total) --- */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-ink p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/70">Total revenue</p>
          <p className="mt-1 text-xl font-bold">{formatOMR(stats?.totalSales ?? 0)}</p>
          <p className="mt-1 text-xs text-white/60">{stats?.totalOrders ?? 0} orders</p>
        </div>
        {(stats?.byStatus ?? []).map((s) => (
          <div key={s.status} className="rounded-2xl bg-white/60 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-ink/40">{s.status}</p>
            <p className="mt-1 text-xl font-bold text-ink">{formatOMR(s.totalRevenue)}</p>
            <p className="mt-1 text-xs text-ink/40">{s.orderCount} orders</p>
          </div>
        ))}
      </div>

      {/* --- Filters (GET /Order/filter) --- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-ink/50">
          From
          <input
            type="date"
            value={fFrom}
            onChange={(e) => setFFrom(e.target.value)}
            className="rounded-full border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-ink/50">
          To
          <input
            type="date"
            value={fTo}
            onChange={(e) => setFTo(e.target.value)}
            className="rounded-full border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
          />
        </label>
        <input
          type="number"
          min={1}
          value={fUserId}
          onChange={(e) => setFUserId(e.target.value)}
          placeholder="User id"
          className="w-28 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <span className="text-sm text-ink/50">{orders.length} shown</span>
      </div>

      {/* --- Orders table --- */}
      <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent-100 text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {orders.map((o) => (
              <tr key={o.orderId} className="hover:bg-ink/5">
                <td className="px-4 py-3 font-medium text-ink">#{o.orderId}</td>
                <td className="px-4 py-3 text-ink/50">#{o.userId}</td>
                <td className="px-4 py-3 text-ink/50">
                  {new Date(o.orderDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-ink/50">
                  {(o.orderItems ?? []).reduce((s, it) => s + it.quantity, 0)}
                </td>
                <td className="px-4 py-3 font-medium">{formatOMR(o.totalAmount)}</td>
                <td className="px-4 py-3">
                  {/* Inline status editor — the whole point of the admin view. */}
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o, e.target.value)}
                    className="rounded-full border border-ink/15 px-2 py-1 text-xs outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                  >
                    {/* A saved status could be something not in our list (older
                        data). Show it as an extra option so the select still
                        reflects reality instead of silently snapping to Pending. */}
                    {!ORDER_STATUSES.includes(o.status) && (
                      <option value={o.status}>{o.status}</option>
                    )}
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => deleteOrder(o)}
                      title="Delete order"
                      aria-label={`Delete order #${o.orderId}`}
                      className="rounded-full p-1.5 text-ink/30 transition hover:bg-accent-100 hover:text-accent-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/40">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
