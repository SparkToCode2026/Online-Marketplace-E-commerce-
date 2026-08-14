import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { CartIcon } from "../components/icons";

// One line inside an order. The backend maps order items "flat" (see
// OrderItem.ToDtoFlat on the server), which means we only get productId +
// quantity + unitPrice here — NOT the product's name or image. We fill those in
// on the client from a separate /Product/all lookup (see `productMap` below).
interface OrderItem {
  orderItemId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
}

interface Order {
  orderId: number;
  userId: number;
  status: string;
  orderDate: string;
  totalAmount: number;
  orderItems?: OrderItem[];
  coupon?: { code: string; discountPercent: number } | null;
}

// What we need from /Product/all to show a name + thumbnail per line item.
interface Product {
  productId: number;
  name: string;
  productUrl: string;
}

// A payment as returned by GET /Payment/all — one per order (if paid at all).
interface Payment {
  paymentId: number;
  orderId: number;
  method: string;
  status: string;
}

// A shipping record as returned by GET /Shipping/all — one per order (if any).
interface Shipping {
  orderId: number;
  status: string | null;
}

// "My Orders" — the customer's own order history.
export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  // productId -> product, so a line item can show "Wireless Mouse" instead of "#42".
  const [productMap, setProductMap] = useState<Record<number, Product>>({});
  // orderId -> its payment, so each card knows whether it's already paid.
  const [paymentByOrder, setPaymentByOrder] = useState<Record<number, Payment>>({});
  // orderId -> its shipping record, so each card can show a delivery status.
  const [shippingByOrder, setShippingByOrder] = useState<Record<number, Shipping>>({});
  // orderId -> the method chosen in its "pay" dropdown (before paying).
  const [method, setMethod] = useState<Record<number, string>>({});
  // The order currently being paid, so we can disable just that button.
  const [payingId, setPayingId] = useState<number | null>(null);

  // Guard against React 18 StrictMode running effects twice in dev: the ref
  // makes sure we only fire the initial load once.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect visitors who aren't signed in — order history is per-account.
  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  async function load() {
    setLoading(true);
    try {
      // Three independent requests, fired together and awaited as a group so the
      // page renders once everything is ready (fewer flickers than chaining them).
      const [rawOrders, rawProducts, rawPayments, rawShipping] = await Promise.all([
        apiFetch("/Order/all") as Promise<Order[]>,
        apiFetch("/Product/all") as Promise<Product[]>,
        apiFetch("/Payment/all") as Promise<Payment[]>,
        apiFetch("/Shipping/all") as Promise<Shipping[]>,
      ]);

      // Build the id -> product lookup once, up front.
      const map: Record<number, Product> = {};
      for (const p of rawProducts) map[p.productId] = p;
      setProductMap(map);

      // Build an orderId -> payment lookup (one payment per order at most).
      const payMap: Record<number, Payment> = {};
      for (const pay of rawPayments) payMap[pay.orderId] = pay;
      setPaymentByOrder(payMap);

      // Build an orderId -> shipping lookup (one shipment per order at most).
      const shipMap: Record<number, Shipping> = {};
      for (const s of rawShipping) shipMap[s.orderId] = s;
      setShippingByOrder(shipMap);

      // /Order/all returns EVERY user's orders (the backend has no "my orders"
      // endpoint yet), so we filter to the logged-in user here. NOTE: this is a
      // display filter, not a security boundary — the API still hands the full
      // list to any signed-in caller. Narrowing that belongs on the server.
      const myId = Number(localStorage.getItem("userId"));
      const mine = rawOrders
        .filter((o) => o.userId === myId)
        // Newest first: sort by date descending.
        .sort((a, b) => +new Date(b.orderDate) - +new Date(a.orderDate));
      setOrders(mine);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  // Pay for an order. The backend requires the amount to EXACTLY equal the
  // order's total, so we send o.totalAmount rather than trusting any input.
  async function pay(o: Order) {
    setPayingId(o.orderId);
    try {
      await apiFetch("/Payment/add", "POST", {
        orderId: o.orderId,
        amount: o.totalAmount,
        method: method[o.orderId] ?? "Card",
        status: "Completed",
      });
      toast(`Payment for order #${o.orderId} recorded.`, "success");
      load();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setPayingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="mx-auto max-w-4xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <CartIcon className="h-6 w-6" />
          My Orders
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : orders.length === 0 ? (
          // Empty state: no orders yet — nudge the user back to the shop.
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <CartIcon className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-500">You haven't placed any orders yet.</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.orderId} className="rounded-2xl bg-white p-5 shadow-sm">
                {/* Card header: order number + date on the left, status + total
                    on the right. Wraps on small screens. */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <p className="font-bold text-gray-900">Order #{o.orderId}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(o.orderDate).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={o.status} />
                    <span className="text-lg font-bold text-gray-900">
                      {formatOMR(o.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Line items. Each row looks up its product in productMap; if
                    the product was since deleted we fall back to its id. */}
                <div className="mt-3 space-y-2">
                  {(o.orderItems ?? []).map((it) => {
                    const p = productMap[it.productId];
                    return (
                      <div key={it.orderItemId} className="flex items-center gap-3 text-sm">
                        <img
                          src={p?.productUrl}
                          alt={p?.name ?? ""}
                          onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                          className="h-10 w-10 rounded object-cover"
                        />
                        <span className="flex-1 text-gray-700">
                          {p?.name ?? `Product #${it.productId}`}
                          <span className="text-gray-400"> × {it.quantity}</span>
                        </span>
                        <span className="text-gray-500">
                          {formatOMR(it.unitPrice * it.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Show the coupon only when one was applied to this order. */}
                {o.coupon && (
                  <p className="mt-3 text-xs text-green-700">
                    Coupon <span className="font-semibold">{o.coupon.code}</span> —{" "}
                    {o.coupon.discountPercent}% off
                  </p>
                )}

                {/* Payment row: a green "Paid" badge once a payment exists,
                    otherwise a method picker + a Pay button that records one. */}
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                  {paymentByOrder[o.orderId] ? (
                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      Paid · {paymentByOrder[o.orderId].method}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={method[o.orderId] ?? "Card"}
                        onChange={(e) => setMethod({ ...method, [o.orderId]: e.target.value })}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                      </select>
                      <button
                        onClick={() => pay(o)}
                        disabled={payingId === o.orderId}
                        className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300"
                      >
                        {payingId === o.orderId ? "Paying…" : `Pay ${formatOMR(o.totalAmount)}`}
                      </button>
                    </div>
                  )}

                  {/* Read-only shipping status (managed by an admin). Only shows
                      once a shipment exists for this order. */}
                  {shippingByOrder[o.orderId] && (
                    <span className="text-xs text-gray-500">
                      Shipping:{" "}
                      <span className="font-medium text-gray-700">
                        {shippingByOrder[o.orderId].status ?? "Preparing"}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
