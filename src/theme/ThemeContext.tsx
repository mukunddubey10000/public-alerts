import React, { createContext, useContext, useState, useCallback } from "react";

export interface Theme {
  dark: boolean;
  colors: {
    // Core
    background: string;
    surface: string;
    surfaceElevated: string;
    primary: string;
    primaryLight: string;
    accent: string;
    // Text
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    // UI
    border: string;
    separator: string;
    overlay: string;
    // Status
    success: string;
    warning: string;
    error: string;
    // Incident
    accident: string;
    outage: string;
    construction: string;
    hazard: string;
    // Cards
    cardBg: string;
    cardShadow: string;
    // Input
    inputBg: string;
    inputBorder: string;
    inputText: string;
    placeholder: string;
    // Badge
    badgeBg: string;
    unreadBg: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
}

const lightTheme: Theme = {
  dark: false,
  colors: {
    background: "#F0F2F5",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFFFF",
    primary: "#6C5CE7",
    primaryLight: "#A29BFE",
    accent: "#00CEC9",
    text: "#1A1A2E",
    textSecondary: "#636E72",
    textMuted: "#B2BEC3",
    textInverse: "#FFFFFF",
    border: "#E0E0E0",
    separator: "#F0F0F0",
    overlay: "rgba(0, 0, 0, 0.5)",
    success: "#00B894",
    warning: "#FDCB6E",
    error: "#E17055",
    accident: "#FF6B6B",
    outage: "#FECA57",
    construction: "#FF9F43",
    hazard: "#EE5A24",
    cardBg: "#FFFFFF",
    cardShadow: "#000",
    inputBg: "#F8F9FA",
    inputBorder: "#DEE2E6",
    inputText: "#1A1A2E",
    placeholder: "#ADB5BD",
    badgeBg: "#FF6B6B",
    unreadBg: "#EDE7F6",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 6, md: 12, lg: 16, xl: 24, full: 999 },
};

const darkTheme: Theme = {
  dark: true,
  colors: {
    background: "#0D1117",
    surface: "#161B22",
    surfaceElevated: "#1C2333",
    primary: "#A29BFE",
    primaryLight: "#6C5CE7",
    accent: "#55EFC4",
    text: "#E6EDF3",
    textSecondary: "#8B949E",
    textMuted: "#484F58",
    textInverse: "#0D1117",
    border: "#30363D",
    separator: "#21262D",
    overlay: "rgba(0, 0, 0, 0.7)",
    success: "#55EFC4",
    warning: "#FECA57",
    error: "#FF6B6B",
    accident: "#FF6B6B",
    outage: "#FECA57",
    construction: "#FF9F43",
    hazard: "#EE5A24",
    cardBg: "#161B22",
    cardShadow: "#000",
    inputBg: "#1C2333",
    inputBorder: "#30363D",
    inputText: "#E6EDF3",
    placeholder: "#484F58",
    badgeBg: "#FF6B6B",
    unreadBg: "#1C2333",
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 6, md: 12, lg: 16, xl: 24, full: 999 },
};

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev);
  }, []);

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export { lightTheme, darkTheme };
