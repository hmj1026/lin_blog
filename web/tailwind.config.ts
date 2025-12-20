import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        accent: {
          DEFAULT: "rgb(var(--color-accent-rgb) / <alpha-value>)",
          500: "rgb(var(--color-purple-rgb) / <alpha-value>)",
          600: "rgb(var(--color-purple-rgb) / <alpha-value>)",
        },
        "accent-hover": "var(--color-accent-hover)",
        purple: "var(--color-purple)",
        base: {
          50: "var(--color-neutral-50)",
          75: "var(--color-neutral-75)",
          100: "var(--color-neutral-100)",
          200: "var(--color-neutral-200)",
          300: "var(--color-neutral-500)",
          500: "var(--color-neutral-500)",
          600: "var(--color-neutral-600)",
        },
        line: "var(--color-line)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Sen", "var(--font-sans)", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 48px rgba(15, 23, 42, 0.12)",
        card: "0 12px 32px rgba(15, 23, 42, 0.08)",
      },
      backgroundImage: {
        "grid-light":
          "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0)",
      },
    },
  },
  plugins: [],
};
export default config;
