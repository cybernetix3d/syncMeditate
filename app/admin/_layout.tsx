// app/admin/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '../../src/constants/Styles';

export default function AdminLayout() {
  const router = useRouter();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ marginLeft: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: "Admin Dashboard",
        }} 
      />
      <Stack.Screen 
        name="events" 
        options={{ 
          title: "Event Management",
        }} 
      />
      <Stack.Screen 
        name="create" 
        options={{ 
          title: "Create Admin Event",
        }} 
      />
    </Stack>
  );
}