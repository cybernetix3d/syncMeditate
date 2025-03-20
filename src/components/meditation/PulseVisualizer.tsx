import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '@/src/constants/Styles';

interface PulseVisualizerProps {
  isActive: boolean;
  color?: string;
  size?: number;
  pulseSpeed?: number;
}

const PulseVisualizer: React.FC<PulseVisualizerProps> = ({
  isActive,
  color = COLORS.primary,
  size = 100,
  pulseSpeed = 4,
}) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (isActive) {
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
      
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: pulseSpeed * 500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: pulseSpeed * 200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: pulseSpeed * 700,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: pulseSpeed * 100,
            useNativeDriver: true,
          }),
        ])
      );
      
      pulseLoop.start();
      
      return () => {
        pulseLoop.stop();
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      };
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, pulseAnim, opacityAnim, pulseSpeed]);
  
  const innerSize = size;
  const middleSize = size * 1.5;
  const outerSize = size * 2;
  
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
