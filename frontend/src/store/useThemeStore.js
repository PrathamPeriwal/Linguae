import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("linguae-theme") || "coffee",
  setTheme: (theme) => {
    localStorage.setItem("linguae-theme", theme);
    set({ theme });
  },
}));
