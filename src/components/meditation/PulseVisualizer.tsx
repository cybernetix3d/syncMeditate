import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface PulseVisualizerProps {
  isActive: boolean;
  color?: string;
  size?: number;
  pulseSpeed?: number; // in seconds
}

/**
 * PulseVisualizer component for creating an animated breathing pulse
 * effect during meditation sessions
 */
const PulseVisualizer: React.FC<PulseVisualizerProps> = ({
  isActive,
  color = '#1A2151',
  size = 100,
  pulseSpeed = 4, // 4 seconds per breath cycle
}) => {
  // Animation values
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  // Start pulsing animation
  useEffect(() => {
    if (isActive) {
      // Fade in
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
      
      // Create the pulse animation
      const pulseLoop = Animated.loop(
        Animated.sequence([
          // Breathe in - expand
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: pulseSpeed * 500, // Slightly longer inhale
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          // Hold briefly at full expansion
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: pulseSpeed * 200,
            useNativeDriver: true,
          }),
          // Breathe out - contract
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: pulseSpeed * 700, // Slightly longer exhale
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          // Hold briefly at contraction
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: pulseSpeed * 100,
            useNativeDriver: true,
          }),
        ])
      );
      
      pulseLoop.start();
      
      // Clean up animation on component unmount or when inactive
      return () => {
        pulseLoop.stop();
        
        // Fade out when inactive
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      };
    } else {
      // Fade out when inactive
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, pulseAnim, opacityAnim, pulseSpeed]);
  
  // Dynamic size calculation for pulse rings
  const innerSize = size;
  const middleSize = size * 1.5;
  const outerSize = size * 2;
  
  // Calculate animated values
  const innerScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.0],
  });
  
  const middleScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.0],
  });
  
  const outerScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1.0],
  });
  
  const innerOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 0.9],
  });
  
  const middleOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.6],
  });
  
  const outerOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });
  
  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      {/* Outer pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            backgroundColor: color,
            opacity: outerOpacity,
            transform: [{ scale: outerScale }],
          },
        ]}
      />
      
      {/* Middle pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: middleSize,
            height: middleSize,
            borderRadius: middleSize / 2,
            backgroundColor: color,
            opacity: middleOpacity,
            transform: [{ scale: middleScale }],
          },
        ]}
      />
      
      {/* Inner pulse ring */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: color,
            opacity: innerOpacity,
            transform: [{ scale: innerScale }],
          },
        ]}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  pulseRing: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PulseVisualizer;