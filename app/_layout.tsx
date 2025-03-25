import React, { useEffect, useState } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, Redirect, useRouter, useSegments, Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { View, ActivityIndicator, Text } from 'react-native';
import 'react-native-reanimated';
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext';
import { AuthProvider, useAuth } from '@/src/context/AuthProvider';
import { PrivacyProvider } from '@/src/context/PrivacyProvider';
import { MeditationProvider } from '@/src/context/MeditationProvider';
import { COLORS } from '@/src/constants/Styles';
import { createSolarEvents } from '@/app/events/create';
import { supabase, ensureRSVPAndNotificationTables, migrateMeditationHistory } from '@/src/api/supabase';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, setupNotificationListeners } from '@/src/services/NotificationService';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
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
  const segments = useSegments() as string[];
  const router = useRouter();
  
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  
  // Check if user is in auth group and current screen
  const isInAuthGroup = segments[0] === 'auth';
  const isOnboardingScreen = segments.length > 1 && segments[0] === 'auth' && segments[1] === 'onboarding';
  const isLandingPage = segments.length === 1 && segments[0] === 'index';
  const isRootPath = segments.length === 0 || (segments.length === 1 && segments[0] === '');
  const isDebugPage = segments.length === 1 && segments[0] === 'debug';
  
  console.log('Auth Guard State:', { 
    user: user ? (typeof user === 'boolean' ? 'true (no profile)' : 'object (has profile)') : 'false', 
    loading,
    segments,
    isNavigationReady,
    isInAuthGroup,
    isLandingPage,
    isRootPath,
    isDebugPage
  });
  
  useEffect(() => {
    // Only set navigation ready once mounting is complete
    if (!isNavigationReady) {
      console.log('Setting navigation ready');
      setIsNavigationReady(true);
      return;
    }
  }, []);
  
  useEffect(() => {
    // Don't try to navigate until navigation is ready and loading is complete
    if (!isNavigationReady || loading) {
      console.log('Skipping navigation - not ready or still loading');
      return;
    }
    
    // Allow access to landing page, root path, or debug page without authentication
    if (isLandingPage || isRootPath || isDebugPage) {
      console.log('Allowing access to public page:', segments.join('/'));
      return;
    }
    
    // User is not authenticated (user === false)
    if (user === false) {
      console.log('User not authenticated, current path:', segments.join('/'));
      // Only redirect if not already in auth group
      if (!isInAuthGroup && !isLandingPage) {
        console.log('Redirecting to sign-in');
        router.replace('/auth/sign-in');
      }
      return;
    }
    
    // User is authenticated (user === true or user is an object)
    console.log('User authenticated:', typeof user === 'boolean' ? 'No profile' : 'Has profile');
    
    // If the user is authenticated and trying to access auth screens (not onboarding)
    if (user && isInAuthGroup && !isOnboardingScreen) {
      console.log('Authenticated user trying to access auth screen, redirecting to tabs');
      router.replace('/(tabs)');
      return;
    }
    
    // If user is authenticated but hasn't completed onboarding
    // This checks if user is true (authenticated but no profile)
    // or if user is an object but doesn't have a display_name
    if (
      (user === true || 
       (typeof user === 'object' && user !== null && !user.display_name)) && 
      !isOnboardingScreen
    ) {
      console.log('User needs onboarding, redirecting');
      router.replace('/auth/onboarding');
      return;
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
  const [pushToken, setPushToken] = useState<string | undefined>(undefined);
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize app services
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize solar events
        try {
          await initializeSolarEvents();
        } catch (solarErr) {
          console.error('Solar events initialization error:', solarErr);
          // Continue anyway as this is not critical
        }
        
        // Initialize database tables for RSVPs and notifications
        try {
          await ensureRSVPAndNotificationTables();
          
          // Run the migration from user_meditation_history to meditation_completions
          try {
            await migrateMeditationHistory();
          } catch (e) {
            console.error('Meditation history migration error:', e);
          }
        } catch (dbErr) {
          console.log('Database tables initialization error:', dbErr);
          // The app will still function, users just won't be able to RSVP until tables are created
        }
        
        // Initialize push notifications
        try {
          const token = await registerForPushNotificationsAsync();
          if (token) {
            setPushToken(token);
            console.log('Push Notification Token:', token);
          } else {
            console.log('No push token obtained - continuing without push notifications');
          }
        } catch (notifErr) {
          console.error('Push notification initialization error:', notifErr);
          // Continue without push notifications
        }
      } catch (err) {
        console.error('Failed to initialize app services:', err);
        setInitError('Failed to initialize app. Some features may not work correctly.');
      }
    };

    initializeApp();
  }, []);

  // Setup notification listeners
  useEffect(() => {
    let cleanupListeners = () => {};
    try {
      cleanupListeners = setupNotificationListeners((notification) => {
        console.log('Notification received:', notification);
      });
    } catch (error) {
      console.error('Error setting up notification listeners:', error);
    }
    
    return () => {
      try {
        cleanupListeners();
      } catch (error) {
        console.error('Error cleaning up notification listeners:', error);
      }
    };
  }, []);

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AuthenticationGuard>
        {/* Use only one navigator - Slot for development, Stack for production */}
        {__DEV__ ? (
          <Slot />
        ) : (
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
            <Stack.Screen name="events/create" options={{ headerShown: false }} />
            <Stack.Screen name="meditation/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="meditation/sync" options={{ headerShown: false }} />
            <Stack.Screen name="history" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="settings/privacy" options={{ headerShown: false }} />
            <Stack.Screen name="settings/theme" options={{ headerShown: false }} />
            <Stack.Screen name="settings/about" options={{ headerShown: false }} />
            <Stack.Screen name="settings/account" options={{ headerShown: false }} />
            <Stack.Screen name="settings/notifications" options={{ headerShown: false }} />
          </Stack>
        )}
      </AuthenticationGuard>
    </NavigationThemeProvider>
  );
}

async function initializeSolarEvents() {
  try {
    console.log("Checking for solar events initialization");
    
    // Get current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log('Checking for events between:', today.toISOString(), 'and', tomorrow.toISOString());
    
    // Check if we have any solar events for today
    try {
      const { data, error } = await supabase
        .from('meditation_events')
        .select('id, title, start_time')
        .or(`title.ilike.%Sunrise%,title.ilike.%Midday%,title.ilike.%Sunset%,title.ilike.%Midnight%`)
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString());
      
      if (error) {
        console.error("Error checking for solar events:", error);
        // Try to create events anyway
        await createSolarEvents();
        return;
      }
      
      if (!data || data.length < 4) {
        console.log(`Found only ${data?.length || 0} solar events for today, creating new ones`);
        const success = await createSolarEvents();
        if (success) {
          console.log("Successfully created solar events");
        } else {
          console.error("Failed to create solar events");
        }
      } else {
        console.log(`Found ${data.length} solar events for today (${data.map(e => e.title).join(', ')})`);
      }
    } catch (queryError) {
      console.error("Error querying for solar events:", queryError);
      // Try to create events anyway as a fallback
      await createSolarEvents();
    }
  } catch (error) {
    console.error("Error initializing solar events:", error);
  }
}