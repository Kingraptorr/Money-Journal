const THEME_STORAGE_KEY = "ai-money-journal-theme";

export const ACCENT_PRIMARY = "#3DDC97";
export const DELETE_COLOR = "#D9534F";

const THEME_VARS = {
  light: {
    "--tg-theme-bg-color": "#f0f0f0",
    "--tg-theme-secondary-bg-color": "rgba(255,255,255,.55)",
    "--tg-theme-text-color": "#111111",
    "--tg-theme-hint-color": "#7a7a7a",
    "--tg-theme-link-color": ACCENT_PRIMARY,
    "--tg-theme-button-color": ACCENT_PRIMARY,
    "--tg-theme-button-text-color": "#ffffff",
    "--tg-theme-destructive-text-color": DELETE_COLOR,
    "--app-subtle-bg": "#eeeeee",
    "--app-track-bg": "rgba(0,0,0,.06)",
    "--app-divider-color": "rgba(0,0,0,.06)",
    "--app-glass-border": "rgba(255,255,255,.6)",
    "--app-shadow": "0 10px 26px -16px rgba(0,0,0,.14)",
    "--app-theme-icon-color": "#6C7AE0",
    "--app-theme-icon-bg": "rgba(108,122,224,.15)",
    "--app-delete-bg": "rgba(217,83,79,.1)",
    "--app-hero-text": "#111111",
    "--app-hero-subtext": "rgba(0,0,0,.72)",
    "--app-hero-chip-bg": "rgba(0,0,0,.08)",
  },
  dark: {
    "--tg-theme-bg-color": "#0d0d0d",
    "--tg-theme-secondary-bg-color": "rgba(30,30,30,.55)",
    "--tg-theme-text-color": "#f2f2f2",
    "--tg-theme-hint-color": "#8a8a8a",
    "--tg-theme-link-color": ACCENT_PRIMARY,
    "--tg-theme-button-color": ACCENT_PRIMARY,
    "--tg-theme-button-text-color": "#ffffff",
    "--tg-theme-destructive-text-color": DELETE_COLOR,
    "--app-subtle-bg": "#262626",
    "--app-track-bg": "rgba(255,255,255,.08)",
    "--app-divider-color": "rgba(255,255,255,.07)",
    "--app-glass-border": "rgba(255,255,255,.12)",
    "--app-shadow": "0 10px 26px -16px rgba(0,0,0,.6)",
    "--app-theme-icon-color": "#E8A33D",
    "--app-theme-icon-bg": "rgba(232,163,61,.15)",
    "--app-delete-bg": "rgba(217,83,79,.16)",
    "--app-hero-text": "#111111",
    "--app-hero-subtext": "rgba(0,0,0,.72)",
    "--app-hero-chip-bg": "rgba(0,0,0,.08)",
  },
};

export function applyTheme(theme) {
  const vars = THEME_VARS[theme] ?? THEME_VARS.light;
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

export function getInitialTheme() {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function persistTheme(theme) {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
