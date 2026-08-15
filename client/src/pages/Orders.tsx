import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";
import OrderStatusBadge from "../components/OrderStatusBadge";
import { CartIcon } from "../components/icons";

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

interface Product {
  productId: number;
  name: string;
  productUrl: string;
}

interface Payment {
  paymentId: number;
  orderId: number;
  method: string;
  status: string;
}

interface Shipping {
  orderId: number;
  status: string | null;
}

// "My Orders" — the customer's own order history.
export default function Orders() {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [productMap, setProductMap] = useState<Record<number, Product>>({});
  const [paymentByOrder, setPaymentByOrder] = useState<Record<number, Payment>>({});
  const [shippingByOrder, setShippingByOrder] = useState<Record<number, Shipping>>({});
  const [method, setMethod] = useState<Record<number, string>>({});
  const [payingId, setPayingId] = useState<number | null>(null);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  async function load() {
    setLoading(true);
    try {
      const [rawOrders, rawProducts, rawPayments, rawShipping] = await Promise.all([
        apiFetch("/Order/all") as Promise<Order[]>,
        apiFetch("/Product/all") as Promise<Product[]>,
        apiFetch("/Payment/all") as Promise<Payment[]>,
        apiFetch("/Shipping/all") as Promise<Shipping[]>,
      ]);

      const map: Record<number, Product> = {};
      for (const p of rawProducts) map[p.productId] = p;
      setProductMap(map);

      const payMap: Record<number, Payment> = {};
      for (const pay of rawPayments) payMap[pay.orderId] = pay;
      setPaymentByOrder(payMap);

      const shipMap: Record<number, Shipping> = {};
      for (const s of rawShipping) shipMap[s.orderId] = s;
      setShippingByOrder(shipMap);

      const myId = Number(localStorage.getItem("userId"));
      const mine = rawOrders
        .filter((o) => o.userId === myId)
        .sort((a, b) => +new Date(b.orderDate) - +new Date(a.orderDate));
      setOrders(mine);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

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
    <div className="min-h-screen bg-page font-body text-ink">
      <NavBar />

      <div className="mx-auto max-w-4xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-2xl">
          <CartIcon className="h-6 w-6 text-accent-500" />
          My Orders
        </h2>

        {loading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-white/60 p-10 text-center shadow-sm">
            <CartIcon className="mx-auto h-12 w-12 text-ink/20" />
            <p className="mt-3 text-ink/60">You haven't placed any orders yet.</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-full bg-accent-500 px-5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.orderId} className="rounded-2xl bg-white/60 p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-3">
                  <div>
                    <p className="font-bold">Order #{o.orderId}</p>
                    <p className="text-sm text-ink/50">
                      {new Date(o.orderDate).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={o.status} />
                    <span className="text-lg font-bold">{formatOMR(o.totalAmount)}</span>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {(o.orderItems ?? []).map((it) => {
                    const p = productMap[it.productId];
                    return (
                      <div key={it.orderItemId} className="flex items-center gap-3 text-sm">
                        <img
                          src={p?.productUrl}
                          alt={p?.name ?? ""}
                          onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                          className="h-10 w-10 rounded-full object-cover saturate-[.85] brightness-[.97]"
                        />
                        <span className="flex-1 text-ink/80">
                          {p?.name ?? `Product #${it.productId}`}
                          <span className="text-ink/40"> × {it.quantity}</span>
                        </span>
                        <span className="text-ink/60">
                          {formatOMR(it.unitPrice * it.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {o.coupon && (
                  <p className="mt-3 text-xs text-sage-700">
                    Coupon <span className="font-semibold">{o.coupon.code}</span> —{" "}
                    {o.coupon.discountPercent}% off
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-3">
                  {paymentByOrder[o.orderId] ? (
                    <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-700">
                      Paid · {paymentByOrder[o.orderId].method}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        value={method[o.orderId] ?? "Card"}
                        onChange={(e) => setMethod({ ...method, [o.orderId]: e.target.value })}
                        className="rounded-full border border-ink/15 px-3 py-1.5 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                      >
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                      </select>
                      <button
                        onClick={() => pay(o)}
                        disabled={payingId === o.orderId}
                        className="rounded-full bg-accent-500 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-600 disabled:bg-ink/15"
                      >
                        {payingId === o.orderId ? "Paying…" : `Pay ${formatOMR(o.totalAmount)}`}
                      </button>
                    </div>
                  )}

                  {shippingByOrder[o.orderId] && (
                    <span className="text-xs text-ink/60">
                      Shipping:{" "}
                      <span className="font-medium text-ink/80">
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
