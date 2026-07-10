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

        // ---- app-specific tokens (BuildTogether B3 palette — see DESIGN.md) ----
        // B3 "okładki": neutral graphite stage, covers bring the colour.
        // The whole app styles with stone-* classes, so the stone scale is
        // overridden here to retune every screen from one place.
        stone: {
          50: "#f5f5f7",
          100: "#e8e8ec",
          200: "#c9c9d1",
          300: "#a9a9b4",
          400: "#8a8a94",
          500: "#6c6c76",
          600: "#55555e",
          700: "#3a3a42",
          800: "#26262c",
          900: "#16161b",
          950: "#0e0e11",
        },
        base: {
          bg: "#0a0a0c",       // page
          card: "#16161b",     // card
          raised: "#26262c",   // hover / popover / hairline
        },
        ink: {
          DEFAULT: "#f5f5f7",
          muted: "#8a8a94",
          dim: "#6c6c76",
        },
        // Ogień (ember) — the single warm accent: primary CTA + 🔥 mechanic + active + focus.
        // Softened from neon #ff4500 to ember #f97316 to match the rounded, warmer skin.
        ogien: {
          DEFAULT: "#f97316",
          hover: "#fb923c",
          soft: "#f9731622",
          ring: "#f9731655",
        },
        // Róż — destructive ONLY, split out from ogień so "Usuń" ≠ reward
        danger: {
          DEFAULT: "#fb7185",
          solid: "#e11d48",
          soft: "#e11d4822",
          ring: "#e11d4855",
        },
      },
      fontFamily: {
        // Display switched from mono to Space Grotesk — mono said "terminal",
        // the repositioned brand says "modern builder". Mono stays for numbers.
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      borderRadius: {
        // B3 skin: 10px controls (--radius), 14px cards, pills for actions.
        lg: "14px",
        md: "12px",
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
