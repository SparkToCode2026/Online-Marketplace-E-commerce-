import type { SyntheticEvent } from "react";

// Network-free product image fallback.
//
// Product photos are stored as external URLs (the seed data uses
// `images.unsplash.com` hotlinks). Those hosts rate-limit / block hotlinking
// when a page loads several images at once, so the storefront renders broken
// images. To stay robust in any environment -- including fully offline demos --
// every product <img> falls back to this inline SVG when its real image fails
// to load, so we always show a clean, on-brand placeholder instead of the
// browser's broken-image icon.

// Organic design-system colors (see tailwind.config.js / index.css).
const BG = "#F4EAD9"; // cream
const ACCENT = "#C0704F"; // terracotta
const INK = "#5B4A3F"; // ink

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}

// A themed square placeholder showing the product's initial and name. Encoded
// as a data URI so it needs no network and can never itself 404.
export function productPlaceholder(name?: string | null): string {
  const clean = (name ?? "").trim();
  const label = (clean || "Product").slice(0, 22);
  const initial = (clean[0] ?? "?").toUpperCase();
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'>` +
    `<rect width='400' height='400' fill='${BG}'/>` +
    `<circle cx='200' cy='165' r='78' fill='${ACCENT}' opacity='0.14'/>` +
    `<text x='200' y='200' font-family='Georgia, serif' font-size='96' font-weight='700' fill='${ACCENT}' text-anchor='middle'>${escapeXml(initial)}</text>` +
    `<text x='200' y='300' font-family='Arial, Helvetica, sans-serif' font-size='24' fill='${INK}' text-anchor='middle'>${escapeXml(label)}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// A wide themed banner placeholder for the hero slider, encoded as a data URI.
export function bannerPlaceholder(text?: string | null): string {
  const label = (text ?? "").trim().slice(0, 40);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='1600' height='560' viewBox='0 0 1600 560'>` +
    `<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>` +
    `<stop offset='0' stop-color='${BG}'/><stop offset='1' stop-color='#E7C9B4'/>` +
    `</linearGradient></defs>` +
    `<rect width='1600' height='560' fill='url(#g)'/>` +
    `<circle cx='1300' cy='150' r='220' fill='${ACCENT}' opacity='0.12'/>` +
    `<circle cx='260' cy='470' r='160' fill='${ACCENT}' opacity='0.10'/>` +
    (label
      ? `<text x='800' y='300' font-family='Georgia, serif' font-size='56' font-weight='700' fill='${ACCENT}' text-anchor='middle'>${escapeXml(label)}</text>`
      : "") +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// onError handler for the hero slider <img>.
export function onBannerImgError(text?: string | null) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset.fallback === "1") return;
    img.dataset.fallback = "1";
    img.style.visibility = "visible";
    img.src = bannerPlaceholder(text);
  };
}

// onError handler for a product <img>. Swaps the source to the local
// placeholder exactly once (guarded via a data-attribute) so that if the
// placeholder itself ever failed we would not loop forever.
export function onProductImgError(name?: string | null) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.dataset.fallback === "1") return;
    img.dataset.fallback = "1";
    img.src = productPlaceholder(name);
  };
}
