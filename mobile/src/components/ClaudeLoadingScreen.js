import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ClaudeLoadingScreen() {
  const [ellipsis, setEllipsis] = useState('');
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Animate ellipsis
    const ellipsisInterval = setInterval(() => {
      setEllipsis((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 400);

    // Pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => {
      clearInterval(ellipsisInterval);
      pulseAnimation.stop();
    };
  }, []);

  return (
    <LinearGradient
      colors={['#6B4FBB', '#CD6A51', '#E07B4F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        {/* Claude ASCII Art */}
        <Text style={styles.asciiArt}>
          ▐▛███▜▌{'\n'}
          ▝▜█████▛▘{'\n'}
          ▘▘ ▝▝
        </Text>

        {/* Claude Text */}
        <Text style={styles.claudeText}>Claude</Text>

        {/* Message */}
        <Text style={styles.message}>
          Claude is doing some shit on your computer{ellipsis}
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  asciiArt: {
    fontSize: 48,
    color: '#FFFFFF',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  claudeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  message: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 26,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
