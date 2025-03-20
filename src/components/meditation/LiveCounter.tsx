import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/constants/Styles';

interface LiveCounterProps {
  count: number;
  showPulse?: boolean;
}

const LiveCounter: React.FC<LiveCounterProps> = ({ count, showPulse = true }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCountRef = useRef(count);

  useEffect(() => {
    if (prevCountRef.current !== count && showPulse) {
      pulseAnim.setValue(1);
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      prevCountRef.current = count;
    }
  }, [count, showPulse, pulseAnim]);

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
      <Animated.View style={[styles.countContainer, { transform: [{ scale: pulseAnim }] }]}>
        <Ionicons name="people" size={18} color={COLORS.primary} />
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
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    marginRight: 4,
  },
  liveText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
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
    color: COLORS.primary,
    marginLeft: 6,
    marginRight: 4,
  },
  participantsText: {
    fontSize: 12,
    color: COLORS.gray,
  },
});

export default LiveCounter;
