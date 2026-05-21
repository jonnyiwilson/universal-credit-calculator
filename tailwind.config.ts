import type { Config } from "tailwindcss"

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gov: {
          blue: "#1d70b8",
          dark: "#0b0c0c",
          grey: "#505a5f",
          light: "#f3f2f1",
          border: "#b1b4b6",
          yellow: "#ffdd00"
        }
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"]
      }
    }
  },
  plugins: []
} satisfies Config
