import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate, Link, useSearchParams } from "react-router-dom";
import { apiFetch, isLoggedIn, ensureCart, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";
import HeroSlider from "../components/HeroSlider";
import { SupportIcon, ShieldCheckIcon, TruckIcon, InfoIcon } from "../components/icons";
import { Stars } from "../components/ProductReviews";

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

interface Category {
  categoryId: number;
  name: string;
}

interface Review {
  productId: number;
  rating: number;
}

// Alternating tint per quick-category card, cycling if there are more than 3.
const QUICK_TINTS = [
  { bg: "bg-accent-100", fg: "text-accent-800" },
  { bg: "bg-sage-100", fg: "text-sage-800" },
  { bg: "bg-ink/5", fg: "text-ink" },
];

const FEATURES = [
  { Icon: SupportIcon, title: "Responsive", text: "Customer service available 24/7" },
  { Icon: ShieldCheckIcon, title: "Secure", text: "Certified marketplace since 2017" },
  { Icon: TruckIcon, title: "Shipping", text: "Free and reliable worldwide" },
  { Icon: InfoIcon, title: "Transparent", text: "Hassle-free return policy" },
];

// Shop page — the storefront homepage. Shows a hero slider, a trust strip, a
// category sidebar for filtering, and the product grid on the right.
export default function Shop() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cartId, setCartId] = useState<number | null>(null);

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    apiFetch("/Product/all")
      .then((data) => setProducts(data as Product[]))
      .catch((e) => toast((e as Error).message, "error"));
    apiFetch("/Category/all")
      .then((data) => setCategories(data as Category[]))
      .catch(() => setCategories([]));
    apiFetch("/Review/all")
      .then((data) => setReviews(data as Review[]))
      .catch(() => setReviews([]));
    ensureCart().then(setCartId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  const searchQuery = (searchParams.get("search") ?? "").trim().toLowerCase();
  const shown = products.filter(
    (p) =>
      (!categoryFilter || p.categoryId === Number(categoryFilter)) &&
      (!searchQuery || p.name.toLowerCase().includes(searchQuery)),
  );
  const activeName = categories.find((c) => String(c.categoryId) === categoryFilter)?.name;

  // One pass over all reviews to get each product's {avg, count} for the grid.
  const ratingsByProduct = new Map<number, { total: number; count: number }>();
  for (const r of reviews) {
    const cur = ratingsByProduct.get(r.productId) ?? { total: 0, count: 0 };
    cur.total += r.rating;
    cur.count += 1;
    ratingsByProduct.set(r.productId, cur);
  }

  const sideLink = (active: boolean) =>
    `rounded-full px-3 py-2 transition ${
      active
        ? "bg-accent-100 font-bold text-accent-700"
        : "text-ink/70 hover:bg-ink/5"
    }`;

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
    <div className="min-h-screen bg-page font-body text-ink">
      <NavBar />
      <HeroSlider />

      {/* ===== Quick categories ===== */}
      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {categories.slice(0, 3).map((c, i) => (
              <Link
                key={c.categoryId}
                to={`/?category=${c.categoryId}`}
                className={`rounded-2xl p-5 font-heading text-lg shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${QUICK_TINTS[i % QUICK_TINTS.length].bg} ${QUICK_TINTS[i % QUICK_TINTS.length].fg}`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ===== Feature strip ===== */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 rounded-2xl bg-white/60 p-6 shadow-sm lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                <f.Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold">{f.title}</h3>
                <p className="text-xs text-ink/60">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Products ===== */}
      <div id="products" className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="lg:w-56 lg:shrink-0">
            <div className="rounded-2xl bg-white/60 p-4 shadow-sm">
              <h3 className="mb-3 px-3 font-heading text-lg">Categories</h3>
              <nav className="flex flex-col gap-1 text-sm">
                <Link to="/" className={sideLink(!categoryFilter)}>
                  All products
                </Link>
                {categories.map((c) => (
                  <Link
                    key={c.categoryId}
                    to={`/?category=${c.categoryId}`}
                    className={sideLink(String(c.categoryId) === categoryFilter)}
                  >
                    {c.name}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-heading text-2xl">
                {categoryFilter ? activeName ?? "Products" : searchQuery ? "Search results" : "Featured products"}
              </h2>
              <span className="text-sm text-ink/50">{shown.length} items</span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => {
                const outOfStock = p.stockQuantity <= 0;
                const rating = ratingsByProduct.get(p.productId);
                const avg = rating ? rating.total / rating.count : null;
                return (
                  <div
                    key={p.productId}
                    onClick={() => navigate(`/product/${p.productId}`)}
                    className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white/60 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="relative aspect-square overflow-hidden bg-accent-100">
                      <img
                        src={p.productUrl}
                        alt={p.name}
                        className="h-full w-full object-cover saturate-[.85] brightness-[.97] transition duration-300 group-hover:scale-105"
                      />
                      {outOfStock && (
                        <span className="absolute right-2 top-2 rounded-full bg-accent-700 px-2 py-0.5 text-xs font-medium text-white">
                          Out of stock
                        </span>
                      )}
                    </div>

                    <div className="flex flex-grow flex-col p-4">
                      {p.category && (
                        <span className="text-xs font-semibold uppercase tracking-wide text-accent-700">
                          {p.category.name}
                        </span>
                      )}
                      <h3 className="mt-0.5 font-bold">{p.name}</h3>

                      {avg !== null && rating && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <Stars value={Math.round(avg)} size="h-3.5 w-3.5" />
                          <span className="text-xs text-ink/50">
                            {avg.toFixed(1)} · {rating.count}
                          </span>
                        </div>
                      )}

                      <div className="mt-3 flex flex-grow items-end justify-between">
                        <span className="text-lg font-bold text-accent-700">
                          {formatOMR(p.price)}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(p);
                          }}
                          disabled={outOfStock}
                          className="rounded-full border border-accent-500 px-4 py-1.5 text-sm font-medium text-accent-700 transition hover:bg-accent-500 hover:text-white disabled:cursor-not-allowed disabled:border-ink/15 disabled:text-ink/30 disabled:hover:bg-transparent"
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
      </div>
    </div>
  );
}
