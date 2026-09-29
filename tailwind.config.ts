import type { Config } from "tailwindcss";

/**
 * Colors resolve through CSS variables so a single `data-theme` swap on <html>
 * repaints the whole app. Each variable holds space-separated RGB channels,
 * which is what lets Tailwind's `<alpha-value>` keep working (`bg-accent/10`).
 */
const withAlpha = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "SF Pro Text",
          "SF Pro Display",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "SF Pro Display",
          "Inter Display",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "JetBrains Mono",
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.035em",
        ultratight: "-0.05em",
      },
      colors: {
        // Surfaces, from page background up to the most raised fill.
        base: {
          0: withAlpha("--base-0"),
          1: withAlpha("--base-1"),
          2: withAlpha("--base-2"),
          3: withAlpha("--base-3"),
          4: withAlpha("--base-4"),
        },
        // Hairlines, ascending in contrast.
        line: {
          1: withAlpha("--line-1"),
          2: withAlpha("--line-2"),
          3: withAlpha("--line-3"),
        },
        // Text, descending in emphasis.
        ink: {
          hi: withAlpha("--ink-hi"),
          mid: withAlpha("--ink-mid"),
          lo: withAlpha("--ink-lo"),
          dim: withAlpha("--ink-dim"),
        },
        // Primary action colour — Stripe's blurple.
        volt: {
          DEFAULT: withAlpha("--accent-500"),
          300: withAlpha("--accent-300"),
          400: withAlpha("--accent-400"),
          500: withAlpha("--accent-500"),
          600: withAlpha("--accent-600"),
          700: withAlpha("--accent-700"),
        },
        // Money / live / success. Replaces the old neon lime.
        mint: {
          DEFAULT: withAlpha("--mint-500"),
          400: withAlpha("--mint-400"),
          500: withAlpha("--mint-500"),
          600: withAlpha("--mint-600"),
        },
        // Mesh-gradient stops, used decoratively.
        ribbon: {
          violet: withAlpha("--ribbon-violet"),
          indigo: withAlpha("--ribbon-indigo"),
          cyan: withAlpha("--ribbon-cyan"),
          rose: withAlpha("--ribbon-rose"),
          amber: withAlpha("--ribbon-amber"),
          mint: withAlpha("--mint-500"),
        },
        warn: withAlpha("--warn"),
        danger: withAlpha("--danger"),
      },
      boxShadow: {
        // Apple-style shadows: many shallow layers rather than one dark blur.
        xs: "var(--shadow-xs)",
        soft: "var(--shadow-soft)",
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        float: "var(--shadow-float)",
        glow: "var(--shadow-glow)",
        "glow-mint": "var(--shadow-glow-mint)",
        focus: "0 0 0 4px rgb(var(--accent-500) / 0.18)",
      },
      // Radius is a user-facing setting, so the whole scale reads from CSS
      // variables that [data-radius] swaps. `rounded-full` keeps its default.
      borderRadius: {
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-lg)",
        xl: "var(--r-xl)",
        xl2: "var(--r-xl2)",
        "2xl": "var(--r-2xl)",
        "3xl": "var(--r-3xl)",
        "4xl": "var(--r-4xl)",
      },
      transitionTimingFunction: {
        ios: "cubic-bezier(0.22, 1, 0.36, 1)",
        emphatic: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgb(var(--mint-500) / 0.5)" },
          "70%": { boxShadow: "0 0 0 10px rgb(var(--mint-500) / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(var(--mint-500) / 0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        caret: {
          "0%,49%": { opacity: "1" },
          "50%,100%": { opacity: "0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        gridShift: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "48px 48px" },
        },
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        auroraFlow: {
          "0%,100%": { transform: "translate3d(0,0,0) rotate(0deg)" },
          "50%": { transform: "translate3d(0,-2%,0) rotate(180deg)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 2s ease-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        caret: "caret 1.1s steps(1) infinite",
        float: "float 4s ease-in-out infinite",
        gridShift: "gridShift 30s linear infinite",
        riseIn: "riseIn 0.6s cubic-bezier(0.22,1,0.36,1) both",
        auroraFlow: "auroraFlow 28s ease-in-out infinite",
      },
      backgroundSize: {
        "grid-40": "48px 48px",
      },
    },
  },
  plugins: [],
};

export default config;
