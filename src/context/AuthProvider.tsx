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
  avatar_url?: string | null;
  created_at?: string;
  is_admin?: boolean; 
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
        .select('id, email, display_name, avatar_url, privacy_settings, faith_preferences')
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
            avatar_url: newProfile.avatar_url,
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
          avatar_url: data.avatar_url,
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
        setLoading(true);
        setError(null);
        
        // Check Supabase connection first
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          if (mounted) {
            setError(new Error('Failed to connect to authentication service'));
            setUser(false);
            setLoading(false);
          }
          return;
        }
        
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
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
            setUser(false);
            setLoading(false);
            return;
          }
        }
        
        if (session?.user) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('id, email, display_name, avatar_url, privacy_settings, faith_preferences, created_at')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              if (mounted) {
                setUser(true); // User exists but no profile
                setLoading(false);
              }
              return;
            }

            if (profile && mounted) {
              setUser({
                id: profile.id,
                email: profile.email,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
                created_at: profile.created_at,
                privacy_settings: profile.privacy_settings,
                faith_preferences: profile.faith_preferences
              });
            } else {
              setUser(true); // User exists but no profile
            }
          } catch (error) {
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
                .select('id, email, display_name, avatar_url, privacy_settings, faith_preferences, created_at')
                .eq('id', session.user.id)
                .single();

              if (profileError) {
                setUser(true); // User exists but no profile
              } else if (profile) {
                setUser({
                  id: profile.id,
                  email: profile.email,
                  display_name: profile.display_name,
                  avatar_url: profile.avatar_url,
                  created_at: profile.created_at,
                  privacy_settings: profile.privacy_settings,
                  faith_preferences: profile.faith_preferences
                });
              }
            } catch (error) {
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

      console.log('Sign up successful, creating profile...');
      
      // Create user profile with retry logic
      let profileError;
      for (let i = 0; i < 3; i++) {
        try {
          const { error: createError } = await supabase
            .from('users')
            .insert([
              {
                id: data.user.id,
                email,
                display_name: displayName,
                created_at: new Date().toISOString(),
                privacy_settings: {
                  locationSharingLevel: 'none',
                  useAnonymousId: false,
                  shareTradition: false
                }
              }
            ])
            .single();

          if (!createError) {
            console.log('Profile created successfully');
            profileError = null;
            break;
          }
          
          profileError = createError;
          console.error(`Attempt ${i + 1} failed:`, createError);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (e) {
          profileError = e;
          console.error(`Attempt ${i + 1} failed with exception:`, e);
        }
      }

      if (profileError) {
        console.error('Failed to create profile after retries:', profileError);
        // Don't return error here - the user is created but profile creation failed
        // They can try updating their profile later
      }

      return { 
        user: data.user, 
        error: null,
        message: 'Please check your email to verify your account'
      };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { error: new Error('An unexpected error occurred') };
    }
  };

  // Sign in anonymously
  const signInAnonymously = async () => {
    try {
      console.log('Using anonymous auth...');
      
      // Method 1: Try using Supabase's native anonymous auth
      try {
        console.log('Attempting native anonymous auth...');
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        
        if (!anonError && anonData?.user) {
          console.log('Native anonymous auth successful');
          
          // Create or get user profile
          await handleAnonymousProfile(anonData.user.id);
          
          return { user: anonData.user, error: null };
        } else {
          console.log('Native anonymous auth failed, trying fallback...');
        }
      } catch (e) {
        console.log('Native anonymous auth error, trying fallback...', e);
      }
      
      // Method 2: Try using shared anonymous credentials
      console.log('Attempting shared anonymous credentials...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'anonymous@example.com',
        password: 'anonymous'
      });
      
      if (error) {
        console.error('Anonymous sign in error:', error);
        
        // Method 3: Create a temporary guest account (last resort)
        console.log('Trying temporary guest account creation...');
        const tempEmail = `guest_${Date.now()}@temporary.com`;
        const tempPassword = `Guest${Math.random().toString(36).slice(2)}!`;
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: tempEmail,
          password: tempPassword,
          options: {
            data: { is_guest: true }
          }
        });
        
        if (signUpError || !signUpData?.user) {
          console.error('All anonymous auth methods failed');
          return { error: signUpError || new Error('Failed to create guest account') };
        }
        
        // Create profile for the temporary account
        await handleAnonymousProfile(signUpData.user.id);
        
        return { user: signUpData.user, error: null };
      }
      
      // Successfully logged in with shared anonymous credentials
      if (data?.user) {
        await handleAnonymousProfile(data.user.id);
      }
      
      return { user: data?.user, error: null };
    } catch (error) {
      console.error('Error in anonymous sign in:', error);
      return { error };
    }
  };

  // Helper function to create anonymous user profile
  const handleAnonymousProfile = async (userId: string) => {
    // Create or get user profile
    console.log('Creating anonymous user profile for:', userId);
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        display_name: 'Guest User',
        privacy_settings: {
          locationSharingLevel: 'none',
          useAnonymousId: true,
          shareTradition: false
        },
        created_at: new Date().toISOString()
      });
      
    if (profileError) {
      console.error('Error creating anonymous profile:', profileError);
      // Continue anyway since auth was successful
    } else {
      console.log('Anonymous profile created successfully');
    }
    
    // Update local state
    setUser({
      id: userId,
      display_name: 'Guest User',
      privacy_settings: {
        locationSharingLevel: 'none',
        useAnonymousId: true,
        shareTradition: false
      }
    });
    
    // Navigate to home screen
    console.log('Redirecting to home screen...');
    router.replace('/');
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
        avatar_url: data.avatar_url,
        privacy_settings: data.privacy_settings,
        faith_preferences: data.faith_preferences
      };

      console.log('Updating with data:', updateData);

      // Use upsert to handle both insert and update cases
      const { data: updatedProfile, error } = await supabase
        .from('users')
        .upsert(updateData)
        .select('id, email, display_name, avatar_url, privacy_settings, faith_preferences')
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
        avatar_url: updatedProfile.avatar_url,
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