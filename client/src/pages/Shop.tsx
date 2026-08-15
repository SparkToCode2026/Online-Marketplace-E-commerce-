import { useEffect, useRef, useState } from "react";
import { useNavigate, Navigate, Link, useSearchParams } from "react-router-dom";
import { apiFetch, isLoggedIn, ensureCart, formatOMR } from "../api";
import { useToast } from "../components/Toast";
import NavBar from "../components/NavBar";
import HeroSlider from "../components/HeroSlider";
import Pagination from "../components/Pagination";
import { SupportIcon, ShieldCheckIcon, TruckIcon, InfoIcon, SearchIcon } from "../components/icons";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get("category");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [cartId, setCartId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

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

  // Jump back to page 1 whenever the category, search, or price filter changes.
  useEffect(() => {
    setPage(1);
  }, [categoryFilter, searchParams.get("search"), searchParams.get("maxPrice")]);

  if (!isLoggedIn()) return <Navigate to="/login" replace />;

  const searchQuery = (searchParams.get("search") ?? "").trim().toLowerCase();
  // Max-price filter: keep the raw string for the input, and a parsed number
  // for comparing. Empty string means "no cap", so every product passes.
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const maxPriceNum = maxPrice ? Number(maxPrice) : null;
  const shown = products.filter(
    (p) =>
      (!categoryFilter || p.categoryId === Number(categoryFilter)) &&
      (!searchQuery || p.name.toLowerCase().includes(searchQuery)) &&
      (maxPriceNum === null || p.price <= maxPriceNum),
  );
  const activeName = categories.find((c) => String(c.categoryId) === categoryFilter)?.name;

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

  function updateSearch(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("search", value);
    else params.delete("search");
    setSearchParams(params, { replace: true });
  }

  // Same idea as updateSearch, but for the max-price cap. A blank value removes
  // the cap entirely; anything else is stored as-is in the ?maxPrice= param.
  function updateMaxPrice(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("maxPrice", value);
    else params.delete("maxPrice");
    setSearchParams(params, { replace: true });
  }

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

      {/* ===== Feature strip ===== */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-6 rounded-2xl bg-white/60 p-6 shadow-sm lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700">
                <f.Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm ">{f.title}</h3>
                <p className="text-xs text-ink/60">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Products ===== */}
      <div id="products" className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex max-w-md items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-ink/40" />
          <input
            value={searchParams.get("search") ?? ""}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
          />
        </div>

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

            {/* Max-price filter: show only products at or below the entered price. */}
            <div className="mt-4 rounded-2xl bg-white/60 p-4 shadow-sm">
              <h3 className="mb-3 px-3 font-heading text-lg">Max price</h3>
              <div className="flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3.5 py-2">
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => updateMaxPrice(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-ink/40"
                />
                <span className="shrink-0 text-xs font-medium text-ink/50">OMR</span>
              </div>
              {maxPrice && (
                <button
                  onClick={() => updateMaxPrice("")}
                  className="mt-2 px-3 text-xs font-medium text-accent-700 hover:underline"
                >
                  Clear
                </button>
              )}
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
              {paged.map((p) => {
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
                        <span className="text-xs font-normal uppercase tracking-wide text-accent-700">
                          {p.category.name}
                        </span>
                      )}
                      <h3 className="mt-0.5">{p.name}</h3>

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

            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </div>
    </div>
  );
}
