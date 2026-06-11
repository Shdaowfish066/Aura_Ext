import type { Config } from "tailwindcss";

// Tokens map 1:1 to the CSS variables declared in src/newtab/index.css, which
// are the exact values from the CLAUDE.md design system.
export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        base: "var(--bg-base)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        primary: "var(--accent-primary)",
        secondary: "var(--accent-secondary)",
        warm: "var(--accent-warm)",
        ink: "var(--text-primary)",
        subtle: "var(--text-secondary)",
        faint: "var(--text-muted)",
        hairline: "var(--border)",
        glass: "var(--glass)",
      },
      fontFamily: {
        display: ['"Clash Display"', "system-ui", "sans-serif"],
        body: ['"Satoshi"', "system-ui", "sans-serif"],
      },
      backgroundImage: {
        hero: "var(--gradient-hero)",
      },
      boxShadow: {
        glow: "0 0 18px 2px var(--glow)",
      },
    },
  },
  plugins: [],
} satisfies Config;
