import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';

export default function EventsIndexScreen() {
  // Use a timer to delay the navigation until after the component is mounted
  useEffect(() => {
    const timer = setTimeout(() => {
      // Navigate after a delay
      router.back(); // This is safer than replace in this context
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading events...</Text>
    </View>
  );
}