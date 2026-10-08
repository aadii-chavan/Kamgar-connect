import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F5F0EA",
        line: "#EBE5DE",
        ink: { DEFAULT: "#15110E", soft: "#5F5750", mute: "#9C938B" },
        accent: { DEFAULT: "#15110E", hover: "#2E2723", bright: "#F08A3C", soft: "#F1ECE6", tint: "#E6DFD7", text: "#15110E" },
        lav: { DEFAULT: "#15110E", soft: "#EFE9E2", fill: "#D9D2CA" },
        ok: { bg: "#E4F4EA", fg: "#1C7F45" },
        warn: { bg: "#FDF0CC", fg: "#85580A" },
        bad: { bg: "#FDE6E3", fg: "#C8302B" },
        info: { bg: "#FFE8D6", fg: "#B4470F" },
        neutral: { bg: "#EEE9E3", fg: "#554E47" },
      },
      borderRadius: { xl: "16px", "2xl": "22px", "3xl": "32px" },
      boxShadow: {
        card: "0 24px 48px -28px rgba(70,15,5,0.35)",
        lift: "0 28px 56px -24px rgba(70,15,5,0.40)",
        pop: "0 24px 60px -12px rgba(21,17,14,0.40), 0 3px 10px rgba(21,17,14,0.10)",
        glow: "0 10px 24px -10px rgba(21,17,14,0.45)",
        badge: "0 1px 2px rgba(21,17,14,0.06)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "var(--font-deva)", "system-ui", "sans-serif"],
        display: ["var(--font-body)", "var(--font-deva)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
