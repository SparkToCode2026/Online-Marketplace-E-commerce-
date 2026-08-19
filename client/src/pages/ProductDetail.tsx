import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiFetch, isLoggedIn, ensureCart, formatOMR, bumpCart } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";
import ProductReviews from "../components/ProductReviews";
import { ArrowLeftIcon } from "../components/icons";
import { onProductImgError } from "../lib/img";

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
  const toast = useToast();
  const navigate = useNavigate();
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
    if (isLoggedIn()) ensureCart().then(setCartId);
  }, [id]);

  async function addToCart() {
    if (!product) return;
    if (!isLoggedIn()) {
      toast("Please log in to add items to your cart.", "info");
      navigate("/login");
      return;
    }
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
      bumpCart(); // refresh the NavBar cart badge
      toast(`Added ${qty} × "${product.name}" to the cart.`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="min-h-screen bg-page font-body text-ink">
      <NavBar />

      <div className="mx-auto max-w-5xl p-6">
        <Link
          to="/"
          className="flex w-fit items-center gap-1 text-sm text-accent-700 hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to products
        </Link>

        {error && <p className="mt-4 text-sm text-accent-700">{error}</p>}

        {!product && !error && <p className="mt-4 text-sm text-ink/50">Loading…</p>}

        {product && (
          <>
          <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-2xl bg-accent-100 shadow-sm">
              <img
                src={product.productUrl}
                alt={product.name}
                onError={onProductImgError(product.name)}
                className="h-full w-full object-cover saturate-[.85] brightness-[.97]"
              />
            </div>

            <div className="flex flex-col">
              <div className="flex flex-wrap gap-2">
                {product.category && (
                  <span className="rounded-full bg-sage-100 px-3 py-1 text-xs font-medium text-sage-700">
                    {product.category.name}
                  </span>
                )}
                {product.stockQuantity > 0 ? (
                  <span className="rounded-full bg-ink/5 px-3 py-1 text-xs font-medium text-ink/70">
                    In stock ({product.stockQuantity})
                  </span>
                ) : (
                  <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-medium text-accent-700">
                    Out of stock
                  </span>
                )}
              </div>

              <h1 className="mt-3 font-heading text-3xl">{product.name}</h1>
              {product.vendorProfile && (
                <p className="mt-1 text-sm text-ink/50">
                  Sold by {product.vendorProfile.storeName}
                </p>
              )}

              <p className="mt-4 text-2xl font-bold text-accent-700">
                {formatOMR(product.price)}
              </p>

              <p className="mt-4 leading-relaxed text-ink/70">{product.description}</p>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex items-center rounded-full border border-ink/15">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="px-3 py-2 text-ink/70 hover:bg-ink/5 rounded-l-full"
                  >
                    −
                  </button>
                  <span className="w-10 text-center">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                    className="px-3 py-2 text-ink/70 hover:bg-ink/5 rounded-r-full"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={addToCart}
                  disabled={product.stockQuantity <= 0}
                  className="flex-1 rounded-full bg-accent-500 py-2.5 font-medium text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:bg-ink/15"
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>

          <ProductReviews productId={product.productId} />
          </>
        )}
      </div>
    </div>
  );
}
