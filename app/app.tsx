import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';

export default function App() {
  // Instead of redirecting immediately, show content with a link
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading Synkr...</Text>
      <Link href="/index" style={styles.link}>
        <Text style={styles.linkText}>Tap to continue if not redirected</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#040D21',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  link: {
    marginTop: 20,
  },
  linkText: {
    color: '#4f8ef7',
    fontSize: 16,
  },
}); 