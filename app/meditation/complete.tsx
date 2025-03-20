import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView 
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from '../../src/components/common/Button';
import { Ionicons } from '@expo/vector-icons';

export default function MeditationCompleteScreen() {
  // Get duration from route params
  const { duration } = useLocalSearchParams();
  
  // Convert duration to minutes (it comes in seconds)
  const durationSeconds = Number(duration || 0);
  const durationMinutes = Math.floor(durationSeconds / 60);
  const remainingSeconds = durationSeconds % 60;
  
  // Format the duration string
  const formattedDuration = `${durationMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  
  // Return to home
  const handleReturnHome = () => {
    router.push('/');
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <View style={styles.completionIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#4A6FFF" />
        </View>
        
        <Text style={styles.title}>Meditation Complete</Text>
        
        <Text style={styles.durationText}>
          You meditated for {formattedDuration}
        </Text>
        
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>
            "The quieter you become, the more you can hear."
          </Text>
          <Text style={styles.authorText}>— Ram Dass</Text>
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formattedDuration}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>1</Text>
            <Text style={styles.statLabel}>Sessions Today</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>🏆</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>
        
        <Button 
          onPress={handleReturnHome}
          style={styles.button}
        >
          Return Home
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2151',
  },
  content: {
    flex: 1,
    backgroundColor: 'white',
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
    color: '#1A2151',
    marginBottom: 10,
  },
  durationText: {
    fontSize: 18,
    color: '#4A6FFF',
    marginBottom: 30,
  },
  messageContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 20,
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  messageText: {
    fontSize: 18,
    color: '#1A2151',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
  },
  authorText: {
    fontSize: 14,
    color: '#666666',
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
    color: '#1A2151',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666666',
  },
  divider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 10,
  },
  button: {
    marginTop: 20,
    width: '100%',
  },
});