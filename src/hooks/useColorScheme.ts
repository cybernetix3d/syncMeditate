import { useColorScheme as _useColorScheme } from 'react-native';
import { useState, useEffect } from 'react';

// The useColorScheme value is always either light or dark, but the built-in
// type suggests that it can be null. This will not happen in practice, so this
// makes it a bit easier to work with.
export default function useColorScheme() {
  const systemColorScheme = _useColorScheme() as 'light' | 'dark';
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(systemColorScheme);

  useEffect(() => {
    setColorScheme(systemColorScheme);
  }, [systemColorScheme]);

  return { colorScheme, setColorScheme };
} 