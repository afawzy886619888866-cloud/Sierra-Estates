import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}", "../packages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sierra Estates brand palette (navy + gold)
        navy: {
          50: "#eef2f8",
          100: "#d3ddec",
          200: "#a7bbd9",
          300: "#7b98c6",
          400: "#4f76b3",
          500: "#2f568f",
          600: "#1f3d68",
          700: "#16294a",
          800: "#0f1d36",
          900: "#0a1526",
          950: "#060d18",
        },
        gold: {
          50: "#fbf7ec",
          100: "#f4e9c8",
          200: "#e9d18d",
          300: "#deba54",
          400: "#d4a72f",
          500: "#c6972a",
          600: "#a67a22",
          700: "#835d1f",
          800: "#6c4c20",
          900: "#5c4020",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,21,38,0.06), 0 8px 24px rgba(10,21,38,0.08)",
        "card-hover": "0 2px 4px rgba(10,21,38,0.08), 0 16px 40px rgba(10,21,38,0.14)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
