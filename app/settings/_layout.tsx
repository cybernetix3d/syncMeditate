import React from 'react';
import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="profile" 
        options={{ 
          headerShown: false 
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          headerShown: false 
        }} 
      />
    </Stack>
  );
}