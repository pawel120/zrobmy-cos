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

        // ---- app-specific tokens (BuildTogether palette — see DESIGN.md) ----
        // Warm graphite (stone) base — replaces the old cold OLED black / zinc.
        base: {
          bg: "#0c0a09",       // page (stone-950)
          card: "#1c1917",     // card (stone-900)
          raised: "#292524",   // hover / popover / hairline (stone-800)
        },
        ink: {
          DEFAULT: "#fafaf9",  // stone-50
          muted: "#a8a29e",    // stone-400
          dim: "#78716c",      // stone-500
        },
        // Ogień — the single warm accent: primary CTA + 🔥 mechanic + active + focus
        ogien: {
          DEFAULT: "#ff4500",
          hover: "#ff5a1f",
          soft: "#ff450022",
          ring: "#ff450055",
        },
        // Fiolet — community / status / presence, held to ~20% (rule R1 in DESIGN.md)
        fiolet: {
          DEFAULT: "#a78bfa",
          solid: "#7c3aed",
          soft: "#8b5cf622",
          ring: "#8b5cf655",
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
