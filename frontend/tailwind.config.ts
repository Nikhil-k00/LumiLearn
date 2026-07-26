import type { Config } from "tailwindcss";

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
        sans: ["Lexend", "sans-serif"], // override default
      },

      // ─── Pastel Colour Palette ───────────────────────────────────────────
      colors: {
        sky: {
          pastel: "#E0F2FE",
          accent: "#7DD3FC",
        },
        mint: {
          pastel: "#D1FAE5",
          accent: "#6EE7B7",
        },
        lavender: {
          pastel: "#EDE9FE",
          accent: "#C4B5FD",
        },
        peach: {
          pastel: "#FEE2E2",
          accent: "#FCA5A5",
        },
        sunshine: {
          pastel: "#FEF9C3",
          accent: "#FDE047",
        },
        // Neutral page background
        page: "#F8F7FF",
      },

      // ─── Border Radius ───────────────────────────────────────────────────
      borderRadius: {
        card: "1.5rem",   // rounded-3xl equivalent
        button: "9999px", // rounded-full equivalent
      },

      // ─── Font Sizes (dyslexia-friendly — minimum 18 px) ──────────────────
      fontSize: {
        base: ["18px", { lineHeight: "1.8", letterSpacing: "0.05em" }],
        lg:   ["22px", { lineHeight: "1.8", letterSpacing: "0.05em" }],
        xl:   ["26px", { lineHeight: "1.8", letterSpacing: "0.05em" }],
        "2xl":["32px", { lineHeight: "1.75", letterSpacing: "0.03em" }],
        "3xl":["40px", { lineHeight: "1.6",  letterSpacing: "0.02em" }],
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
      },

      // ─── Box Shadow (soft, no harsh drop shadows) ────────────────────────
      boxShadow: {
        card: "0 4px 24px 0 rgba(139, 92, 246, 0.07), 0 1px 4px 0 rgba(0,0,0,0.04)",
        "card-hover": "0 8px 32px 0 rgba(139, 92, 246, 0.12), 0 2px 8px 0 rgba(0,0,0,0.06)",
        btn: "0 2px 12px 0 rgba(125, 211, 252, 0.25)",
        "btn-mint": "0 2px 12px 0 rgba(110, 231, 183, 0.3)",
      },

      // ─── Spacing extras ──────────────────────────────────────────────────
      spacing: {
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
