import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        ink: {
          1: "var(--ink-1)",
          2: "var(--ink-2)",
          3: "var(--ink-3)",
        },
        line: {
          DEFAULT: "var(--line)",
          2: "var(--line-2)",
        },
        accent: "var(--accent)",
        status: {
          pending: "var(--status-pending)",
          "pending-bg": "var(--status-pending-bg)",
          confirmed: "var(--status-confirmed)",
          "confirmed-bg": "var(--status-confirmed-bg)",
          "cancelled-bg": "var(--status-cancelled-bg)",
        },
        danger: "var(--danger)",
        whatsapp: "#25D366",
      },
      fontFamily: {
        sans: ["var(--font-inter-tight)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        hero: ["36px", { lineHeight: "1.05", letterSpacing: "-1px" }],
        "screen-title": ["28px", { lineHeight: "1.05", letterSpacing: "-0.5px" }],
        "sheet-title": ["22px", { lineHeight: "1.1", letterSpacing: "-0.4px" }],
        "card-title": ["20px", { lineHeight: "1.2", letterSpacing: "-0.3px" }],
      },
      borderRadius: {
        sm: "10px",
        DEFAULT: "14px",
        lg: "22px",
        full: "999px",
      },
      boxShadow: {
        fab: "0 8px 20px rgba(15,15,14,0.25), 0 2px 6px rgba(15,15,14,0.15)",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200px 0" },
          "100%": { backgroundPosition: "200px 0" },
        },
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.4)", opacity: "0.4" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
        "pulse-dot": "pulseDot 2s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
