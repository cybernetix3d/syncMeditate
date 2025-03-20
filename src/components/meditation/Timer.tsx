import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface TimerProps {
  duration: number; // in seconds
  remainingTime: number; // in seconds
  setRemainingTime: (time: number) => void;
  state: 'PREPARING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';
  onComplete: () => void;
  showControls?: boolean;
}

/**
 * Timer component for meditation sessions
 */
const Timer: React.FC<TimerProps> = ({
  duration,
  remainingTime,
  setRemainingTime,
  state,
  onComplete,
  showControls = true
}) => {
  const [isPaused, setIsPaused] = useState(state === 'PAUSED');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start or resume the timer
  const startTimer = () => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(() => {
      setRemainingTime((prevTime: number) => {
        if (prevTime <= 1) {
          // Timer complete
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          onComplete();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    
    setIsPaused(false);
  };

  // Pause the timer
  const pauseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsPaused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Toggle pause/resume
  const togglePause = () => {
    if (isPaused) {
      startTimer();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      pauseTimer();
    }
  };

  // Effect to manage timer based on state
  useEffect(() => {
    // Start timer when state changes to IN_PROGRESS
    if (state === 'IN_PROGRESS' && !intervalRef.current) {
      startTimer();
    } 
    // Pause timer when state changes to PAUSED
    else if (state === 'PAUSED' && intervalRef.current) {
      pauseTimer();
    }
    // Handle completion
    else if (state === 'COMPLETED' && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Cleanup timer on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = ((duration - remainingTime) / duration) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.timerContainer}>
        <View 
          style={[
            styles.progressRing,
            { 
              backgroundColor: `rgba(26, 33, 81, ${progressPercent / 100})`,
              transform: [{ rotate: `${progressPercent * 3.6}deg` }]
            }
          ]} 
        />
        <View style={styles.timerInner}>
          <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
          <Text style={styles.statusText}>
            {state === 'PREPARING' && 'Ready to begin'}
            {state === 'IN_PROGRESS' && !isPaused && 'Meditating'}
            {state === 'IN_PROGRESS' && isPaused && 'Paused'}
            {state === 'COMPLETED' && 'Completed'}
          </Text>
        </View>
      </View>
      
      {showControls && state === 'IN_PROGRESS' && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={togglePause}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={24}
              color="#1A2151"
            />
            <Text style={styles.controlText}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>
          
          {isPaused && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={onComplete}
            >
              <Ionicons name="stop" size={24} color="#FF6B6B" />
              <Text style={[styles.controlText, { color: '#FF6B6B' }]}>
                End
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  timerContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    marginBottom: 30,
  },
  progressRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: 'rgba(26, 33, 81, 0.2)',
  },
  timerInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timerText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1A2151',
  },
  statusText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 5,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  controlButton: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  controlText: {
    marginTop: 5,
    fontSize: 14,
    color: '#1A2151',
  },
});

export default Timer;