import { useEffect, useRef, useState } from "react";

// Each slide is just a promo image — no copy. Add or remove a banner by editing
// this array. `alt` is read by screen readers only; it is never shown on screen.
interface Slide {
  image: string;
  href: string;
  alt: string;
}

const SLIDES: Slide[] = [
  {
    image: "https://images.unsplash.com/photo-1623126908029-58cb08a2b272?w=1600&h=560&fit=crop",
    href: "#products",
    alt: "Tablet Air 10",
  },
  {
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&h=560&fit=crop",
    href: "#products",
    alt: "Wireless Headphones",
  },
  {
    image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&h=560&fit=crop",
    href: "#products",
    alt: "Laptop Pro 15",
  },
  {
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=1600&h=560&fit=crop",
    href: "#products",
    alt: "Denim Jeans",
  },
];

const INTERVAL = 4500;

// Auto-advancing, image-only hero carousel: each slide is a full-bleed product
// banner with arrows, dots and pause-on-hover.
export default function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      setCurrent((i) => (i + 1) % SLIDES.length);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  const go = (i: number) => setCurrent((i + SLIDES.length) % SLIDES.length);

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
          {SLIDES.map((s) => (
            <a key={s.image} href={s.href} className="block w-full shrink-0 bg-accent-500">
              <img
                src={s.image}
                alt={s.alt}
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
                className="h-56 w-full object-cover sm:h-72 lg:h-[420px]"
              />
            </a>
          ))}
        </div>

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
          {SLIDES.map((s, i) => (
            <button
              key={s.image}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all ${
                i === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
