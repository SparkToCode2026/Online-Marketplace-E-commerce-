import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatOMR } from "../api";

// Minimal shape this component reads. Shop.tsx already fetched the full
// product list — we just describe the fields we use, so this file has no
// API call of its own.
interface Product {
  productId: number;
  name: string;
  price: number;
  productUrl: string;
  stockQuantity: number;
  categoryId: number;
  category?: { name: string };
}

const INTERVAL = 4500;

// Picks up to 3 products to feature, deterministically (no Math.random —
// it isn't available here anyway): prefer one in-stock product per distinct
// category first (so the hero doesn't accidentally feature 3 of the same
// kind), then top up with any remaining in-stock products, then — only if
// the catalog is that thin — whatever's left, so the slider always shows
// *something* once real data has arrived.
function pickFeatured(products: Product[]): Product[] {
  const featured: Product[] = [];
  const seenCategories = new Set<number>();

  for (const p of products) {
    if (featured.length === 3) break;
    if (p.stockQuantity > 0 && !seenCategories.has(p.categoryId)) {
      seenCategories.add(p.categoryId);
      featured.push(p);
    }
  }
  for (const p of products) {
    if (featured.length === 3) break;
    if (p.stockQuantity > 0 && !featured.includes(p)) featured.push(p);
  }
  for (const p of products) {
    if (featured.length === 3) break;
    if (!featured.includes(p)) featured.push(p);
  }
  return featured;
}

// Homepage hero — an auto-advancing carousel built from real catalog
// products. Each slide's own photo is the full-bleed background; a small
// frosted-glass chip floats over one corner holding just the eyebrow,
// product name, price and a CTA. The photo is the poster; the text is a
// caption on top of it, not a paragraph next to it.
export default function HeroSlider({ products }: { products: Product[] }) {
  const slides = pickFeatured(products);
  const [current, setCurrent] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setCurrent((i) => (i + 1) % slides.length);
    }, INTERVAL);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides.length]);

  // Nothing to feature yet (products hasn't loaded) — show a quiet skeleton
  // in the same footprint instead of an empty gap or a broken carousel.
  if (slides.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6 pt-6">
        <div className="aspect-[3/4] w-full animate-pulse rounded-3xl bg-surface sm:aspect-[16/9] lg:aspect-[21/9]" />
      </section>
    );
  }

  const go = (i: number) => setCurrent((i + slides.length) % slides.length);

  return (
    <section className="mx-auto max-w-6xl px-6 pt-6">
      <div
        className="relative overflow-hidden rounded-3xl shadow-lg"
        onMouseEnter={() => (pausedRef.current = true)}
        onMouseLeave={() => (pausedRef.current = false)}
      >
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((p) => (
            <div
              key={p.productId}
              className="relative aspect-[3/4] w-full shrink-0 bg-surface sm:aspect-[16/9] lg:aspect-[21/9]"
            >
              {/* The product photo IS the slide: large, vivid, full-bleed,
                  no desaturation filter. This has to read as a real,
                  sellable product on display, not decorative wallpaper. */}
              <img
                src={p.productUrl}
                alt={p.name}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />

              {/* Scrim: darkens from the bottom-left corner outward so the
                  glass chip stays legible regardless of how light or busy
                  the photo underneath is, while the rest of the photo is
                  left untouched. */}
              <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />

              <div className="absolute inset-x-6 bottom-8 sm:inset-x-10 sm:bottom-12 lg:inset-x-auto lg:bottom-16 lg:left-14 lg:right-auto">
                <div className="inline-block max-w-[19rem] rounded-3xl border border-white/25 bg-white/10 px-6 py-5 shadow-lg backdrop-blur-md sm:max-w-sm sm:px-7 sm:py-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    {p.category?.name ?? "Featured"}
                  </p>
                  <h1 className="mt-2 font-heading text-2xl leading-tight text-white sm:text-3xl lg:text-4xl">
                    {p.name}
                  </h1>
                  <p className="mt-2 text-base font-bold text-white">{formatOMR(p.price)}</p>
                  <Link
                    to={`/product/${p.productId}`}
                    className="mt-5 inline-block rounded-full bg-white px-6 py-2.5 text-sm font-bold text-accent-600 shadow transition hover:bg-page"
                  >
                    Shop now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous slide"
              onClick={() => go(current - 1)}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/25 text-2xl leading-none text-white backdrop-blur transition hover:bg-white/40"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next slide"
              onClick={() => go(current + 1)}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/25 text-2xl leading-none text-white backdrop-blur transition hover:bg-white/40"
            >
              ›
            </button>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {slides.map((p, i) => (
                <button
                  key={p.productId}
                  type="button"
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => go(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
