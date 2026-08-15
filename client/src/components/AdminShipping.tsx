import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";

// A shipping record as returned by GET /Shipping/all.
interface Shipping {
  shippingId: number;
  orderId: number;
  address: string;
  status: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

// Just enough of an order to offer it in the "create shipping" picker.
interface Order {
  orderId: number;
  totalAmount: number;
}

// Shipping lifecycle. Free text on the backend, but these are the meaningful
// steps: "Shipped" stamps shippedAt + emails the buyer; "Delivered" stamps
// deliveredAt, emails the buyer, and flips the parent order to "Completed".
const SHIPPING_STATUSES = ["Preparing", "Shipped", "Delivered"];

// Admin "Shipping" tab: create a shipment for an order, advance its status
// (which triggers the buyer email on the backend), and track delivery time.
export default function AdminShipping() {
  const toast = useToast();
  const confirm = useConfirm();
  const [shipments, setShipments] = useState<Shipping[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [avgDays, setAvgDays] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // "Create shipping" form.
  const [orderId, setOrderId] = useState(0);
  const [address, setAddress] = useState("");
  const [adding, setAdding] = useState(false);

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
      const [ships, ords] = await Promise.all([
        apiFetch("/Shipping/all") as Promise<Shipping[]>,
        apiFetch("/Order/all") as Promise<Order[]>,
      ]);
      ships.sort((a, b) => b.shippingId - a.shippingId);
      setShipments(ships);
      setOrders(ords);

      // The average endpoint 404s when nothing has been delivered yet.
      try {
        const avg = (await apiFetch("/Shipping/avgDeliveryTime")) as {
          averageDeliveryDays: number;
        };
        setAvgDays(avg.averageDeliveryDays);
      } catch {
        setAvgDays(null);
      }
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Orders that don't have a shipping record yet — the only ones worth creating
  // a shipment for (the backend rejects a second one with 409).
  const shippedOrderIds = new Set(shipments.map((s) => s.orderId));
  const unshippedOrders = orders.filter((o) => !shippedOrderIds.has(o.orderId));

  async function create() {
    if (!orderId) return toast("Pick an order.", "info");
    if (!address.trim()) return toast("Enter a shipping address.", "info");
    setAdding(true);
    try {
      await apiFetch("/Shipping/add", "POST", { orderId, address: address.trim() });
      toast(`Shipment created for order #${orderId}.`, "success");
      setOrderId(0);
      setAddress("");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setAdding(false);
    }
  }

  async function changeStatus(s: Shipping, status: string) {
    try {
      // The backend emails the buyer on every status change (and marks the order
      // Completed when Delivered), so a reload keeps timestamps in sync.
      await apiFetch(`/Shipping/updateStatus?id=${s.shippingId}&status=${status}`, "PATCH");
      toast(`Shipment #${s.shippingId} → ${status} (buyer emailed)`, "success");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(s: Shipping) {
    if (!(await confirm(`Delete shipment #${s.shippingId}?`))) return;
    try {
      // Backend returns 409 once a shipment is Delivered; surface that.
      await apiFetch(`/Shipping/delete?id=${s.shippingId}`, "DELETE");
      toast(`Shipment #${s.shippingId} deleted.`, "info");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  if (loading) return <p className="text-sm text-ink/40">Loading…</p>;

  return (
    <div>
      {/* --- Summary + create form --- */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-ink p-4 text-white shadow-sm">
          <p className="text-xs uppercase tracking-wide text-white/70">Avg delivery time</p>
          <p className="mt-1 text-xl font-bold">
            {avgDays === null ? "—" : `${avgDays.toFixed(1)} days`}
          </p>
          <p className="mt-1 text-xs text-white/60">{shipments.length} shipments</p>
        </div>

        <div className="rounded-2xl bg-white/60 p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-bold text-ink">New shipment</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-ink/50">
              Order
              <select
                value={orderId}
                onChange={(e) => setOrderId(Number(e.target.value))}
                className="mt-1 block w-40 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
              >
                <option value={0} disabled>
                  Select…
                </option>
                {unshippedOrders.map((o) => (
                  <option key={o.orderId} value={o.orderId}>
                    #{o.orderId}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1 text-xs text-ink/50">
              Address
              <input
                className="mt-1 block w-full rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                placeholder="123 Main St, Muscat"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <button
              onClick={create}
              disabled={adding}
              className="rounded-full bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/20"
            >
              {adding ? "Adding…" : "Create"}
            </button>
          </div>
          {unshippedOrders.length === 0 && (
            <p className="mt-2 text-xs text-ink/40">Every order already has a shipment.</p>
          )}
        </div>
      </div>

      {/* --- Shipments table --- */}
      <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent-100 text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Shipped</th>
              <th className="px-4 py-3">Delivered</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {shipments.map((s) => (
              <tr key={s.shippingId} className="hover:bg-ink/5">
                <td className="px-4 py-3 font-medium text-ink">#{s.shippingId}</td>
                <td className="px-4 py-3 text-ink/50">#{s.orderId}</td>
                <td className="px-4 py-3 text-ink/50">{s.address}</td>
                <td className="px-4 py-3 text-ink/50">
                  {s.shippedAt ? new Date(s.shippedAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-ink/50">
                  {s.deliveredAt ? new Date(s.deliveredAt).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={s.status ?? "Preparing"}
                    onChange={(e) => changeStatus(s, e.target.value)}
                    className="rounded-full border border-ink/15 px-2 py-1 text-xs outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                  >
                    {s.status && !SHIPPING_STATUSES.includes(s.status) && (
                      <option value={s.status}>{s.status}</option>
                    )}
                    {SHIPPING_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <button
                      onClick={() => remove(s)}
                      className="rounded-full border border-accent-200 px-2.5 py-1 text-xs font-medium text-accent-700 hover:bg-accent-100"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {shipments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/40">
                  No shipments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
