import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from '../../src/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';

export default function MeditationCompleteScreen() {
  const { duration } = useLocalSearchParams();
  const durationSeconds = Number(duration || 0);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const remainingSeconds = durationSeconds % 60;
  const formattedDuration = `${durationMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  const { colors } = useTheme();

  const handleReturnHome = () => {
    router.push('/');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar style="light" />
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        <View style={styles.completionIcon}>
          <Ionicons name="checkmark-circle" size={80} color={colors.secondary} />
        </View>
        <Text style={[styles.title, { color: colors.primary }]}>Meditation Complete</Text>
        <Text style={[styles.durationText, { color: colors.secondary }]}>
          You meditated for {formattedDuration}
        </Text>
        <View style={[styles.messageContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.messageText, { color: colors.primary }]}>
            "The quieter you become, the more you can hear."
          </Text>
          <Text style={[styles.authorText, { color: colors.gray }]}>— Ram Dass</Text>
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{formattedDuration}</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Duration</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.mediumGray }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>1</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Sessions Today</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.mediumGray }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>🏆</Text>
            <Text style={[styles.statLabel, { color: colors.gray }]}>Streak</Text>
          </View>
        </View>
        <Button onPress={handleReturnHome} style={styles.button}>
          Return Home
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 50,
    padding: 20,
    alignItems: 'center',
  },
  completionIcon: {
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  durationText: {
    fontSize: 18,
    marginBottom: 30,
  },
  messageContainer: {
    borderRadius: 10,
    padding: 20,
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 18,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
  },
  authorText: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 20,
    marginVertical: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
  },
  divider: {
    width: 1,
    marginHorizontal: 10,
  },
  button: {
    marginTop: 20,
    width: '100%',
  },
});
