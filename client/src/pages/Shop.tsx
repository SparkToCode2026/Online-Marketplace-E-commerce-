import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, isAdmin, logout, ensureCart } from "../api";
import { useToast } from "../components/Toast";
import { BrandIcon, CartIcon, AdminIcon } from "../components/icons";

// Product shape as returned by the backend
interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  productUrl: string;
  stockQuantity: number;
  category?: { name: string };
}

// Shop page — lists products; the cart lives on its own page (/cart).
export default function Shop() {
  const navigate = useNavigate();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [cartId, setCartId] = useState<number | null>(null);

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
      .catch((e) => toast((e as Error).message, "error"));
    ensureCart().then(setCartId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  async function addToCart(p: Product) {
    if (!cartId) {
      toast("This account already has a cart. Register a new account for the full demo.", "error");
      return;
    }
    try {
      await apiFetch("/CartItem/add", "POST", { cartId, productId: p.productId, quantity: 1 });
      toast(`Added "${p.name}" to the cart.`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="flex items-center justify-between bg-gray-800 px-6 py-4 text-white">
        <span className="flex items-center gap-2 text-lg font-bold">
          <BrandIcon className="h-6 w-6" />
          Online Marketplace
        </span>
        <div className="flex items-center gap-4">
          {isAdmin() && (
            <Link
              to="/admin"
              className="flex items-center gap-1 text-sm text-amber-300 hover:underline"
            >
              <AdminIcon className="h-4 w-4" />
              Admin
            </Link>
          )}
          <Link to="/cart" className="flex items-center gap-1 text-sm hover:underline">
            <CartIcon className="h-4 w-4" />
            Cart
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
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">Products</h2>
          <span className="text-sm text-gray-400">{products.length} items</span>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const outOfStock = p.stockQuantity <= 0;
            return (
              <div
                key={p.productId}
                onClick={() => navigate(`/product/${p.productId}`)}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={p.productUrl}
                    alt={p.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  {p.category && (
                    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 shadow">
                      {p.category.name}
                    </span>
                  )}
                  {outOfStock && (
                    <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                      Out of stock
                    </span>
                  )}
                </div>

                <div className="flex flex-grow flex-col p-4">
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="mt-1 flex-grow line-clamp-2 text-sm text-gray-500">
                    {p.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600">
                      {p.price.toLocaleString()} SAR
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(p);
                      }}
                      disabled={outOfStock}
                      className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 transition hover:bg-blue-600 hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
