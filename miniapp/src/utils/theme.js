const THEME_STORAGE_KEY = "ai-money-journal-theme";

const THEME_VARS = {
  light: {
    "--tg-theme-bg-color": "#ffffff",
    "--tg-theme-secondary-bg-color": "#f1f1f1",
    "--tg-theme-text-color": "#000000",
    "--tg-theme-hint-color": "#999999",
    "--tg-theme-link-color": "#2481cc",
    "--tg-theme-button-color": "#2481cc",
    "--tg-theme-button-text-color": "#ffffff",
    "--tg-theme-destructive-text-color": "#ff3b30",
  },
  dark: {
    "--tg-theme-bg-color": "#17212b",
    "--tg-theme-secondary-bg-color": "#232e3c",
    "--tg-theme-text-color": "#f5f5f5",
    "--tg-theme-hint-color": "#7d8b99",
    "--tg-theme-link-color": "#6ab3f3",
    "--tg-theme-button-color": "#5288c1",
    "--tg-theme-button-text-color": "#ffffff",
    "--tg-theme-destructive-text-color": "#ff595a",
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
