import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
      },
      colors: {
        ink: {
          50: "#f7f8fa",
          100: "#eceef2",
          200: "#d9dde4",
          300: "#b7bdc9",
          400: "#7f8695",
          500: "#555c6b",
          600: "#3b4250",
          700: "#2a2f3a",
          800: "#1a1d25",
          900: "#0e1015",
        },
        accent: {
          DEFAULT: "#635bff",
          600: "#5146ff",
          700: "#3f35d6",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)",
        pop: "0 8px 24px rgba(16,24,40,0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
