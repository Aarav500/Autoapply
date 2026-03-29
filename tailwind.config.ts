import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        base:     "var(--bg-base)",
        surface:  "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        overlay:  "var(--bg-overlay)",
        accent: {
          DEFAULT: "#7C3AED",
          bright:  "#8B5CF6",
          light:   "#A78BFA",
          dim:     "#5B21B6",
          muted:   "rgba(124, 58, 237, 0.13)",
        },
        teal: {
          DEFAULT: "#06B6D4",
          muted:   "rgba(6, 182, 212, 0.12)",
        },
        ink: {
          primary:   "#F0F0FF",
          secondary: "#9090B8",
          muted:     "#3A3A60",
          accent:    "#A78BFA",
        },
        status: {
          green: "#34D399",
          amber: "#FBBF24",
          red:   "#F87171",
          blue:  "#60A5FA",
        },
      },
      fontFamily: {
        sans:    ["'Inter'", "system-ui", "sans-serif"],
        display: ["'Inter'", "system-ui", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      borderColor: {
        subtle: "rgba(255, 255, 255, 0.05)",
        medium: "rgba(255, 255, 255, 0.08)",
        strong: "rgba(255, 255, 255, 0.13)",
      },
      borderRadius: {
        sm:  "6px",
        md:  "8px",
        lg:  "12px",
        xl:  "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
      boxShadow: {
        card:        "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
        "violet-glow": "0 8px 24px rgba(124,58,237,0.4)",
        "violet-sm":   "0 4px 12px rgba(124,58,237,0.3)",
        "teal-glow":   "0 6px 20px rgba(6,182,212,0.3)",
        "green-glow":  "0 4px 14px rgba(52,211,153,0.3)",
      },
      animation: {
        shimmer:   "shimmer 1.6s infinite",
        "float-up": "float-up 0.4s ease forwards",
        "scale-in": "scale-in 0.25s ease forwards",
        "glow-pulse":"glow-pulse 2s ease-in-out infinite",
        "spin-slow": "spin-slow 8s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
