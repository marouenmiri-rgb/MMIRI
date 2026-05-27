import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "SF Pro Display",
          "SF Pro Text",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "SF Pro Display",
          "Inter",
          "ui-sans-serif",
          "system-ui",
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
        tightest: "-0.04em",
        ultratight: "-0.055em",
      },
      colors: {
        base: {
          0: "#06060a",
          1: "#0a0a10",
          2: "#0f0f17",
          3: "#16161f",
          4: "#1d1d28",
        },
        line: {
          1: "#1c1c26",
          2: "#262633",
          3: "#363645",
        },
        ink: {
          hi: "#fafafa",
          mid: "#a8a8b8",
          lo: "#6c6c7c",
          dim: "#48485a",
        },
        volt: {
          DEFAULT: "#a78bfa",
          400: "#bca5ff",
          500: "#a78bfa",
          600: "#8b5cf6",
          700: "#6d3fe8",
        },
        lime: {
          DEFAULT: "#c3ff3e",
          400: "#d4ff66",
          500: "#c3ff3e",
          600: "#a3e019",
        },
        // Stripe-style accent stops for mesh gradients.
        ribbon: {
          violet: "#7c4dff",
          indigo: "#5b8def",
          cyan: "#22d3ee",
          rose: "#ff6691",
          amber: "#ffb454",
          lime: "#c3ff3e",
        },
        warn: "#f59e0b",
        danger: "#ef4444",
      },
      boxShadow: {
        // Apple-style multi-layer soft shadows.
        soft: "0 1px 1px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.06), 0 8px 24px -8px rgba(0,0,0,0.4)",
        lift: "0 1px 0 rgba(255,255,255,0.05) inset, 0 1px 2px rgba(0,0,0,0.4), 0 12px 36px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(167,139,250,0.35), 0 8px 40px -8px rgba(167,139,250,0.45)",
        "glow-lime":
          "0 0 0 1px rgba(195,255,62,0.4), 0 8px 40px -8px rgba(195,255,62,0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.3), 0 10px 30px -12px rgba(0,0,0,0.5)",
        // Stripe-style focus ring.
        focus: "0 0 0 4px rgba(167,139,250,0.18)",
      },
      borderRadius: {
        xl2: "1.125rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      transitionTimingFunction: {
        // iOS standard easing.
        ios: "cubic-bezier(0.22, 1, 0.36, 1)",
        // Apple emphasis curve.
        emphatic: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(167,139,250,0.55)" },
          "70%": { boxShadow: "0 0 0 14px rgba(167,139,250,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(167,139,250,0)" },
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
          "100%": { backgroundPosition: "40px 40px" },
        },
        // New Apple-style entrance.
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        auroraFlow: {
          "0%,100%": { transform: "translate3d(0,0,0) rotate(0deg)" },
          "50%": { transform: "translate3d(0,-2%,0) rotate(180deg)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s ease-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        caret: "caret 1.1s steps(1) infinite",
        float: "float 4s ease-in-out infinite",
        gridShift: "gridShift 30s linear infinite",
        riseIn: "riseIn 0.6s cubic-bezier(0.22,1,0.36,1) both",
        auroraFlow: "auroraFlow 28s ease-in-out infinite",
      },
      backgroundSize: {
        "grid-40": "40px 40px",
      },
    },
  },
  plugins: [],
};

export default config;
