import { create } from "zustand";

export const THEME_STORAGE_KEY = "linguae-theme";

export function resolveTheme(value) {
  return value === "light" ? "light" : "dark";
}

const THEME_COLOR = {
  dark: "#190718",
  light: "#DDE3E8",
};

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
}

function readTheme() {
  try {
    return resolveTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "dark";
  }
}

const initialTheme = readTheme();

try {
  localStorage.setItem(THEME_STORAGE_KEY, initialTheme);
} catch {
  // Private mode can block storage. The attribute still updates.
}

applyTheme(initialTheme);

export const useThemeStore = create((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    const next = resolveTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Ignore storage failures and still switch the document theme.
    }
    applyTheme(next);
    set({ theme: next });
  },
}));
