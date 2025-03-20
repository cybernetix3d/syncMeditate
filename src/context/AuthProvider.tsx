import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../api/supabase';
import { Session, User } from '@supabase/supabase-js';
import { router } from 'expo-router';

// Define user type with additional profile data
interface UserProfile extends User {
  display_name?: string;
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
  session: Session | null;
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInAnonymously: () => Promise<{ error: any }>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<{ error: any }>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
  signInAnonymously: async () => ({ error: null }),
  updateUserProfile: async () => ({ error: null })
});

// Create provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile data
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      if (data) {
        setUser((prevUser) => ({
          ...prevUser!,
          display_name: data.display_name,
          privacy_settings: data.privacy_settings,
          faith_preferences: data.faith_preferences
        }));
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        if (session?.user) {
          setUser(session.user as UserProfile);
          fetchUserProfile(session.user.id);
        }

        // Listen for auth changes
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          setSession(session);
          setUser(session?.user as UserProfile || null);
          
          if (session?.user) {
            fetchUserProfile(session.user.id);
          }
          
          // Handle different auth events
          switch (event) {
            case 'SIGNED_IN':
              // User just signed in, check if they need onboarding
              const { data } = await supabase
                .from('users')
                .select('display_name, privacy_settings')
                .eq('id', session?.user.id)
                .single();
                
              if (!data || !data.display_name) {
                router.replace('/auth/onboarding');
              } else {
                router.replace('/(tabs)');
              }
              break;
            case 'SIGNED_OUT':
              router.replace('/auth/sign-in');
              break;
          }
        });
        
        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in auth initialization:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { error };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  // Sign up with email and password
  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      });

      if (!error && data.user) {
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
      }

      return { error };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error };
    }
  };

  // Sign in anonymously
  const signInAnonymously = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: `${Date.now()}@anonymous.user`,
        password: `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-8)}`
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

      return { error };
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      return { error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Update user profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    try {
      if (!user) {
        return { error: new Error('No user logged in') };
      }

      const { error } = await supabase
        .from('users')
        .update({
          display_name: data.display_name,
          privacy_settings: data.privacy_settings,
          faith_preferences: data.faith_preferences,
          last_active: new Date().toISOString()
        })
        .eq('id', user.id);

      if (!error) {
        // Update local state
        setUser(prev => ({
          ...prev!,
          display_name: data.display_name || prev?.display_name,
          privacy_settings: data.privacy_settings || prev?.privacy_settings,
          faith_preferences: data.faith_preferences || prev?.faith_preferences
        }));
      }

      return { error };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { error };
    }
  };

  // Provide auth context
  return (
    <AuthContext.Provider value={{
      session,
      user,
      loading,
      signIn,
      signUp,
      signOut,
      signInAnonymously,
      updateUserProfile
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