import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ACE Brand Palette (Navy #002C5F + Amber #FCAC04)
        primary: "#002C5F",
        "primary-dark": "#001F43",
        "primary-soft": "#EEF3F9",
        "on-primary": "#ffffff",
        "primary-container": "#081F3E",
        "on-primary-container": "#A4BFDD",
        "primary-fixed": "#D6E4F4",

        // Signature Amber Accent
        accent: "#FCAC04",
        "accent-hover": "#E59B00",
        "accent-container": "#FFF5E0",
        "on-accent": "#1A1202",

        secondary: "#4A5568",
        "on-secondary": "#ffffff",
        "secondary-container": "#E2E8F0",
        "on-secondary-container": "#2D3748",

        surface: "#f9f9fb",
        "surface-dim": "#d8dce6",
        "surface-bright": "#f9f9fb",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f4f8",
        "surface-container": "#eaedf4",
        "surface-container-high": "#e2e6ef",
        "surface-container-highest": "#d9dfeb",
        "on-surface": "#0b1320",
        "on-surface-variant": "#475266",

        outline: "#64748B",
        "outline-variant": "#D4D8E2",

        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",

        success: "#2d6a4f",
        "success-container": "#d8f3dc",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Playfair Display", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
      maxWidth: {
        "container-max": "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
