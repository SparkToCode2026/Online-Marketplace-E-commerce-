import { useEffect, useRef, useState } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { apiFetch, isLoggedIn, ensureCart, formatOMR, bumpCart } from "../api";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";
import NavBar from "../components/NavBar";
import { CartIcon, TrashIcon } from "../components/icons";

interface CartItem {
  cartItemId: number;
  productId: number;
  quantity: number;
  product?: { name: string; price: number; productUrl: string };
}

interface Coupon {
  couponId: number;
  code: string;
  discountPercent: number;
}

// Cart page — reads the real cart from the backend and checks out.
export default function Cart() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [cartId, setCartId] = useState<number | null>(null);
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    ensureCart().then((id) => {
      setCartId(id);
      if (id) load(id);
      else setLoading(false);
    });
    // Active (non-expired) coupons, so a typed code can preview its discount
    // before checkout.
    apiFetch("/Coupon/active")
      .then((d) => setCoupons(d as Coupon[]))
      .catch(() => setCoupons([]));
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
      bumpCart(); // refresh the NavBar cart badge
      if (cartId) load(cartId);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(item: CartItem) {
    try {
      await apiFetch(`/CartItem/remove?id=${item.cartItemId}`, "DELETE");
      bumpCart(); // refresh the NavBar cart badge
      toast(`Removed "${item.product?.name ?? "item"}".`, "info");
      if (cartId) load(cartId);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  // Empty the whole cart in one call (PATCH /Cart/clear keeps the cart record,
  // just drops its items). Confirm first since it wipes every line at once.
  async function clearCart() {
    if (!cartId) return;
    if (!(await confirm("Remove all items from your cart?"))) return;
    try {
      await apiFetch(`/Cart/clear?id=${cartId}`, "PATCH");
      bumpCart(); // refresh the NavBar cart badge
      setItems([]);
      setCoupon("");
      toast("Cart cleared.", "info");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const subtotal = items.reduce((s, i) => s + (i.product?.price ?? 0) * i.quantity, 0);

  // Match the typed code against the active coupons (case-insensitive for the
  // user; the canonical code is what gets sent to checkout). The backend
  // recomputes the same total * (1 - discountPercent/100) authoritatively.
  const enteredCode = coupon.trim();
  const matchedCoupon =
    enteredCode && coupons.find((c) => c.code.toLowerCase() === enteredCode.toLowerCase());
  const discount = matchedCoupon ? (subtotal * matchedCoupon.discountPercent) / 100 : 0;
  const total = subtotal - discount;

  async function checkout() {
    let url = "/Order/checkout?userId=" + localStorage.getItem("userId");
    const code = matchedCoupon ? matchedCoupon.code : enteredCode;
    if (code) url += "&couponCode=" + encodeURIComponent(code);
    try {
      const orderId = await apiFetch(url, "POST");
      localStorage.removeItem("cartId");
      bumpCart(); // cart emptied on checkout — reset the NavBar badge
      setItems([]);
      setCoupon("");
      setCartId(null);
      toast(`Order #${orderId} placed — a confirmation email was sent to your inbox.`, "success");
      navigate("/orders");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="min-h-screen bg-page font-body text-ink">
      <NavBar />

      <div className="mx-auto max-w-4xl p-6">
        <h2 className="mb-4 flex items-center gap-2 font-heading text-2xl">
          <CartIcon className="h-6 w-6 text-accent-500" />
          My Cart
        </h2>

        {loading ? (
          <p className="text-sm text-ink/50">Loading…</p>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white/60 p-10 text-center shadow-sm">
            <CartIcon className="mx-auto h-12 w-12 text-ink/20" />
            <p className="mt-3 text-ink/60">Your cart is empty.</p>
            <Link
              to="/"
              className="mt-4 inline-block rounded-full bg-accent-500 px-5 py-2 text-sm font-medium text-white hover:bg-accent-600"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <div className="flex justify-end">
                <button
                  onClick={clearCart}
                  className="flex items-center gap-1.5 rounded-full border border-accent-200 px-3 py-1.5 text-xs font-medium text-accent-700 transition hover:bg-accent-100"
                >
                  <TrashIcon className="h-4 w-4" />
                  Clear cart
                </button>
              </div>
              {items.map((i) => (
                <div
                  key={i.cartItemId}
                  className="flex items-center gap-4 rounded-2xl bg-white/60 p-4 shadow-sm"
                >
                  <img
                    src={i.product?.productUrl}
                    alt={i.product?.name}
                    className="h-16 w-16 rounded-full object-cover saturate-[.85] brightness-[.97]"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{i.product?.name}</p>
                    <p className="text-sm text-ink/50">
                      {formatOMR(i.product?.price ?? 0)} each
                    </p>
                  </div>

                  <div className="flex items-center rounded-full border border-ink/15">
                    <button
                      onClick={() => adjust(i, -1)}
                      className="rounded-l-full px-3 py-1.5 text-ink/70 hover:bg-ink/5"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm">{i.quantity}</span>
                    <button
                      onClick={() => adjust(i, 1)}
                      className="rounded-r-full px-3 py-1.5 text-ink/70 hover:bg-ink/5"
                    >
                      +
                    </button>
                  </div>

                  <span className="w-24 text-right font-semibold text-accent-700">
                    {formatOMR((i.product?.price ?? 0) * i.quantity)}
                  </span>

                  <button
                    onClick={() => remove(i)}
                    className="text-ink/30 transition hover:text-accent-600"
                    title="Remove"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-2xl bg-white/60 p-5 shadow-sm">
              <h3 className="mb-3 font-heading text-lg">Order summary</h3>
              <div className="flex justify-between text-sm text-ink/60">
                <span>Items</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="mt-2 flex justify-between border-b border-ink/10 pb-3 text-sm text-ink/60">
                <span>Subtotal</span>
                <span>{formatOMR(subtotal)}</span>
              </div>
              {matchedCoupon && (
                <div className="flex justify-between pt-3 text-sm text-sage-700">
                  <span>Discount ({matchedCoupon.code} −{matchedCoupon.discountPercent}%)</span>
                  <span>−{formatOMR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 text-lg font-bold">
                <span>Total</span>
                <span>{formatOMR(total)}</span>
              </div>

              <input
                className="mt-1 w-full rounded-full border border-ink/15 px-4 py-2 text-sm outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
                placeholder="Coupon code (e.g. WELCOME10)"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
              />
              {enteredCode && (
                <p className={`mt-2 text-xs ${matchedCoupon ? "text-sage-700" : "text-accent-700"}`}>
                  {matchedCoupon
                    ? `${matchedCoupon.code} applied — ${matchedCoupon.discountPercent}% off.`
                    : "Invalid or expired coupon code."}
                </p>
              )}
              <button
                onClick={checkout}
                className="mt-3 w-full rounded-full bg-accent-500 py-2.5 font-medium text-white transition hover:bg-accent-600"
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
