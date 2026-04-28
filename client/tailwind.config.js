/** @type {import('tailwindcss').Config} */
export default {
  // ── CRITICAL: class strategy for manual dark mode toggle ──────
  darkMode: ["class"],

  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // ── Shadcn semantic tokens ─────────────────────────────
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      // ── Palette reference (matches image) ─────────────────────
      // Tailwind's built-in `neutral` scale already matches closely:
      // neutral-50  = #FAFAFA  neutral-100 = #F5F5F5
      // neutral-200 = #E5E5E5  neutral-300 = #D4D4D4
      // neutral-400 = #A3A3A3  neutral-500 = #737373
      // neutral-600 = #525252  neutral-700 = #404040
      // neutral-800 = #262626  neutral-900 = #171717
      // neutral-950 = #0A0A0A  (dark background)
    },
  },

  plugins: [require("tailwindcss-animate")],
};