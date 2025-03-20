import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Redirect, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import 'react-native-reanimated';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { AuthProvider, useAuth } from '@/src/context/AuthProvider';
import { PrivacyProvider } from '@/src/context/PrivacyProvider';
import { MeditationProvider } from '@/src/context/MeditationProvider';
import { COLORS } from '@/src/constants/Styles';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <PrivacyProvider>
          <MeditationProvider>
            <RootLayoutNav />
          </MeditationProvider>
        </PrivacyProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

function AuthenticationGuard({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  
  // Check if user is in auth group
  const isInAuthGroup = segments[0] === 'auth';
  
  useEffect(() => {
    if (!isNavigationReady) {
      setIsNavigationReady(true);
      return;
    }
    
    if (loading) return;
    
    const isAuthenticated = !!user;
    
    if (
      // If the user is not authenticated but not in the auth group
      (!isAuthenticated && !isInAuthGroup) ||
      // Or if the user is on the root of the app without being authenticated
      (!isAuthenticated && segments.length === 0)
    ) {
      // Redirect to sign in page
      router.replace('/auth/sign-in');
    } else if (isAuthenticated && isInAuthGroup && segments[1] !== 'onboarding') {
      // If user is authenticated and trying to access auth screens (not onboarding)
      router.replace('/(tabs)');
    } else if (isAuthenticated && !user.display_name && segments[1] !== 'onboarding') {
      // If user is authenticated but hasn't completed onboarding
      router.replace('/auth/onboarding');
    }
  }, [user, loading, segments, isNavigationReady]);
  
  if (loading || !isNavigationReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 10, color: COLORS.gray }}>Loading...</Text>
      </View>
    );
  }
  
  return children;
}

function RootLayoutNav() {
  const { isDark } = useTheme();

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AuthenticationGuard>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="meditation" />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthenticationGuard>
    </NavigationThemeProvider>
  );
}