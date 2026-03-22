import { useEffect, useState } from "react";
import { getStoredTheme, setStoredTheme } from "./themeStorage";
import type { Theme } from "./themeStorage";
import { ThemeContext } from "./useTheme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    setStoredTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

