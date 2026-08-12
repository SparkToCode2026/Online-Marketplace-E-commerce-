import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout, getCart, clearCart } from "../api";

// Cart page — shows what's in the cart and checks out (sends the email).
export default function Cart() {
  const navigate = useNavigate();
  const [lines, setLines] = useState(getCart());
  const [coupon, setCoupon] = useState("");
  const [msg, setMsg] = useState("");

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  async function checkout() {
    let url = "/Order/checkout?userId=" + localStorage.getItem("userId");
    if (coupon.trim()) url += "&couponCode=" + encodeURIComponent(coupon.trim());
    try {
      const orderId = await apiFetch(url, "POST");
      clearCart();
      localStorage.removeItem("cartId"); // a fresh cart for the next order
      setLines([]);
      setCoupon("");
      setMsg(`✅ Order #${orderId} placed — a confirmation email was sent to your inbox.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const total = lines.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between bg-gray-800 px-6 py-4 text-white">
        <span className="text-lg font-bold">🛒 Online Marketplace</span>
        <div className="flex items-center gap-4">
          <Link to="/" className="text-sm hover:underline">
            ← Products
          </Link>
          <span className="text-sm text-gray-300">{localStorage.getItem("email")}</span>
          <button
            onClick={handleLogout}
            className="rounded bg-gray-600 px-3 py-1 text-sm hover:bg-gray-500"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-lg p-6">
        <h2 className="mb-3 text-xl font-bold">🛍️ My Cart</h2>

        {msg && (
          <div className="mb-4 flex items-center justify-between rounded bg-blue-50 px-4 py-2 text-blue-800">
            <span>{msg}</span>
            <button onClick={() => setMsg("")} className="text-blue-400">
              ✕
            </button>
          </div>
        )}

        <div className="rounded-lg bg-white p-4 shadow">
          {lines.length === 0 ? (
            <p className="text-sm text-gray-400">
              Cart is empty.{" "}
              <Link to="/" className="text-blue-600">
                Browse products
              </Link>
            </p>
          ) : (
            <ul className="divide-y">
              {lines.map((i) => (
                <li key={i.productId} className="flex justify-between py-2 text-sm">
                  <span>
                    {i.name} <span className="text-gray-400">×{i.qty}</span>
                  </span>
                  <span>{(i.price * i.qty).toLocaleString()} SAR</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex justify-between border-t pt-3 font-bold">
            <span>Total</span>
            <span>{total.toLocaleString()} SAR</span>
          </div>

          <input
            className="mt-3 w-full rounded border px-2 py-1 text-sm"
            placeholder="Coupon code (optional): WELCOME10"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
          />
          <button
            onClick={checkout}
            disabled={lines.length === 0}
            className="mt-3 w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
