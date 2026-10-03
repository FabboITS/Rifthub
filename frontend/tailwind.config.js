/** @type {import('tailwindcss').Config} */
// Palette "Forge" (src/styles/ds.css). I nomi storici (slate, hex, gold…) restano come chiavi
// così le pagine esistenti ereditano il nuovo tema senza riscrivere ogni classe.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // scala di neri/grigi caldi
        slate: {
          50: "#fffaf4", 100: "#f4ece3", 200: "#e6dbd0", 300: "#c9bcb0", 400: "#a39286", 500: "#7d6e64",
          600: "#544740", 700: "#3a2e27", 800: "#221a16", 900: "#16110f", 950: "#0c0908",
        },
        // ex "hex" ciano → arancio forgia (colore primario)
        hex: { DEFAULT: "#ff6b1a", dark: "#c2410c", deep: "#5c2208" },
        forge: { DEFAULT: "#ff6b1a", deep: "#c2410c", dim: "#5c2208" },
        gold: { DEFAULT: "#ffb547", light: "#ffe0a8", dark: "#3a2306" },
        molten: { DEFAULT: "#ffb547" },
        ice: { DEFAULT: "#5aa9ff", deep: "#1d4f8f" },
        violet: { DEFAULT: "#5c2208", light: "#c9bcb0" },
        magenta: { DEFAULT: "#ff5a36", light: "#ff8a5c" },
        // sky = lato blu
        sky: { 300: "#9ccaff", 400: "#5aa9ff", 500: "#3b82e0" },
      },
      fontFamily: {
        sans: ["Barlow", "system-ui", "sans-serif"],
        display: ["Big Shoulders Display", "Oswald", "sans-serif"],
      },
    },
  },
  plugins: [],
};
