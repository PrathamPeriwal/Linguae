import daisyui from "daisyui";

const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const rgbStrength = (name, strength) =>
  `rgb(var(--${name}) / calc(var(--${strength}) * <alpha-value>))`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // daisyUI already registers `accent` and `success` utilities (and
      // primary, secondary, neutral, base-*, info, warning, error).
      // Our keys win for those two utilities. daisyUI component classes
      // such as btn-accent still read --a / --su, so they keep working.
      // No collisions with fontFamily, fontSize, radius, duration, or easing.
      // daisyUI radii are badge, btn, and box.
      colors: {
        bg: rgb("bg"),
        panel: rgb("panel"),
        raised: rgb("raised"),
        "raised-hover": rgb("raised-hover"),
        line: rgbStrength("line", "line-strength"),
        fg: rgb("fg"),
        "fg-muted": rgbStrength("fg-muted", "fg-muted-strength"),
        accent: rgb("accent"),
        "accent-hover": rgb("accent-hover"),
        "on-accent": rgb("on-accent"),
        highlight: rgb("highlight"),
        ember: rgb("ember"),
        lilac: rgb("lilac"),
        success: rgb("success"),
        danger: rgb("danger"),
      },
      fontFamily: {
        display: "var(--font-display)",
        sans: "var(--font-sans)",
      },
      fontSize: {
        "display-xl": [
          "var(--text-display-xl)",
          { lineHeight: "var(--leading-display-xl)", letterSpacing: "var(--tracking-display)", fontWeight: "800" },
        ],
        "display-l": [
          "var(--text-display-l)",
          { lineHeight: "var(--leading-display-l)", letterSpacing: "-0.03em", fontWeight: "800" },
        ],
        h1: ["var(--text-h1)", { lineHeight: "1.15", letterSpacing: "-0.03em", fontWeight: "800" }],
        h2: ["var(--text-h2)", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        h3: ["var(--text-h3)", { lineHeight: "1.35", fontWeight: "600" }],
        body: ["var(--text-body)", { lineHeight: "var(--leading-body)" }],
        small: ["var(--text-small)", { lineHeight: "1.5" }],
        caption: ["var(--text-caption)", { lineHeight: "1.45" }],
      },
      borderRadius: {
        control: "var(--radius-control)",
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
      },
      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
        hero: "var(--duration-hero)",
      },
      transitionTimingFunction: {
        enter: "var(--ease-enter)",
        exit: "var(--ease-exit)",
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      "light",
      "dark",
      "cupcake",
      "bumblebee",
      "emerald",
      "corporate",
      "synthwave",
      "retro",
      "cyberpunk",
      "valentine",
      "halloween",
      "garden",
      "forest",
      "aqua",
      "lofi",
      "pastel",
      "fantasy",
      "wireframe",
      "black",
      "luxury",
      "dracula",
      "cmyk",
      "autumn",
      "business",
      "acid",
      "lemonade",
      "night",
      "coffee",
      "winter",
      "dim",
      "nord",
      "sunset",
    ],
  },
};
