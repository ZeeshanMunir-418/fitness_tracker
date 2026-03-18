import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setTheme } from "@/store/slices/themeSlice";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

interface ThemeColors {
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderMuted: string;
  inputBg: string;
}

interface ThemeContextValue {
  isDark: boolean;
  followSystem: boolean;
  colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const LIGHT_COLORS: ThemeColors = {
  background: "#ffffff",
  card: "#f9fafb",
  cardBorder: "#f3f4f6",
  text: "#000000",
  textMuted: "#6b7280",
  textFaint: "#9ca3af",
  border: "#000000",
  borderMuted: "#e5e7eb",
  inputBg: "#ffffff",
};

const DARK_COLORS: ThemeColors = {
  background: "#000000",
  card: "#171717",
  cardBorder: "#262626",
  text: "#ffffff",
  textMuted: "#a3a3a3",
  textFaint: "#737373",
  border: "#ffffff",
  borderMuted: "#404040",
  inputBg: "#0a0a0a",
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const systemScheme = useColorScheme();
  const isDark = useAppSelector((s) => s.theme.isDark);
  const followSystem = useAppSelector((s) => s.theme.followSystem);

  useEffect(() => {
    if (!followSystem) {
      return;
    }

    const systemIsDark = systemScheme === "dark";
    if (systemIsDark !== isDark) {
      dispatch(
        setTheme({
          isDark: systemIsDark,
          persist: false,
          followSystem: true,
        }),
      );
    }
  }, [dispatch, followSystem, isDark, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      followSystem,
      colors: isDark ? DARK_COLORS : LIGHT_COLORS,
    }),
    [isDark, followSystem],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};
