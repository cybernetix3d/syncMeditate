import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthProvider';

interface EmailVerificationProps {
  email: string;
  onResendSuccess?: () => void;
}

export function EmailVerification({ email, onResendSuccess }: EmailVerificationProps) {
  const { resendVerificationEmail } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      const { error, message } = await resendVerificationEmail(email);
      if (error) {
        setResendError(error.message);
      } else {
        setResendMessage(message || 'Verification email sent successfully');
        onResendSuccess?.();
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Email Verification Required</Text>
      <Text style={styles.message}>
        We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
      </Text>
      
      <Text style={styles.email}>{email}</Text>
      
      <TouchableOpacity 
        style={[styles.button, isResending && styles.buttonDisabled]}
        onPress={handleResendVerification}
        disabled={isResending}
      >
        {isResending ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Resend Verification Email</Text>
        )}
      </TouchableOpacity>

      {resendMessage && (
        <Text style={styles.successMessage}>{resendMessage}</Text>
      )}
      
      {resendError && (
        <Text style={styles.errorMessage}>{resendError}</Text>
      )}

      <Text style={styles.instructions}>
        After clicking the verification link:
        {'\n'}1. Return to the app
        {'\n'}2. Try signing in again
        {'\n'}3. If you still can't sign in, try resending the verification email
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  successMessage: {
    color: '#34C759',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 