import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Inter",
          "Segoe UI",
          "sans-serif",
        ],
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "JetBrains Mono",
          "monospace",
        ],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      colors: {
        // Control-room base — near-black with a blue cast, never pure #000.
        base: {
          0: "#08080c",
          1: "#0d0d12",
          2: "#13131a",
          3: "#1a1a24",
          4: "#222230",
        },
        line: {
          1: "#1d1d28",
          2: "#2a2a38",
          3: "#3a3a4c",
        },
        ink: {
          hi: "#f4f4f7",
          mid: "#a7a7b8",
          lo: "#6e6e80",
          dim: "#4a4a5a",
        },
        // Electric violet — primary action / brand
        volt: {
          DEFAULT: "#a78bfa",
          400: "#b8a1fb",
          500: "#a78bfa",
          600: "#8b5cf6",
          700: "#6d3fe8",
        },
        // Lime highlight — success, live, "on air"
        lime: {
          DEFAULT: "#c3ff3e",
          400: "#d4ff66",
          500: "#c3ff3e",
          600: "#a3e019",
        },
        warn: "#f59e0b",
        danger: "#ef4444",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(167,139,250,0.35), 0 8px 40px -8px rgba(167,139,250,0.35)",
        "glow-lime":
          "0 0 0 1px rgba(195,255,62,0.35), 0 8px 40px -8px rgba(195,255,62,0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.03), 0 8px 24px -12px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        xl2: "1.125rem",
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
      },
      animation: {
        pulseRing: "pulseRing 1.8s ease-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        caret: "caret 1.1s steps(1) infinite",
        float: "float 4s ease-in-out infinite",
        gridShift: "gridShift 30s linear infinite",
      },
      backgroundImage: {
        "grid-lines":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "spot-volt":
          "radial-gradient(circle at 20% 0%, rgba(167,139,250,0.18), transparent 40%), radial-gradient(circle at 80% 100%, rgba(195,255,62,0.10), transparent 40%)",
        "stripe-shimmer":
          "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
      },
      backgroundSize: {
        "grid-40": "40px 40px",
      },
    },
  },
  plugins: [],
};

export default config;
