import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate, Link, useSearchParams } from "react-router-dom";
import { apiFetch, isLoggedIn, ensureCart, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";

// Product shape as returned by the backend
interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  productUrl: string;
  stockQuantity: number;
  categoryId: number;
  category?: { name: string };
}

// Shop page — lists products; supports an optional ?category= filter.
export default function Shop() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");
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

  const shown = categoryFilter
    ? products.filter((p) => p.categoryId === Number(categoryFilter))
    : products;
  const filterName = shown[0]?.category?.name;

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

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">
            {categoryFilter ? filterName ?? "Products" : "Products"}
          </h2>
          {categoryFilter ? (
            <Link to="/" className="text-sm text-blue-600 hover:underline">
              Clear filter
            </Link>
          ) : (
            <span className="text-sm text-gray-400">{shown.length} items</span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => {
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
                    <span className="text-lg font-bold text-blue-600">{formatOMR(p.price)}</span>
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
