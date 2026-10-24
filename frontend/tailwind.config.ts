import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Fonts ───────────────────────────────────────────────────────────
      fontFamily: {
        lexend: ["Lexend", "sans-serif"],
        opendyslexic: ["OpenDyslexic", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
        sans: ["Lexend", "sans-serif"], // override default
      },

      // ─── Pastel Colour Palette ───────────────────────────────────────────
      colors: {
        indigo: colors.blue,
        violet: colors.blue,
        sky: {
          pastel: "rgb(var(--color-sky-pastel-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-sky-accent-rgb) / <alpha-value>)",
        },
        mint: {
          pastel: "rgb(var(--color-mint-pastel-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-mint-accent-rgb) / <alpha-value>)",
        },
        lavender: {
          pastel: "rgb(var(--color-lavender-pastel-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-lavender-accent-rgb) / <alpha-value>)",
        },
        peach: {
          pastel: "rgb(var(--color-peach-pastel-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-peach-accent-rgb) / <alpha-value>)",
        },
        sunshine: {
          pastel: "rgb(var(--color-sunshine-pastel-rgb) / <alpha-value>)",
          accent: "rgb(var(--color-sunshine-accent-rgb) / <alpha-value>)",
        },
        // Neutral page background
        page: "rgb(var(--color-page-bg-rgb) / <alpha-value>)",
        ink: "var(--color-ink)",
        muted: "var(--color-text-muted)",
        subtle: "var(--color-text-subtle)",
        focus: "var(--color-focus)",
        surface: {
          DEFAULT: "var(--color-surface)",
          warm: "var(--color-surface-warm)",
          soft: "var(--color-surface-soft)",
        },
        border: {
          subtle: "var(--color-border-subtle)",
          strong: "var(--color-border-strong)",
        },
        success: "var(--color-success-text)",
        warning: "var(--color-warning-text)",
        error: "var(--color-error-text)",
      },

      // ─── Border Radius ───────────────────────────────────────────────────
      borderRadius: {
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        control: "var(--radius-control)",
        button: "var(--radius-button)",
      },

      // ─── Font Sizes (dyslexia-friendly — minimum 18 px) ──────────────────
      fontSize: {
        base: ["18px", { lineHeight: "1.8", letterSpacing: "0.05em" }],
        lg:   ["22px", { lineHeight: "1.8", letterSpacing: "0.05em" }],
        xl:   ["26px", { lineHeight: "1.8", letterSpacing: "0.05em" }],
        "2xl":["32px", { lineHeight: "1.75", letterSpacing: "0.03em" }],
        "3xl":["40px", { lineHeight: "1.6",  letterSpacing: "0.02em" }],
        caption: ["13px", { lineHeight: "1.4" }],
        "body-sm": ["15px", { lineHeight: "1.6" }],
        heading: ["36px", { lineHeight: "var(--line-height-heading)", letterSpacing: "-0.02em" }],
        display: ["48px", { lineHeight: "var(--line-height-heading)", letterSpacing: "-0.02em" }],
        // Game-specific (children tap targets)
        game: ["24px", { lineHeight: "1.6",  letterSpacing: "0.05em" }],
        "game-target": ["36px", { lineHeight: "1.5", letterSpacing: "0.05em" }],
      },

      // ─── Letter Spacing ──────────────────────────────────────────────────
      letterSpacing: {
        dyslexia: "0.05em",
        wide: "0.08em",
      },

      // ─── Line Height ─────────────────────────────────────────────────────
      lineHeight: {
        reading: "1.8",
        relaxed: "1.625",
        heading: "var(--line-height-heading)",
      },

      // ─── Box Shadow (soft, no harsh drop shadows) ────────────────────────
      boxShadow: {
        card: "var(--shadow-panel)",
        "card-hover": "var(--shadow-panel-hover)",
        btn: "var(--shadow-action)",
        "btn-mint": "var(--shadow-action-mint)",
        panel: "var(--shadow-panel)",
      },

      // ─── Spacing extras ──────────────────────────────────────────────────
      spacing: {
        page: "var(--space-page)",
        section: "var(--space-section)",
        card: "var(--space-card)",
        control: "var(--space-control)",
        "touch": "44px",   // minimum touch target
        "18": "4.5rem",
        "22": "5.5rem",
      },

      // ─── Animations ──────────────────────────────────────────────────────
      keyframes: {
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":       { transform: "translateY(-6px)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%":      { transform: "rotate(3deg)" },
        },
        "pop": {
          "0%":   { transform: "scale(0.92)", opacity: "0" },
          "60%":  { transform: "scale(1.04)" },
          "100%": { transform: "scale(1)",    opacity: "1" },
        },
      },
      animation: {
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        "wiggle": "wiggle 0.4s ease-in-out",
        "pop": "pop 0.25s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
