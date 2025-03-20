import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase, checkSupabaseConnection } from '../api/supabase';
import { Session, User, AuthResponse } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { Alert } from 'react-native';

// Define user type with additional profile data
export interface UserProfile {
  id: string;
  email?: string | null;
  display_name?: string | null;
  created_at?: string;
  privacy_settings?: {
    locationSharingLevel: 'none' | 'country' | 'city' | 'precise';
    useAnonymousId: boolean;
    shareTradition: boolean;
  };
  faith_preferences?: {
    primaryTradition: string;
  };
}

// Define context type
interface AuthContextType {
  user: null | boolean | UserProfile;
  session: Session | null;
  loading: boolean;
  error: Error | null;
  signIn: (email: string, password: string) => Promise<{ user?: any; error?: any }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ user?: any; error?: any }>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<{ user?: any; error?: any }>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<{ data?: UserProfile; error?: any }>;
  resendVerificationEmail: (email: string) => Promise<{ error?: any }>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  error: null,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  signInAnonymously: async () => ({}),
  updateUserProfile: async () => ({}),
  resendVerificationEmail: async () => ({})
});

// Create provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<null | boolean | UserProfile>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for:', userId);
      
      // First check if we have a valid user ID
      if (!userId) {
        console.error('No user ID provided to fetchUserProfile');
        setUser(false);
        return;
      }

      // First try to get the current session to ensure we're authenticated
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !currentSession) {
        console.error('No valid session found:', sessionError);
        setUser(false);
        return;
      }

      // Fetch user profile with proper headers
      const { data, error } = await supabase
        .from('users')
        .select('id, email, display_name, privacy_settings, faith_preferences')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // Create initial profile if it doesn't exist
        if (error.code === 'PGRST116') { // No rows returned
          console.log('No profile found, creating initial profile');
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: currentSession.user.email,
              privacy_settings: {
                locationSharingLevel: 'none',
                useAnonymousId: true,
                shareTradition: false
              }
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating initial profile:', createError);
            setUser(false);
            return;
          }

          const userProfile: UserProfile = {
            id: userId,
            email: newProfile.email,
            display_name: newProfile.display_name,
            privacy_settings: newProfile.privacy_settings,
            faith_preferences: newProfile.faith_preferences
          };
          setUser(userProfile);
          return;
        }

        setError(error);
        setUser(false);
        return;
      }

      if (data) {
        console.log('User profile found:', data);
        const userProfile: UserProfile = {
          id: userId,
          email: data.email,
          display_name: data.display_name,
          privacy_settings: data.privacy_settings,
          faith_preferences: data.faith_preferences
        };
        setUser(userProfile);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setError(error as Error);
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        setLoading(true);
        setError(null);
        
        // Check Supabase connection first
        console.log('Checking Supabase connection...');
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          console.error('Failed to connect to Supabase');
          if (mounted) {
            setError(new Error('Failed to connect to authentication service'));
            setUser(false);
            setLoading(false);
          }
          return;
        }
        
        console.log('Getting current session...');
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          if (mounted) {
            setError(sessionError);
            setUser(false);
            setSession(null);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setSession(session);
          if (!session?.user) {
            console.log('No session found, setting user to false');
            setUser(false);
            setLoading(false);
            return;
          }
        }
        
        if (session?.user) {
          console.log('Session found, fetching user profile for:', session.user.id);
          try {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('id, email, display_name, privacy_settings, faith_preferences')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('Error fetching profile:', profileError);
              if (mounted) {
                setUser(true); // User exists but no profile
                setLoading(false);
              }
              return;
            }

            if (profile && mounted) {
              console.log('Profile found:', profile);
              setUser({
                id: profile.id,
                email: profile.email,
                display_name: profile.display_name,
                privacy_settings: profile.privacy_settings,
                faith_preferences: profile.faith_preferences
              });
            } else {
              console.log('No profile found, setting user to true');
              setUser(true); // User exists but no profile
            }
          } catch (error) {
            console.error('Error in profile fetch:', error);
            if (mounted) {
              setUser(true); // User exists but error fetching profile
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log(`Auth state changed: ${event}`);
          if (mounted) {
            setSession(session);
            
            if (!session?.user) {
              setUser(false);
              setLoading(false);
              return;
            }

            try {
              const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('id, email, display_name, privacy_settings, faith_preferences')
                .eq('id', session.user.id)
                .single();

              if (profileError) {
                console.log('No profile found after auth change');
                setUser(true); // User exists but no profile
              } else if (profile) {
                console.log('Profile found after auth change:', profile);
                setUser({
                  id: profile.id,
                  email: profile.email,
                  display_name: profile.display_name,
                  privacy_settings: profile.privacy_settings,
                  faith_preferences: profile.faith_preferences
                });
              }
            } catch (error) {
              console.error('Error fetching profile after auth change:', error);
              setUser(true); // User exists but error fetching profile
            } finally {
              setLoading(false);
            }
          }
        });
        
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in auth initialization:', error);
        if (mounted) {
          setError(error as Error);
          setUser(false);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in...');
      if (!email || !password) {
        console.error('Missing email or password');
        return { error: new Error('Email and password are required') };
      }

      // Check Supabase connection first
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        console.error('Failed to connect to Supabase');
        return { error: new Error('Failed to connect to authentication service') };
      }

      console.log('Attempting to sign in with email:', email);
      
      // First check if the user exists and their email confirmation status
      const { data: { user }, error: userError } = await supabase.auth.getUser(email);
      if (userError) {
        console.error('Error checking user:', userError);
      } else if (user) {
        console.log('User found, email confirmed:', user.email_confirmed_at);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error:', error.message);
        // Handle specific error cases
        if (error.message.includes('Invalid login credentials')) {
          return { error: new Error('Invalid email or password') };
        } else if (error.message.includes('Email not confirmed')) {
          // Double check email confirmation status
          const { data: { user }, error: userError } = await supabase.auth.getUser(email);
          if (!userError && user) {
            console.log('User email confirmation status:', user.email_confirmed_at);
            if (user.email_confirmed_at) {
              // If email is confirmed but we're still getting this error, try to refresh the session
              const { data: { session }, error: refreshError } = await supabase.auth.getSession();
              if (!refreshError && session) {
                console.log('Session refreshed successfully');
                return { user: session.user, error: null };
              }
            }
          }
          return { error: new Error('Please verify your email before signing in') };
        } else if (error.message.includes('Too many requests')) {
          return { error: new Error('Too many attempts. Please try again later') };
        }
        return { error: new Error(error.message) };
      }

      if (!data?.user) {
        console.error('No user data returned');
        return { error: new Error('Failed to sign in') };
      }

      console.log('Sign in successful:', data.user.id);
      console.log('User email confirmed:', data.user.email_confirmed_at);
      
      // Fetch user profile after successful sign in
      await fetchUserProfile(data.user.id);
      
      return { user: data.user, error: null };
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      return { error: new Error('An unexpected error occurred') };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      console.log('Attempting sign up...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (error) {
        console.error('Sign up error:', error.message);
        return { error: new Error(error.message) };
      }

      if (!data.user) {
        console.error('No user data returned');
        return { error: new Error('Failed to sign up') };
      }

      console.log('Sign up successful, verification email sent');
      
      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email,
            display_name: displayName,
            created_at: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return { error: profileError };
      }

      return { 
        user: data.user, 
        error: null,
        message: 'Please check your email to verify your account'
      };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error: new Error('An unexpected error occurred') };
    }
  };

  // Sign in anonymously
  const signInAnonymously = async () => {
    try {
      // Generate a random email and password
      const randomEmail = `guest_${Date.now()}@anonymous.user`;
      const randomPassword = `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}`;
      
      const { data, error } = await supabase.auth.signUp({
        email: randomEmail,
        password: randomPassword
      });

      if (!error && data.user) {
        // Create anonymous user profile
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              privacy_settings: {
                locationSharingLevel: 'none',
                useAnonymousId: true,
                shareTradition: false
              },
              created_at: new Date().toISOString()
            }
          ]);

        if (profileError) {
          console.error('Error creating anonymous user profile:', profileError);
          return { error: profileError };
        }
      }

      return { user: data.user, error };
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log('Signing out...');
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }

      // Clear all auth state
      setUser(false);
      setSession(null);
      setError(null);
      
      // Navigate to sign in screen
      console.log('Redirecting to sign in...');
      router.replace('/auth/sign-in');
      
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Update user profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    try {
      console.log('updateUserProfile called with:', data);
      
      // First check session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !currentSession?.user?.id) {
        console.error('No valid session found:', sessionError);
        return { error: new Error('No user logged in') };
      }

      console.log('Updating profile for user:', currentSession.user.id);

      const updateData = {
        id: currentSession.user.id,
        email: currentSession.user.email,
        display_name: data.display_name,
        privacy_settings: data.privacy_settings,
        faith_preferences: data.faith_preferences
      };

      console.log('Updating with data:', updateData);

      // Use upsert to handle both insert and update cases
      const { data: updatedProfile, error } = await supabase
        .from('users')
        .upsert(updateData)
        .select('id, email, display_name, privacy_settings, faith_preferences')
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { error };
      }

      console.log('Profile updated successfully:', updatedProfile);

      // Update local state
      const userProfile: UserProfile = {
        id: currentSession.user.id,
        email: updatedProfile.email,
        display_name: updatedProfile.display_name,
        privacy_settings: updatedProfile.privacy_settings,
        faith_preferences: updatedProfile.faith_preferences
      };

      console.log('Setting user state with:', userProfile);
      setUser(userProfile);

      return { data: userProfile, error: null };
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return { error };
    }
  };

  // Add resend verification email function
  const resendVerificationEmail = async (email: string) => {
    try {
      console.log('Resending verification email...');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });

      if (error) {
        console.error('Error resending verification email:', error.message);
        return { error: new Error(error.message) };
      }

      return { error: null, message: 'Verification email sent successfully' };
    } catch (error) {
      console.error('Error resending verification email:', error);
      return { error: new Error('An unexpected error occurred') };
    }
  };

  // Provide auth context
  return (
    <AuthContext.Provider value={{
      session,
      user,
      loading,
      error,
      signIn,
      signUp,
      signOut,
      signInAnonymously,
      updateUserProfile,
      resendVerificationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Create hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};