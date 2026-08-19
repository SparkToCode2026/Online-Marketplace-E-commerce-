import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../api";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmDialog";
import { FieldError, fieldRing, isClean, type Errors } from "../lib/formErrors";

// A shipping record as returned by GET /Shipping/all and /Shipping/filter.
interface Shipping {
  shippingId: number;
  orderId: number;
  address: string;
  carrier: string | null;
  city: string | null;
  status: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

// GET /Shipping/stats — per-status counts plus the delivery-time average.
interface ShippingStats {
  total: number;
  byStatus: { status: string | null; count: number }[];
  averageDeliveryDays: number | null;
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
  const [stats, setStats] = useState<ShippingStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Server-side filters (GET /Shipping/filter).
  const [fStatus, setFStatus] = useState("");
  const [fCarrier, setFCarrier] = useState("");
  const [fCity, setFCity] = useState("");

  // "Create shipping" form.
  const [orderId, setOrderId] = useState(0);
  const [address, setAddress] = useState("");
  const [carrier, setCarrier] = useState("");
  const [city, setCity] = useState("");
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<Errors<"orderId" | "address">>({});

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    loadStatic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-query the shipments list whenever a filter changes, debounced so typing
  // a carrier/city doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => load(), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fStatus, fCarrier, fCity]);

  // Orders and stats don't depend on the filters.
  async function loadStatic() {
    try {
      const [ords, st] = await Promise.all([
        apiFetch("/Order/all") as Promise<Order[]>,
        apiFetch("/Shipping/stats") as Promise<ShippingStats>,
      ]);
      setOrders(ords);
      setStats(st);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fStatus) params.set("status", fStatus);
      if (fCarrier.trim()) params.set("carrier", fCarrier.trim());
      if (fCity.trim()) params.set("city", fCity.trim());
      const qs = params.toString();
      const ships = (await apiFetch(`/Shipping/filter${qs ? `?${qs}` : ""}`)) as Shipping[];
      ships.sort((a, b) => b.shippingId - a.shippingId);
      setShipments(ships);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // After a mutation, refresh both the list and the stats tiles.
  function reload() {
    load();
    loadStatic();
  }

  // Orders that don't have a shipping record yet — the only ones worth creating
  // a shipment for (the backend rejects a second one with 409).
  const shippedOrderIds = new Set(shipments.map((s) => s.orderId));
  const unshippedOrders = orders.filter((o) => !shippedOrderIds.has(o.orderId));

  async function create() {
    const errs: Errors<"orderId" | "address"> = {};
    if (!orderId) errs.orderId = "Pick an order.";
    if (!address.trim()) errs.address = "Address is required.";
    setErrors(errs);
    if (!isClean(errs)) return;

    setAdding(true);
    try {
      await apiFetch("/Shipping/add", "POST", {
        orderId,
        address: address.trim(),
        // Optional on the backend; send null rather than an empty string.
        carrier: carrier.trim() || null,
        city: city.trim() || null,
      });
      toast(`Shipment created for order #${orderId}.`, "success");
      setOrderId(0);
      setAddress("");
      setCarrier("");
      setCity("");
      setErrors({});
      reload();
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
      reload();
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
      reload();
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
            {stats?.averageDeliveryDays == null
              ? "—"
              : `${stats.averageDeliveryDays.toFixed(1)} days`}
          </p>
          <p className="mt-1 text-xs text-white/60">{stats?.total ?? 0} shipments total</p>
          {stats && stats.byStatus.length > 0 && (
            <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-white/60">
              {stats.byStatus.map((b) => (
                <span key={b.status ?? "none"}>
                  {b.status ?? "Unset"}: <span className="font-semibold">{b.count}</span>
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white/60 p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-3 font-bold text-ink">New shipment</h3>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-ink/50">
              Order
              <select
                value={orderId}
                onChange={(e) => {
                  setOrderId(Number(e.target.value));
                  if (errors.orderId) setErrors((errs) => ({ ...errs, orderId: undefined }));
                }}
                aria-invalid={!!errors.orderId}
                className={`mt-1 block w-40 rounded-full border px-3 py-2 text-sm outline-none focus:ring-2 ${fieldRing(!!errors.orderId)}`}
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
              <FieldError msg={errors.orderId} />
            </label>
            <label className="flex-1 text-xs text-ink/50">
              Address
              <input
                className={`mt-1 block w-full rounded-full border px-3 py-2 text-sm outline-none focus:ring-2 ${fieldRing(!!errors.address)}`}
                placeholder="123 Main St"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (errors.address) setErrors((errs) => ({ ...errs, address: undefined }));
                }}
                aria-invalid={!!errors.address}
              />
              <FieldError msg={errors.address} />
            </label>
            <label className="text-xs text-ink/50">
              City
              <input
                className="mt-1 block w-32 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                placeholder="Muscat"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </label>
            <label className="text-xs text-ink/50">
              Carrier
              <input
                className="mt-1 block w-32 rounded-full border border-ink/15 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                placeholder="Aramex"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
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

      {/* --- Filters (GET /Shipping/filter) --- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={fStatus}
          onChange={(e) => setFStatus(e.target.value)}
          className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        >
          <option value="">All statuses</option>
          {SHIPPING_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={fCarrier}
          onChange={(e) => setFCarrier(e.target.value)}
          placeholder="Filter by carrier…"
          className="w-44 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <input
          value={fCity}
          onChange={(e) => setFCity(e.target.value)}
          placeholder="Filter by city…"
          className="w-44 rounded-full border border-ink/15 bg-white px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
        />
        <span className="text-sm text-ink/50">{shipments.length} shown</span>
      </div>

      {/* --- Shipments table --- */}
      <div className="overflow-hidden rounded-2xl bg-white/60 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-accent-100 text-xs uppercase text-ink/50">
            <tr>
              <th className="px-4 py-3">Shipment</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Destination</th>
              <th className="px-4 py-3">Carrier</th>
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
                <td className="px-4 py-3 text-ink/50">
                  {s.address}
                  {s.city && <span className="block text-xs text-ink/40">{s.city}</span>}
                </td>
                <td className="px-4 py-3 text-ink/50">{s.carrier || "—"}</td>
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
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-ink/40">
                  No shipments match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
