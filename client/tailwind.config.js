/** @type {import('tailwindcss').Config} */

/* ══════════════════════════════════════════════════════════════════════════
   ORGANIC DESIGN SYSTEM — the real token layer.
   Every value below is transcribed verbatim from the design system's
   `styles.css` (:root block). This file is the ONLY place hex colours,
   font names, radii, shadows and the density spacing scale may live.
   Screens must consume them through the utility classes named here.
   ══════════════════════════════════════════════════════════════════════════ */

/* --- roles (base values, distinct from the ramps) --- */
const BG = "#f5ead8"; // --color-bg      page ground
const SURFACE = "#ebddc5"; // --color-surface card / input / dialog ground
const INK = "#201e1d"; // --color-text
const ACCENT = "#c67139"; // --color-accent    NOT the same as accent-500
const ACCENT_2 = "#7a8a5e"; // --color-accent-2  NOT the same as sage-500

/* --- tonal ramps: one shared OKLCH lightness scale across all three roles,
       so step N of any ramp matches step N of the others in visual value. --- */
const NEUTRAL = {
  100: "#f9f4ed",
  200: "#eee7db",
  300: "#dcd3c4",
  400: "#c0b6a5",
  500: "#a19786",
  600: "#82796a",
  700: "#645c50",
  800: "#474238",
  900: "#2e2b25",
};

const ACCENT_RAMP = {
  100: "#fff2eb",
  200: "#ffe1d0",
  300: "#ffc6a5",
  400: "#f6a06b",
  500: "#d67f48",
  600: "#b2622d",
  700: "#8c491a",
  800: "#643312",
  900: "#402310",
};

const ACCENT_2_RAMP = {
  100: "#f0fae1",
  200: "#e1eecc",
  300: "#ccdbb2",
  400: "#aebf92",
  500: "#8fa073",
  600: "#728157",
  700: "#56633f",
  800: "#3d472b",
  900: "#272e1b",
};

/* --shadow-* : ink-tinted soft elevation, ramp step 900 (#2e2b25) as the tint */
const SHADOW_SM = "0 1px 2px rgba(46, 43, 37, 0.14)";
const SHADOW_MD = "0 3px 10px rgba(46, 43, 37, 0.16)";
const SHADOW_LG = "0 12px 32px rgba(46, 43, 37, 0.22)";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /* ---- semantic roles ---- */
        page: BG, // bg-page      the page ground
        surface: SURFACE, // bg-surface   cards, inputs, dialogs, sheets
        ink: INK, // text-ink     body copy; alpha via text-ink/70 etc.
        divider: "rgba(32, 30, 29, 0.16)", // --color-divider = ink @ 16%
        muted: "rgba(32, 30, 29, 0.55)", // the system's .text-muted colour

        /* ---- ramps ---- */
        accent: { DEFAULT: ACCENT, ...ACCENT_RAMP },
        sage: { DEFAULT: ACCENT_2, ...ACCENT_2_RAMP },
        neutral: {
          // clamp 50/950 into the palette so a stray step can never fall
          // back to Tailwind's cool grey.
          50: NEUTRAL[100],
          ...NEUTRAL,
          950: NEUTRAL[900],
        },

        /* ---- aliases: the design system's own spelling of accent-2, and the
               pre-redesign names still present in some screens. Kept so no
               markup silently loses its colour mid-migration. ---- */
        "accent-2": { DEFAULT: ACCENT_2, ...ACCENT_2_RAMP },
        bg: BG,
        cream: BG, // deprecated -> page
        terracotta: { DEFAULT: ACCENT, 50: ACCENT_RAMP[100], ...ACCENT_RAMP }, // deprecated -> accent
      },

      fontFamily: {
        // Caprasimo ships at 400 ONLY — never pair with font-bold/semibold.
        heading: ["Caprasimo", "system-ui", "sans-serif"],
        body: ["Figtree", "system-ui", "sans-serif"],
      },

      fontSize: {
        /* the system's heading scale, with its line-height + tracking baked in */
        display: ["52px", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        h1: ["42px", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        h2: ["32px", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        h3: ["25px", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        h4: ["20px", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        h5: ["16px", { lineHeight: "1.12", letterSpacing: "-0.015em" }],
        h6: ["13px", { lineHeight: "1.12", letterSpacing: "0.08em" }],

        /* body default: 15px / 1.55 */
        base: ["15px", { lineHeight: "1.55" }],

        /* exact px steps the mockup uses, so screens never need raw px */
        10: "10px",
        11: "11px",
        12: "12px",
        13: "13px",
        14: "14px",
        15: "15px",
        16: "16px",
        17: "17px",
        18: "18px",
        20: "20px",
        22: "22px",
        25: "25px",
        26: "26px",
        28: "28px",
        30: "30px",
        32: "32px",
        34: "34px",
        42: "42px",
        52: "52px",
      },

      lineHeight: {
        heading: "1.12", // headings
        compact: "1.2", // .btn label, .card-title
        body: "1.55", // body copy
        prose: "1.6", // long descriptions (product detail)
      },

      letterSpacing: {
        heading: "-0.015em",
        tag: "0.02em",
        label: "0.08em", // h6 / table th / eyebrow
        kicker: "0.1em", // .card-kicker
      },

      /* 1.10x density scale (--space-1..8). Named keys, so a screen opts in
         explicitly: p-d3, gap-d4, mt-d6, px-d6 ... Tailwind's own numeric
         spacing is left untouched. */
      spacing: {
        d1: "4.4px",
        d2: "8.8px",
        d3: "13.2px",
        d4: "17.6px",
        d6: "26.4px",
        d8: "35.2px",

        /* control metrics the component layer specifies exactly and that no
           default Tailwind step lands on. */
        btn: "15.84px", // .btn padding-inline = calc(--space-3 * 1.2)
        seg: "7px", // .seg-opt padding-block
        tag: "3px", // .tag padding-block / cart-badge padding-inline
        label: "5px", // .field > label margin-bottom
        avatar: "34px", // nav avatar puck
        textarea: "90px", // textarea.input min-height
      },

      borderRadius: {
        sm: "8px", // --radius-sm
        md: "16px", // --radius-md
        lg: "28px", // --radius-lg
        card: "32.2px", // calc(var(--radius-lg) * 1.15) — cards & dialogs
        pill: "999px", // buttons, tags, inputs, segmented controls
      },

      boxShadow: {
        sm: SHADOW_SM,
        DEFAULT: SHADOW_MD,
        md: SHADOW_MD,
        lg: SHADOW_LG,
        xl: SHADOW_LG, // clamp: keep stray shadow-xl inside the system
      },

      opacity: {
        45: "0.45", // :disabled
        55: "0.55",
        65: "0.65",
        85: "0.85",
        94: "0.94",
      },

      maxWidth: {
        // page shells, exactly as composed in the mockup
        1152: "1152px", // Shop / Admin
        1000: "1000px", // Product detail
        960: "960px", // Vendor products
        900: "900px", // Cart / Orders
        560: "560px", // Account
        460: "460px", // hero sub-copy measure
        440: "440px", // dialog
      },

      textUnderlineOffset: {
        3: "3px", // the system's link underline offset
      },

      transitionDuration: {
        600: "600ms", // hero cross-fade
      },
    },
  },
  plugins: [],
};
