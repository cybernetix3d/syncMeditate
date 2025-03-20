import React from 'react';
import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';

export default function SettingsLayout() {
  const { signOut } = useAuth();
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerRight: () => (
          <TouchableOpacity 
            onPress={signOut}
            style={{ marginRight: 15 }}
          >
            <Ionicons name="log-out-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        )
      }}
    >
      <Stack.Screen 
        name="profile" 
        options={{ 
          title: "Settings",
          headerShown: true
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          title: "Privacy",
          headerShown: true
        }} 
      />
    </Stack>
  );
}