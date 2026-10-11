import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tessant: {
          yellow: "#F3BA2F",
          black: "#090B0E",
          panel: "#13171C",
          ink: "#F4F6F8",
          muted: "#98A0AA",
        },
      },
      fontFamily: {
        sans: ["Inter", "Geist", "SF Pro Display", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "monospace"],
      },
      maxWidth: {
        shell: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
