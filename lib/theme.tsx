// Everything Fitness design tokens — clean + minimal, athletic.
// Light and dark palettes share the same shape; ThemeProvider picks one and
// exposes it through useTheme() so every screen re-renders on toggle.
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Scheme = "light" | "dark";

const STORAGE_KEY = "@ef_theme";

const lightColors = {
  paper: "#FAFAF8",
  card: "#FFFFFF",
  ink: "#16181D",
  steel: "#667085",
  line: "#E8E8E4",
  cobalt: "#2447F0",
  cobaltSoft: "#E9EDFE",
  mint: "#17B26A",
  mintSoft: "#E4F7EE",
  amber: "#F79009",
  amberSoft: "#FEF2E2",
  coral: "#F04438",
  fat: "#8B5CF6",
  water: "#0BA5EC",
};

const darkColors = {
  paper: "#0E0F13",
  card: "#181A20",
  ink: "#F2F3F5",
  steel: "#93989F",
  line: "#2A2D35",
  cobalt: "#5B7CFF",
  cobaltSoft: "#1E2540",
  mint: "#2FD98A",
  mintSoft: "#123326",
  amber: "#FBA94C",
  amberSoft: "#3A2A10",
  coral: "#FF6B61",
  fat: "#A78BFA",
  water: "#3FC1F0",
};

export const palettes: Record<Scheme, typeof lightColors> = {
  light: lightColors,
  dark: darkColors,
};

// Backwards-compatible static export — defaults to light. Prefer useTheme() in
// components so colors update live when the user toggles dark mode.
export const colors = lightColors;

export const type = {
  display: "Archivo_700Bold",
  displayMed: "Archivo_600SemiBold",
  body: undefined as string | undefined,
};

export const space = (n: number) => n * 4;

export const radius = { card: 16, pill: 999, control: 12 };

export const shadow = {
  card: {
    shadowColor: "#16181D",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};

type ThemeCtxValue = {
  scheme: Scheme;
  colors: typeof lightColors;
  toggleScheme: () => void;
  setScheme: (s: Scheme) => void;
};

const ThemeCtx = createContext<ThemeCtxValue>({
  scheme: "light",
  colors: lightColors,
  toggleScheme: () => {},
  setScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setSchemeState] = useState<Scheme>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark") setSchemeState(v);
    });
  }, []);

  const setScheme = (s: Scheme) => {
    setSchemeState(s);
    AsyncStorage.setItem(STORAGE_KEY, s);
  };
  const toggleScheme = () => setScheme(scheme === "light" ? "dark" : "light");

  const value = useMemo(
    () => ({ scheme, colors: palettes[scheme], toggleScheme, setScheme }),
    [scheme],
  );

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
