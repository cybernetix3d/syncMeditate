import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function DebugScreen() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.headerText }]}>App Debug</Text>
        
        <View style={styles.card}>
          <Text style={[styles.label, { color: colors.bodyText }]}>Auth State:</Text>
          <Text style={[styles.value, { color: colors.bodyText }]}>
            {loading ? 'Loading...' : user === false ? 'Not authenticated' : 'Authenticated'}
          </Text>
          
          <Text style={[styles.label, { color: colors.bodyText }]}>User Object:</Text>
          <Text style={[styles.codeBox, { color: colors.bodyText, backgroundColor: colors.lightGray }]}>
            {loading ? 'Loading...' : JSON.stringify(user, null, 2)}
          </Text>
        </View>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/auth/sign-in')}
          >
            <Ionicons name="log-in-outline" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/')}
          >
            <Ionicons name="home-outline" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Home</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Ionicons name="apps-outline" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Tabs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    marginBottom: 15,
  },
  codeBox: {
    fontFamily: 'SpaceMono',
    fontSize: 14,
    padding: 10,
    borderRadius: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 5,
  },
}); 