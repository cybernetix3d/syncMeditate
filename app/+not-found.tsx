import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../src/components/common/Button';
import { router, Link, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';

export default function NotFoundScreen() {
  useEffect(() => {
    // This will help with direct navigation attempts
    console.log('Not found page - redirecting to landing page');
  }, []);

  // Redirect to the landing page
  return <Redirect href="/" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  questionMark: {
    position: 'absolute',
    top: -10,
    right: -15,
    backgroundColor: COLORS.accent,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionMarkText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: COLORS.gray,
    maxWidth: '80%',
  },
  buttonContainer: {
    width: '80%',
  },
});
