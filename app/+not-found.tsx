import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../src/components/common/Button';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';

export default function NotFoundScreen() {
  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="leaf" size={60} color={COLORS.secondary} />
        <View style={styles.questionMark}>
          <Text style={styles.questionMarkText}>?</Text>
        </View>
      </View>
      <Text style={styles.title}>Page Not Found</Text>
      <Text style={styles.subtitle}>
        The meditation path you're seeking seems to have vanished into thin air
      </Text>
      <View style={styles.buttonContainer}>
        <Button onPress={handleGoHome}>Return to Home</Button>
      </View>
    </View>
  );
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
