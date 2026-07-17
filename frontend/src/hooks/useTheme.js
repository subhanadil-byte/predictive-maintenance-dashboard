import { useCallback, useEffect, useState } from "react";

export function useTheme() {
  const [theme, setTheme] = useState("light"); // "dark" | "light" — light matches the login screen by default

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") root.classList.add("light");
    else root.classList.remove("light");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
