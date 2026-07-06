import { useEffect, useState } from "react";
import type { Theme } from "../types";

const STORAGE_KEY = "toll-fraud-theme";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(STORAGE_KEY) as Theme) || "light");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    setTheme,
    toggleTheme: () => setTheme((current) => (current === "light" ? "dark" : "light")),
  };
}
