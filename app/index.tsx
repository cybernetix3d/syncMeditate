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

// Logo SVG content as a string
const logoSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg
   width="400mm"
   height="232mm"
   viewBox="0 0 242.02936 140.44511"
   version="1.1"
   id="svg1"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg">
  
  <!-- Define the gradient -->
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <g
     id="layer1"
     transform="translate(15.175049,-60.534709)">
    <path
       style="fill:url(#logoGradient);stroke-width:0.264583"
       d="m 118.49392,189.77459 c -0.95954,-0.51664 -2.5259,-1.76384 -3.6302,-2.52935 -5.05149,-3.06151 0.32106,-7.50155 2.75719,-10.97618 2.67617,-3.81625 3.04967,-4.3949 4.4934,-6.96139 2.40364,-4.63124 3.06551,-2.22127 6.89695,-0.004 41.54888,24.04544 86.81531,-6.73942 74.42658,-55.94062 C 199.66923,98.396299 183.5888,88.948518 182.93245,88.540703 149.85228,67.986708 121.534,100.80794 108.87152,119.60115 c -0.11446,0.16988 -32.610277,48.31682 -74.69745,17.5112 -0.84709,-0.62003 -2.999825,-2.62096 -4.783854,-4.44652 l -3.243694,-3.3192 -0.294283,-0.84418 -0.294285,-0.84418 0.400775,-0.40078 0.400772,-0.40077 1.10549,0.16918 c 0.60802,0.0931 1.403146,0.31571 1.766948,0.4948 1.291125,0.6356 3.863941,1.39418 5.820834,1.71625 1.091406,0.17963 2.639218,0.48 3.439583,0.66748 13.651696,1.8896 24.61178,1.94715 38.373425,-7.02446 6.368878,-3.74916 11.836117,-8.88399 16.313095,-14.80848 0.658682,-0.9697 2.901124,-3.62234 4.473371,-5.29167 0.753819,-0.80037 1.680802,-1.93146 2.059961,-2.51354 0.379162,-0.582091 1.352982,-1.891771 2.164052,-2.91042 0.81106,-1.018646 2.13525,-2.727568 2.94264,-3.797604 3.94211,-5.224515 14.11247,-15.253504 20.1922,-19.911547 3.75355,-2.875817 11.13606,-7.114831 12.39093,-7.114831 0.13952,0 1.11334,-0.365826 2.16406,-0.812948 2.13857,-0.910039 6.96594,-2.495542 8.75028,-2.873936 0.64278,-0.13631 1.64494,-0.386482 2.22703,-0.555932 3.02446,-0.880459 11.97051,-1.155943 19.05,-0.586623 5.67704,0.456538 13.12888,2.560905 22.62187,7.93487 8.1832,4.914035 14.86653,10.73877 20.53515,18.325819 18.6639,24.844542 14.89132,46.112202 10.57531,63.896872 -9.20317,37.92284 -56.70012,63.82988 -104.83181,37.91459 z m -84.538509,8.43444 C 18.640772,193.57826 6.4269018,184.04922 -3.5518982,168.94648 c -3.550267,-5.37326 -7.9299978,-14.84587 -8.5117198,-18.40939 -3.196332,-14.47887 -5.440059,-29.86064 1.114357,-43.8511 0.126015,-0.25269 0.229118,-0.64673 0.229118,-0.87566 0,-1.03921 4.8644698,-10.739459 7.0260888,-14.010744 4.17010599,-6.310825 10.72845,-13.246867 16.8470932,-17.817321 3.737165,-2.791558 10.495721,-6.706402 13.592648,-7.873445 22.777757,-8.583533 48.587143,-9.466543 68.405446,13.462685 3.009918,3.173656 4.756277,3.679249 2.051793,7.616907 -2.69262,3.407794 -4.979606,7.161403 -7.945588,10.345582 -2.423959,1.878385 -3.110024,0.466965 -4.900232,-1.706208 -3.477958,-4.594387 -7.47386,-7.982585 -12.52725,-10.514428 -15.226075,-8.439304 -41.458478,-6.898608 -57.463745,16.357912 -15.8270972,22.99751 -8.8264952,46.69679 -0.773181,57.72936 15.817389,21.66887 49.470891,34.25747 80.329628,-2.61774 8.487422,-9.19415 16.237452,-19.21294 25.751752,-27.409 3.89105,-3.17714 5.23151,-4.17058 6.65971,-4.93567 0.80036,-0.42876 2.11313,-1.16891 2.91725,-1.64479 2.2089,-1.3072 5.66789,-2.69044 8.32754,-3.33015 5.40201,-1.29933 5.3153,-1.28522 9.84942,-1.60258 14.20125,-1.02181 23.01224,5.69914 33.47751,14.90295 5.36554,4.74643 4.34237,5.954 -2.5811,3.48337 -1.50489,-0.53702 -3.50639,-1.43156 -7.80521,-1.85871 -20.60566,-2.04743 -35.01412,4.43114 -53.04895,25.95063 -8.46711,9.19905 -15.53867,19.95018 -25.895255,27.23981 -0.467286,0.29104 -1.26139,0.84013 -1.764678,1.22018 -0.918668,0.69374 -5.10422,3.18241 -6.906212,4.10635 -18.629873,10.07106 -35.684301,9.31464 -48.948924,5.30375 z"
       id="path1" />
  </g>
</svg>`;

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
                <Text style={styles.logo}>SoulSync</Text>
                <SvgXml xml={logoSvg} width={150} height={150} />
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