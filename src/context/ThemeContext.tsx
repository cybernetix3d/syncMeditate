import React, { createContext, useContext, ReactNode } from 'react';
import useColorScheme from '@/src/hooks/useColorScheme';
import { getThemeColors } from '@/src/constants/Styles';

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  colors: ReturnType<typeof getThemeColors>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { colorScheme, setColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  const toggleTheme = () => {
    setColorScheme(isDark ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
} 