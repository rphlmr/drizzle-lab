import { createContext, useContext } from "react";

export type Theme = "dark" | "light";

const ThemeContext = createContext<Theme>("dark");

export const ThemeProvider = ThemeContext.Provider;

export function useTheme() {
  return useContext(ThemeContext);
}
