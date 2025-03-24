import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LIGHT_COLORS, DARK_COLORS } from '../src/constants/Styles';
import { SvgXml } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Your existing logo SVG
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <!-- Three electron orbits (black ellipses) -->
  <!-- First orbit (horizontal) -->
  <ellipse cx="150" cy="150" rx="125" ry="75" fill="none" stroke="#2D2D2D" stroke-width="12" />
  
  <!-- Second orbit (tilted right) -->
  <ellipse cx="150" cy="150" rx="125" ry="75" fill="none" stroke="#2D2D2D" stroke-width="12" transform="rotate(60, 150, 150)" />
  
  <!-- Third orbit (tilted left) -->
  <ellipse cx="150" cy="150" rx="125" ry="75" fill="none" stroke="#2D2D2D" stroke-width="12" transform="rotate(-60, 150, 150)" />
  
  <!-- Central nucleus (orange circle) -->
  <circle cx="150" cy="150" r="20" fill="#F15A24" />
  
  <!-- Electrons (colored circles) -->
  <circle cx="150" cy="75" r="12" fill="#00CCAA" /> <!-- Teal electron at top -->
  <circle cx="85" cy="190" r="12" fill="#8CC63F" /> <!-- Green electron at bottom left -->
  <circle cx="215" cy="190" r="12" fill="#F7931E" /> <!-- Orange electron at bottom right -->
</svg>
`;

// Quotes from famous meditators and consciousness experts
const QUOTES = [
  {
    text: "The quieter you become, the more you can hear.",
    author: "Ram Dass"
  },
  {
    text: "Prayer is when you talk to God; meditation is when you listen to God.",
    author: "Diana Robinson"
  },
  {
    text: "The field of human consciousness is structured according to basic universal principles that can be directly experienced through meditation.",
    author: "Dr. John Hagelin, Quantum Physicist"
  },
  {
    text: "If every 8-year-old in the world is taught meditation, we will eliminate violence from the world within one generation.",
    author: "Dalai Lama"
  },
  {
    text: "Consciousness is the common ground of all religions and all approaches to truth.",
    author: "Deepak Chopra"
  },
  {
    text: "Our intention creates our reality.",
    author: "Dr. Wayne Dyer"
  },
  {
    text: "The most powerful tool in healing is shared resonance.",
    author: "Dr. Bruce Lipton, Cell Biologist"
  },
  {
    text: "The Global Consciousness Project has found evidence suggesting that human consciousness can have subtle but detectable effects on physical systems.",
    author: "Dr. Roger Nelson, Princeton University"
  }
];

export default function LandingPage() {
  // Using direct import instead of context for colors
  const colors = LIGHT_COLORS; // You can add logic to toggle between LIGHT_COLORS and DARK_COLORS
  const { user } = useAuth();
  const router = useRouter();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideUpAnim = useRef(new Animated.Value(50)).current;
  const quoteAnim = useRef(new Animated.Value(0)).current;
  
  // Randomly select a quote
  const randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  
  useEffect(() => {
    // Run animations in sequence for optimal performance
    Animated.sequence([
      // First fade in the header with logo
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700, // Faster animation for better performance
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }),
      // Then slide up the content
      Animated.parallel([
        Animated.timing(slideUpAnim, {
          toValue: 0,
          duration: 500, // Faster animation for better performance
          useNativeDriver: true,
          easing: Easing.out(Easing.quad)
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500, // Faster animation for better performance
          useNativeDriver: true,
          easing: Easing.out(Easing.quad)
        })
      ]),
      // Finally fade in the quote
      Animated.timing(quoteAnim, {
        toValue: 1,
        duration: 400, // Faster animation for better performance
        useNativeDriver: true,
        easing: Easing.in(Easing.quad)
      })
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground 
        source={require('../assets/images/bg-02.jpg')} 
        style={styles.background}
        resizeMode="cover"
        
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        />
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Animated Header Section */}
          <Animated.View style={[
            styles.content,
            { opacity: fadeAnim }
          ]}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>SOULSYNC</Text>
                <SvgXml xml={logoSvg} width={90} height={90} />
              </View>
              <Text style={styles.tagline}>Together, we amplify.</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.message}>
                When we meditate together, our thoughts create a powerful resonance.
              </Text>
             
            </View>

            {/* Animated Features Section */}
            <Animated.View style={[
              styles.featuresContainer,
              {
                opacity: scaleAnim,
                transform: [
                  { translateY: slideUpAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}>
              <View style={styles.featureItem}>
                <Ionicons name="people-outline" size={28} color="#fff" style={styles.featureIcon} />
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureText}>Connect with others globally</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="pulse-outline" size={28} color="#fff" style={styles.featureIcon} />
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureText}>Create healing resonance</Text>
                </View>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="heart-outline" size={28} color="#fff" style={styles.featureIcon} />
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureText}>Make a real difference</Text>
                </View>
              </View>
            </Animated.View>

            {/* Animated Quote */}
            <Animated.View style={[
              styles.quoteContainer,
              { opacity: quoteAnim }
            ]}>
              <Text style={styles.quote}>
                "{randomQuote.text}"
              </Text>
              <Text style={styles.quoteAuthor}>
                — {randomQuote.author}
              </Text>
              
              <Text style={styles.scienceNote}>
                It's been proven that humans putting their minds together can change things on a fundamental level – Global Consciousness Project, Princeton University
              </Text>
            </Animated.View>

            {/* Buttons */}
            <Animated.View style={[
              styles.buttonContainer,
              {
                opacity: scaleAnim,
                transform: [{ translateY: slideUpAnim }]
              }
            ]}>
              {!user ? (
                <>
                  <TouchableOpacity 
                    style={[styles.button, { backgroundColor: LIGHT_COLORS.primary }]}
                    onPress={() => router.push('/auth/sign-in')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Sign In</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => router.push('/auth/sign-up')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.buttonText, { color: LIGHT_COLORS.primary }]}>Create Account</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity 
                  style={[styles.button, { backgroundColor: LIGHT_COLORS.primary }]}
                  onPress={() => router.push('/(tabs)')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.buttonText}>Continue to App</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
            
            <Text style={styles.footerText}>
              Bringing the world together, one thought at a time
            </Text>
          </Animated.View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.03,
  },
  logoContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 15,
  },
  logo: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  divider: {
    width: width * 0.2,
    height: 3,
    backgroundColor: LIGHT_COLORS.primary,
    marginVertical: 15,
    borderRadius: 2,
  },
  tagline: {
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '500',
  },
  message: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 26,
    marginTop: 20,
  },
  submessage: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
  },
  featuresContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 15,
    borderRadius: 12,
  },
  featureIcon: {
    marginRight: 15,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  quoteContainer: {
    marginVertical: 20,
    padding: 18,
    borderLeftWidth: 3,
    borderLeftColor: LIGHT_COLORS.primary,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#fff',
    lineHeight: 24,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
    textAlign: 'right',
    opacity: 0.9,
  },
  scienceNote: {
    fontSize: 12,
    color: '#fff',
    marginTop: 15,
    opacity: 0.8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 15,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: LIGHT_COLORS.primary,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  footerText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});