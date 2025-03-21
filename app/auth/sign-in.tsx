import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/src/context/AuthProvider';
import Button from '@/src/components/common/Button';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';
import { EmailVerification } from '@/src/components/auth/EmailVerification';

export default function SignInScreen() {
  const { signIn, signInAnonymously } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const { colors } = useTheme();
  
  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }
    
    try {
      setLoading(true);
      const { error } = await signIn(email, password);
      
      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setNeedsVerification(true);
        } else {
          Alert.alert('Sign In Error', error.message);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAnonymousSignIn = async () => {
    try {
      setLoading(true);
      console.log('Starting anonymous sign-in process...');
      
      const { user, error } = await signInAnonymously();
      
      if (error) {
        console.error('Anonymous sign-in error in component:', error);
        Alert.alert('Anonymous Sign In Error', error.message || 'Failed to sign in anonymously');
        return;
      }
      
      console.log('Anonymous sign-in successful in component, user:', user?.id);
      
      // Fallback navigation if the auth provider doesn't handle it
      if (user) {
        console.log('Navigating to home screen from sign-in component');
        router.replace('/');
      }
    } catch (error: any) {
      console.error('Unexpected error in anonymous sign-in:', error);
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignUp = () => {
    router.push('/auth/sign-up');
  };

  if (needsVerification) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar style="dark" />
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setNeedsVerification(false)}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <EmailVerification 
          email={email} 
          onResendSuccess={() => {
            Alert.alert(
              'Verification Email Sent',
              'Please check your email and click the verification link.',
              [{ text: 'OK', onPress: () => setNeedsVerification(false) }]
            );
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.header}>
          <Ionicons name="leaf" size={60} color={colors.primary} />
          <Text style={[styles.title, { color: colors.headerText }]}>SyncMeditate</Text>
          <Text style={[styles.subtitle, { color: colors.subtitleText }]}>
            Connect with meditators globally
          </Text>
        </View>
        
        <View style={styles.formContainer}>
          <Text style={[styles.formTitle, { color: colors.headerText }]}>Welcome Back</Text>
          
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.gray} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.bodyText, borderColor: colors.mediumGray }]}
              placeholder="Email"
              placeholderTextColor={colors.gray}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.gray} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.bodyText, borderColor: colors.mediumGray }]}
              placeholder="Password"
              placeholderTextColor={colors.gray}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={20} 
                color={colors.gray} 
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
              Forgot password?
            </Text>
          </TouchableOpacity>
          
          <Button 
            onPress={handleSignIn} 
            style={styles.signInButton}
            loading={loading}
          >
            Sign In
          </Button>
          
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: colors.mediumGray }]} />
            <Text style={[styles.dividerText, { color: colors.gray }]}>OR</Text>
            <View style={[styles.divider, { backgroundColor: colors.mediumGray }]} />
          </View>
          
          <Button 
            variant="outline" 
            onPress={handleAnonymousSignIn}
            style={styles.anonymousButton}
            loading={loading}
          >
            <Ionicons name="person-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            Continue as Guest
          </Button>
          
          <View style={styles.signUpContainer}>
            <Text style={[styles.signUpText, { color: colors.gray }]}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={[styles.signUpLink, { color: colors.primary }]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  eyeIcon: {
    padding: 4,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  signInButton: {
    marginBottom: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  anonymousButton: {
    marginBottom: 20,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  signUpText: {
    fontSize: 14,
    marginRight: 5,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 10,
  },
});