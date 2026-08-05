export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-theme-bg-color)",
          bg2: "var(--tg-theme-secondary-bg-color)",
          text: "var(--tg-theme-text-color)",
          hint: "var(--tg-theme-hint-color)",
          link: "var(--tg-theme-link-color)",
          button: "var(--tg-theme-button-color)",
          buttonText: "var(--tg-theme-button-text-color)",
          destructive: "var(--tg-theme-destructive-text-color)",
          subtle: "var(--app-subtle-bg)",
          track: "var(--app-track-bg)",
          divider: "var(--app-divider-color)",
          glassBorder: "var(--app-glass-border)",
          deleteBg: "var(--app-delete-bg)",
        },
      },
      fontFamily: {
        sans: ["Vazirmatn", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        glass: "var(--app-shadow)",
      },
    },
  },
  plugins: [],
};
