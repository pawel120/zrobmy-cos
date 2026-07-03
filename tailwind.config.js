/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        // shadcn/ui semantic tokens — resolved from the CSS variables in
        // globals.css, which point at this same OLED palette.
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ---- app-specific tokens (unchanged) ----
        base: {
          black: "#000000",
          zinc: "#09090b",
        },
        ink: {
          DEFAULT: "#fafafa",
          muted: "#a1a1aa",
          dim: "#52525b",
        },
        // Ogień accent — used EXCLUSIVELY for fire mechanic, badges, active state
        ogien: {
          DEFAULT: "#ff4500",
          soft: "#ff450022",
          ring: "#ff450055",
        },
      },
      fontFamily: {
        display: ["var(--font-jetbrains-mono)", "monospace"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        // App is intentionally corner-square everywhere; shadcn components
        // read `--radius` so this stays a single source of truth.
        lg: "var(--radius)",
        md: "var(--radius)",
        sm: "var(--radius)",
        none: "0px",
        DEFAULT: "var(--radius)",
      },
      keyframes: {
        "fire-pop": {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
          "100%": { transform: "scale(1)" },
        },
        "toast-in": {
          "0%": { transform: "translateY(-8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "fire-pop": "fire-pop 260ms ease-out",
        "toast-in": "toast-in 180ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
