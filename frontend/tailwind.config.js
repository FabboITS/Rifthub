/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        hex: { DEFAULT: "#0ac8b9", dark: "#0397ab", deep: "#005a82" },
        gold: { DEFAULT: "#c8aa6e", light: "#f0e6d2", dark: "#785a28" },
      },
      fontFamily: { display: ["Beaufort", "Georgia", "serif"] },
    },
  },
  plugins: [],
};
