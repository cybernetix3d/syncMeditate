import React from 'react';
import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';

export default function SettingsLayout() {
  const { signOut } = useAuth();
  const { colors } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.primary,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerRight: () => (
          <TouchableOpacity 
            onPress={handleSignOut}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Settings",
        }} 
      />
      <Stack.Screen 
        name="profile" 
        options={{ 
          title: "Edit Profile",
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          title: "Privacy",
        }} 
      />
    </Stack>
  );
}