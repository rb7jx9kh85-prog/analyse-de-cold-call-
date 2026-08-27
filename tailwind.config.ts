import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBFBF9",
        ink: "#111111",
        mute: "#8A8A85",
        hair: "#E2E2DC",
        red: "#C8202A",
      },
      fontFamily: {
        sans: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
      letterSpacing: {
        label: ".18em",
      },
      maxWidth: {
        "5xl": "64rem",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".25" },
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1.4s ease-in-out 3",
        rise: "rise .14s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
