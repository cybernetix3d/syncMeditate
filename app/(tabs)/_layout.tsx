import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1A2151',
        tabBarInactiveTintColor: '#888888',
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
          elevation: 0,
          shadowOpacity: 0.1,
          paddingTop: 5,
          height: 60
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Meditate',
          tabBarIcon: ({ color }) => <TabBarIcon name="leaf" color={color} />,
          headerTitleStyle: {
            fontWeight: '600',
            color: '#1A2151'
          },
          headerRight: () => (
            <Link href="/meditation/sync?id=quick&duration=10" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Ionicons
                    name="play-circle"
                    size={28}
                    color="#1A2151"
                    style={{ marginRight: 15, opacity: pressed ? 0.7 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar" color={color} />,
          headerTitleStyle: {
            fontWeight: '600',
            color: '#1A2151'
          }
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <TabBarIcon name="people" color={color} />,
          headerTitleStyle: {
            fontWeight: '600',
            color: '#1A2151'
          }
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
          headerTitleStyle: {
            fontWeight: '600',
            color: '#1A2151'
          }
        }}
      />
    </Tabs>
  );
}