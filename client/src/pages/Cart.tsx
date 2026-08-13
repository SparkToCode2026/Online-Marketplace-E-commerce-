import { useEffect, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, ensureCart, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";
import { CartIcon, TrashIcon } from "../components/icons";

interface CartItem {
  cartItemId: number;
  productId: number;
  quantity: number;
  product?: { name: string; price: number; productUrl: string };
}

// Cart page — reads the real cart from the backend and checks out.
export default function Cart() {
  const toast = useToast();
  const [cartId, setCartId] = useState<number | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState("");

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    ensureCart().then((id) => {
      setCartId(id);
      if (id) load(id);
      else setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  async function load(id: number) {
    setLoading(true);
    try {
      const cart = (await apiFetch(`/Cart/getById?id=${id}`)) as { cartItems?: CartItem[] };
      setItems(cart.cartItems ?? []);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function adjust(item: CartItem, delta: number) {
    try {
      await apiFetch(`/CartItem/adjustQuantity?id=${item.cartItemId}&delta=${delta}`, "PATCH");
      if (cartId) load(cartId);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(item: CartItem) {
    try {
      await apiFetch(`/CartItem/remove?id=${item.cartItemId}`, "DELETE");
      toast(`Removed "${item.product?.name ?? "item"}".`, "info");
      if (cartId) load(cartId);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function checkout() {
    let url = "/Order/checkout?userId=" + localStorage.getItem("userId");
    if (coupon.trim()) url += "&couponCode=" + encodeURIComponent(coupon.trim());
    try {
      const orderId = await apiFetch(url, "POST");
      localStorage.removeItem("cartId"); // a fresh cart for the next order
      setItems([]);
      setCoupon("");
      setCartId(null);
      toast(`Order #${orderId} placed — a confirmation email was sent to your inbox.`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const total = items.reduce((s, i) => s + (i.product?.price ?? 0) * i.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="mx-auto max-w-4xl p-6">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
          <CartIcon className="h-6 w-6" />
          My Cart
        </h2>

        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <CartIcon className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-3 text-gray-500">Your cart is empty.</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              {items.map((i) => (
                <div
                  key={i.cartItemId}
                  className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <img
                    src={i.product?.productUrl}
                    alt={i.product?.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{i.product?.name}</p>
                    <p className="text-sm text-gray-400">
                      {formatOMR(i.product?.price ?? 0)} each
                    </p>
                  </div>

                  <div className="flex items-center rounded-lg border border-gray-300">
                    <button
                      onClick={() => adjust(i, -1)}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{i.quantity}</span>
                    <button
                      onClick={() => adjust(i, 1)}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>

                  <span className="w-24 text-right font-semibold text-gray-900">
                    {formatOMR((i.product?.price ?? 0) * i.quantity)}
                  </span>

                  <button
                    onClick={() => remove(i)}
                    className="text-gray-400 transition hover:text-red-500"
                    title="Remove"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-bold text-gray-900">Order summary</h3>
              <div className="flex justify-between border-b pb-3 text-sm text-gray-500">
                <span>Items</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between py-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatOMR(total)}</span>
              </div>

              <input
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Coupon code (e.g. WELCOME10)"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              <button
                onClick={checkout}
                className="mt-3 w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
