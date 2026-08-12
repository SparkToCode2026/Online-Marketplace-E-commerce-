import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout, addCartLine } from "../api";

// Product shape as returned by the backend
interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  productUrl: string;
}

// Shop page — lists products; the cart lives on its own page (/cart).
export default function Shop() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [cartId, setCartId] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  // React.StrictMode runs effects twice in development to surface bugs.
  // Without this guard, two concurrent POST /Cart/create calls race: the
  // second one fails (the cart already exists) and its catch would wipe
  // out the cartId the first, successful call just set.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    apiFetch("/Product/all")
      .then((data) => setProducts(data as Product[]))
      .catch((e) => setMsg((e as Error).message));
    ensureCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  // Reuse the cart id across page visits (kept in localStorage).
  async function ensureCart() {
    const saved = localStorage.getItem("cartId");
    if (saved) {
      setCartId(Number(saved));
      return;
    }
    try {
      const id = (await apiFetch(
        "/Cart/create?userId=" + localStorage.getItem("userId"),
        "POST"
      )) as number;
      localStorage.setItem("cartId", String(id));
      setCartId(id);
    } catch {
      setCartId(null);
    }
  }

  async function addToCart(p: Product) {
    if (!cartId) {
      setMsg("This account already has a cart. Register a new account for the full demo.");
      return;
    }
    try {
      await apiFetch("/CartItem/add", "POST", { cartId, productId: p.productId, quantity: 1 });
      addCartLine({ productId: p.productId, name: p.name, price: p.price });
      setMsg(`Added "${p.name}" to the cart.`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between bg-gray-800 px-6 py-4 text-white">
        <span className="text-lg font-bold">🛒 Online Marketplace</span>
        <div className="flex items-center gap-4">
          <Link to="/cart" className="text-sm hover:underline">
            🛍️ Cart
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

      <div className="mx-auto max-w-6xl p-6">
        {msg && (
          <div className="mb-4 flex items-center justify-between rounded bg-blue-50 px-4 py-2 text-blue-800">
            <span>{msg}</span>
            <button onClick={() => setMsg("")} className="text-blue-400">
              ✕
            </button>
          </div>
        )}

        <h2 className="mb-3 text-xl font-bold">Products</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.productId} className="flex flex-col rounded-lg bg-white p-4 shadow">
              <img
                src={p.productUrl}
                alt={p.name}
                className="mb-3 h-40 w-full rounded object-cover"
              />
              <h3 className="font-semibold">{p.name}</h3>
              <p className="flex-grow text-sm text-gray-500">{p.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-bold text-blue-600">{p.price.toLocaleString()} SAR</span>
                <button
                  onClick={() => addToCart(p)}
                  className="rounded border border-blue-600 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
