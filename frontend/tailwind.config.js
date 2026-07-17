/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Every color resolves through CSS variables (defined in index.css)
        // so the dark/light toggle can swap the whole neumorphic palette.
        void: "rgb(var(--color-void) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        edge: "rgb(var(--color-edge) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        cyan: {
          glow: "rgb(var(--color-accent-glow) / <alpha-value>)",
          core: "rgb(var(--color-accent-core) / <alpha-value>)",
        },
        amber: {
          alert: "rgb(var(--color-amber) / <alpha-value>)",
        },
        crimson: {
          critical: "rgb(var(--color-crimson) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["'Chakra Petch'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        body: ["'Inter'", "sans-serif"],
      },
      boxShadow: {
        // These two ARE the neumorphic "raised" effect now (soft light/dark
        // shadow pair). "glow-crimson" adds a red tint on top for alert cards.
        "glow-cyan": "9px 9px 16px var(--nm-shadow-dark), -9px -9px 16px var(--nm-shadow-light)",
        "glow-crimson": "9px 9px 16px var(--nm-shadow-dark), -9px -9px 16px var(--nm-shadow-light), 0 0 20px rgb(var(--color-crimson) / 0.4)",
        "nm-pressed": "inset 6px 6px 12px var(--nm-shadow-dark), inset -6px -6px 12px var(--nm-shadow-light)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: 0.6 },
          "50%": { opacity: 1 },
        },
      },
      animation: {
        scanline: "scanline 4s linear infinite",
        pulseGlow: "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
