import { useState, useEffect } from 'react';
import { useColorScheme as _useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@theme_preference';

export type ColorScheme = 'light' | 'dark';

export function useColorScheme() {
  const systemColorScheme = _useColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme | null>(null);

  useEffect(() => {
    // Load saved theme preference
    AsyncStorage.getItem(THEME_KEY).then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setColorScheme(savedTheme);
      } else {
        setColorScheme(systemColorScheme || 'light');
      }
    });
  }, [systemColorScheme]);

  const setTheme = async (theme: ColorScheme) => {
    setColorScheme(theme);
    await AsyncStorage.setItem(THEME_KEY, theme);
  };

  return {
    colorScheme: colorScheme || 'light',
    setColorScheme: setTheme,
    systemColorScheme
  };
}
