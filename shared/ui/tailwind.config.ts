import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "../../shared/ui/src/**/*.{ts,tsx}",
    "../../packages/visualizer/src/**/*.{ts,tsx}",
  ],
  blocklist: [],
  prefix: "dzl-",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        red: "hsl(var(--dzl-red))",
        blue: "hsl(var(--dzl-blue))",
        green: "var(--dzl-green)",
        border: "hsl(var(--dzl-border))",
        input: "hsl(var(--dzl-input))",
        ring: "hsl(var(--dzl-ring))",
        background: "hsl(var(--dzl-background))",
        foreground: "hsl(var(--dzl-foreground))",
        primary: {
          DEFAULT: "hsl(var(--dzl-primary))",
          foreground: "hsl(var(--dzl-primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--dzl-secondary))",
          foreground: "hsl(var(--dzl-secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--dzl-destructive))",
          foreground: "hsl(var(--dzl-destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--dzl-muted))",
          foreground: "hsl(var(--dzl-muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--dzl-accent))",
          foreground: "hsl(var(--dzl-accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--dzl-popover))",
          foreground: "hsl(var(--dzl-popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--dzl-card))",
          foreground: "hsl(var(--dzl-card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--dzl-radius)",
        md: "calc(var(--dzl-radius) - 2px)",
        sm: "calc(var(--dzl-radius) - 4px)",
      },
      keyframes: {
        "dzl-accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "dzl-accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "dzl-accordion-down": "dzl-accordion-down 0.2s ease-out",
        "dzl-accordion-up": "dzl-accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("tailwind-scrollbar")],
} satisfies Config;

export default config;
