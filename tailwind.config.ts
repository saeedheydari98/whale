import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/design-system/**/*.{ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        ui: {
          primary: "var(--ui-primary)",
          secondary: "var(--ui-secondary)",
          success: "var(--ui-success)",
          danger: "var(--ui-danger)",
          warning: "var(--ui-warning)",
          info: "var(--ui-info)",
        },

        bg: {
          base: "var(--bg-base)",
          surface: "var(--bg-surface)",
        },

        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted: "var(--text-muted)",
        },

        border: {
          default: "var(--border-default)",
        },
      },

      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        xxl: "32px",
        full: "999px",
      },

      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        xxl: "40px",
        xxxl: "48px",
      },
    },
  },

  plugins: [],
} satisfies Config;