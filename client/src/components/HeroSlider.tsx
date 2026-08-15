import { useEffect, useRef, useState } from "react";

// One hero slide. We keep the copy + its background colour as plain data, so
// the component below is just a loop: add or remove a banner by editing this
// array — no JSX changes needed.
interface Slide {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  href: string;
  image: string;
}

const SLIDES: Slide[] = [
  {
    eyebrow: "Online Marketplace",
    title: "Your one-stop market",
    subtitle: "Great products from trusted vendors — everything you need, in one place.",
    cta: "Shop now",
    href: "#products",
    image: "https://picsum.photos/seed/marketplace/640/480",
  },
  {
    eyebrow: "Limited sale",
    title: "Deals you'll love",
    subtitle: "Save big on top electronics — this week only.",
    cta: "Shop deals",
    href: "#products",
    image: "https://picsum.photos/seed/deals/640/480",
  },
  {
    eyebrow: "New arrivals",
    title: "Fresh picks, just in",
    subtitle: "Discover the latest products from our vendors.",
    cta: "Explore now",
    href: "#products",
    image: "https://picsum.photos/seed/arrivals/640/480",
  },
];

const INTERVAL = 4500;

// Auto-advancing hero carousel, restyled to the Organic system: warm
// terracotta panel, washed/desaturated photo, pill CTA and dots.
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
            <div
              key={s.title}
              className="flex w-full shrink-0 items-center gap-8 bg-terracotta-500 px-8 py-14 text-white sm:px-14 sm:py-16"
            >
              <div className="max-w-xl flex-1">
                <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/80">
                  {s.eyebrow}
                </p>
                <h1 className="font-heading text-4xl leading-tight sm:text-5xl">{s.title}</h1>
                <p className="mt-4 text-base text-white/90 sm:text-lg">{s.subtitle}</p>
                <a
                  href={s.href}
                  className="mt-8 inline-block rounded-full bg-white px-7 py-3 text-sm font-bold text-terracotta-600 shadow transition hover:bg-cream"
                >
                  {s.cta}
                </a>
              </div>

              <img
                src={s.image}
                alt=""
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="hidden h-52 w-80 shrink-0 rounded-2xl object-cover shadow-xl saturate-[.85] brightness-[.97] lg:block"
              />
            </div>
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
              key={s.title}
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
