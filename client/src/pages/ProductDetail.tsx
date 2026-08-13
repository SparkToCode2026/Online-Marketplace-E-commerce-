import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, logout, ensureCart, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import { BrandIcon, CartIcon, ArrowLeftIcon } from "../components/icons";

interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  productUrl: string;
  stockQuantity: number;
  category?: { name: string };
  vendorProfile?: { storeName: string };
}

// Product detail page — Case 6, GET /Product/getById?id=.
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [cartId, setCartId] = useState<number | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    setProduct(null);
    setError("");
    apiFetch(`/Product/getById?id=${id}`)
      .then((data) => setProduct(data as Product))
      .catch((e) => setError((e as Error).message));
    ensureCart().then(setCartId);
  }, [id]);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  async function addToCart() {
    if (!product) return;
    if (!cartId) {
      toast("This account already has a cart. Register a new account for the full demo.", "error");
      return;
    }
    try {
      await apiFetch("/CartItem/add", "POST", {
        cartId,
        productId: product.productId,
        quantity: qty,
      });
      toast(`Added ${qty} × "${product.name}" to the cart.`, "success");
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

      <div className="mx-auto max-w-5xl p-6">
        <Link
          to="/"
          className="flex w-fit items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to products
        </Link>

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

        {!product && !error && <p className="mt-4 text-sm text-gray-400">Loading…</p>}

        {product && (
          <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
              <img src={product.productUrl} alt={product.name} className="h-full w-full object-cover" />
            </div>

            <div className="flex flex-col">
              <div className="flex flex-wrap gap-2">
                {product.category && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                    {product.category.name}
                  </span>
                )}
                {product.stockQuantity > 0 ? (
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                    In stock ({product.stockQuantity})
                  </span>
                ) : (
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
                    Out of stock
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-3xl font-bold text-gray-900">{product.name}</h1>
              {product.vendorProfile && (
                <p className="mt-1 text-sm text-gray-400">
                  Sold by {product.vendorProfile.storeName}
                </p>
              )}

              <p className="mt-4 text-2xl font-bold text-blue-600">
                {formatOMR(product.price)}
              </p>

              <p className="mt-4 leading-relaxed text-gray-600">{product.description}</p>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center rounded-lg border border-gray-300">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    −
                  </button>
                  <span className="w-10 text-center">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                    className="px-3 py-2 text-gray-600 hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={addToCart}
                  disabled={product.stockQuantity <= 0}
                  className="flex-1 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
