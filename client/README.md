# Organic redesign — apply to your project

These files are drop-in replacements for your existing `client/` files, restyled with the
Organic design system (cream background, terracotta/sage accents, Caprasimo + Figtree type,
pill-shaped buttons/inputs, rounded cards). All logic, state, API calls, and routes are
**unchanged** — only `className` strings, a couple of icons, and the Tailwind/font setup
changed.

## How to apply

1. Copy `tailwind.config.js` over `client/tailwind.config.js` (adds the Organic color/font tokens).
2. Copy `index.html` over `client/index.html` (adds the Google Fonts `<link>` for Caprasimo + Figtree).
3. Copy everything under `src/` into your `client/src/`, overwriting the matching files:
   - `components/NavBar.tsx`
   - `components/HeroSlider.tsx`
   - `components/icons.tsx`
   - `components/OrderStatusBadge.tsx`
   - `pages/Shop.tsx`
   - `pages/ProductDetail.tsx`
   - `pages/Cart.tsx`
   - `pages/Orders.tsx`
   - `pages/Account.tsx`
   - `pages/VendorProducts.tsx`
   - `pages/VendorProfile.tsx`
   - `pages/Admin.tsx`
   - `pages/Categories.tsx`
   - `pages/Login.tsx`
4. No new npm packages are required — fonts load via the `<link>` tag, icons are still inline SVG.
5. `npm run dev` and check each route.

## Not restyled here (apply the same treatment yourself)
- `Register.tsx` — mirror the Login.tsx pattern (same card/pill/gradient-panel treatment).
- `ProductReviews.tsx`, `Toast.tsx` — restyle borders/pills/colors to match (rounded-2xl cards, terracotta accents, pill tags).
- `AdminOrders.tsx`, `AdminCoupons.tsx`, `AdminPayments.tsx`, `AdminShipping.tsx`, `AdminOrderItems.tsx` — apply the same table/tag/button classes used in the restyled `Admin.tsx` products table.

## What changed, in one paragraph
Every `bg-gray-50` page background is now `bg-cream`. The dark `bg-gray-800` navbar is now
transparent on the cream page with terracotta active-link color. All `bg-blue-600` /
`bg-orange-*` primary actions are now `bg-terracotta-500` pill buttons (`rounded-full`)
instead of `rounded-lg`. Cards keep `rounded-2xl` (already close to the system's 16px) but
swap `shadow-sm` accents to the warmer palette. Category/status/tag pills use `terracotta`
or `sage` tints instead of blue/orange/green. Headings use `font-heading` (Caprasimo);
body text uses `font-body` (Figtree). The homepage feature-strip icons were swapped from
Heroicons to Lucide-style icons at a bolder stroke width (2.75) per the system's icon guidance.
