import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Link, Tabs } from 'expo-router';
import { Pressable } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray,
        headerShown: useClientOnlyValue(false, true),
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.headerText,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.mediumGray,
          elevation: 0,
          shadowOpacity: 0.1,
          paddingTop: 5,
          height: 60,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Meditate',
          tabBarIcon: ({ color }) => <TabBarIcon name="leaf" color={color} />,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.headerText,
          },
          headerRight: () => (
            <Link href="/meditation/sync?id=quick&duration=10" asChild>
              <Pressable>
                {({ pressed }) => (
                  <Ionicons
                    name="play-circle"
                    size={28}
                    color={colors.primary}
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
            color: colors.headerText,
          },
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color }) => <TabBarIcon name="people" color={color} />,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.headerText,
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="settings" color={color} />,
          headerTitleStyle: {
            fontWeight: '600',
            color: colors.headerText,
          },
        }}
      />
    </Tabs>
  );
}
