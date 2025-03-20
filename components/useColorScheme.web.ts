// NOTE: The default React Native styling doesn't support server rendering.
// Server rendered styles should not change between the first render of the HTML
// and the first render on the client. Typically, web developers will use CSS media queries
// to render different styles on the client and server, these aren't directly supported in React Native
// but can be achieved using a styling library like Nativewind.
import { useState, useEffect } from 'react';

const THEME_KEY = 'theme_preference';

export type ColorScheme = 'light' | 'dark';

export function useColorScheme() {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');

  useEffect(() => {
    // Load saved theme preference
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setColorScheme(savedTheme);
    }
  }, []);

  const setTheme = (theme: ColorScheme) => {
    setColorScheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  };

  return {
    colorScheme,
    setColorScheme: setTheme,
    systemColorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  };
}
