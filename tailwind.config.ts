import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: { panel: "var(--panel-radius)", control: "4px" },
      colors: {
        surface: "#ffffff",
        subtle: "#f5f6f7",
        line: "#d5d9dd",
        ink: "#202124",
        muted: "#5f6368",
        accent: "var(--accent)",
        action: "var(--action)",
        selected: "var(--selected)",
        success: "#137333",
        "success-soft": "#e6f4ea",
        danger: "#b3261e",
        "danger-soft": "#fce8e6",
        background: "var(--background)",
        foreground: "var(--foreground)",
        floci: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
      },
    },
  },
  plugins: [],
};
export default config;
