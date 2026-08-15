import { useEffect, useRef, useState } from "react";
import { apiFetch, formatOMR } from "../api";
import { useToast } from "./Toast";
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

// One bucket from /Order/statsByStatus: how many orders sit in a given status
// and how much revenue they represent.
interface StatusStat {
  status: string;
  orderCount: number;
  totalRevenue: number;
}

// Admin "Orders" tab: a revenue-by-status summary on top, then every order in a
// table where the admin can change each order's status inline. Rendered inside
// the Admin page (see Admin.tsx), which already enforces the admin-only guard.
export default function AdminOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<StatusStat[]>([]);
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
      // Orders (newest first) and the revenue rollup are independent — fetch
      // them together.
      const [rawOrders, rawStats] = await Promise.all([
        apiFetch("/Order/all") as Promise<Order[]>,
        apiFetch("/Order/statsByStatus") as Promise<StatusStat[]>,
      ]);
      rawOrders.sort((a, b) => +new Date(b.orderDate) - +new Date(a.orderDate));
      setOrders(rawOrders);
      setStats(rawStats);
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
      apiFetch("/Order/statsByStatus")
        .then((d) => setStats(d as StatusStat[]))
        .catch(() => {});
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  // Grand total across every status bucket — the headline revenue number.
  const totalRevenue = stats.reduce((s, x) => s + x.totalRevenue, 0);

  if (loading) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div>
      {/* --- Revenue summary cards (one per status + a grand total) --- */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-ink p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/70">Total revenue</p>
          <p className="mt-1 text-xl font-bold">{formatOMR(totalRevenue)}</p>
          <p className="mt-1 text-xs text-white/60">{orders.length} orders</p>
        </div>
        {stats.map((s) => (
          <div key={s.status} className="rounded-2xl bg-white/60 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-ink/40">{s.status}</p>
            <p className="mt-1 text-xl font-bold text-ink">{formatOMR(s.totalRevenue)}</p>
            <p className="mt-1 text-xs text-ink/40">{s.orderCount} orders</p>
          </div>
        ))}
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
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/40">
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
