import { useState, useEffect } from 'react';

const THEME_KEY = 'theme_preference';

export type ColorScheme = 'light' | 'dark';

// The useColorScheme value is always either light or dark, but the built-in
// type suggests that it can be null. This will not happen in practice, so this
// makes it a bit easier to work with.
export default function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    // Try to load theme from localStorage during initialization
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem(THEME_KEY) : null;
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light';
  });

  useEffect(() => {
    // Load saved theme preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setColorScheme(savedTheme);
      }
    }
  }, []);

  const setTheme = (theme: ColorScheme) => {
    setColorScheme(theme);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_KEY, theme);
    }
  };

  return {
    colorScheme,
    setColorScheme: setTheme,
    systemColorScheme: typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  };
} 