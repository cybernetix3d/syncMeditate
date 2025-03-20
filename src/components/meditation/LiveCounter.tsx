import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LiveCounterProps {
  count: number;
  showPulse?: boolean;
}

/**
 * Component to display number of active meditation participants
 * with a pulsing effect when count changes
 */
const LiveCounter: React.FC<LiveCounterProps> = ({
  count,
  showPulse = true
}) => {
  // Animation value for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Previous count reference to detect changes
  const prevCountRef = useRef(count);
  
  // Start pulse animation when count changes
  useEffect(() => {
    if (prevCountRef.current !== count && showPulse) {
      // Reset to initial scale
      pulseAnim.setValue(1);
      
      // Animate pulse effect
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
      
      // Update previous count
      prevCountRef.current = count;
    }
  }, [count, showPulse, pulseAnim]);
  
  // Format count for display
  const getFormattedCount = () => {
    if (count < 1000) return count.toString();
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
    return `${(count / 1000000).toFixed(1)}M`;
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.liveIndicator}>
        <View style={styles.dot} />
        <Text style={styles.liveText}>LIVE</Text>
      </View>
      
      <Animated.View 
        style={[
          styles.countContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Ionicons name="people" size={18} color="#1A2151" />
        <Text style={styles.countText}>{getFormattedCount()}</Text>
        <Text style={styles.participantsText}>participants</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginRight: 4,
  },
  liveText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  countText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A2151',
    marginLeft: 6,
    marginRight: 4,
  },
  participantsText: {
    fontSize: 12,
    color: '#666666',
  },
});

export default LiveCounter;