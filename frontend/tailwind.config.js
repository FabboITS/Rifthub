/** @type {import('tailwindcss').Config} */
// Palette remapped onto the Gaming Design System (src/styles/ds.css) so every page shares the Home look.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          50: "#ffffff", 100: "#f3eef5", 200: "#e7deea", 300: "#c9c2d6", 400: "#a59fba", 500: "#757090",
          600: "#4a4370", 700: "#2e2866", 800: "#19194d", 900: "#120f2e", 950: "#0b0920",
        },
        hex: { DEFAULT: "#6fd6f6", dark: "#3dbfeb", deep: "#1f8fc4" },
        gold: { DEFAULT: "#e0a43a", light: "#ffffff", dark: "#3b220b" },
        violet: { DEFAULT: "#7a3aa8", light: "#a26bd6" },
        magenta: { DEFAULT: "#c23bd4", light: "#e06be8" },
      },
      fontFamily: {
        sans: ["Urbanist", "system-ui", "sans-serif"],
        display: ["Urbanist", "system-ui", "sans-serif"],
        script: ["Yellowtail", "cursive"],
      },
    },
  },
  plugins: [],
};
