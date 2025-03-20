import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Define database types (placeholder - will be generated or extended as needed)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          created_at: string;
          last_active: string;
          privacy_settings: {
            locationSharingLevel: 'none' | 'country' | 'city' | 'precise';
            useAnonymousId: boolean;
            shareTradition: boolean;
          };
          faith_preferences: {
            primaryTradition: string;
          };
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          last_active?: string;
          privacy_settings?: {
            locationSharingLevel: 'none' | 'country' | 'city' | 'precise';
            useAnonymousId: boolean;
            shareTradition: boolean;
          };
          faith_preferences?: {
            primaryTradition: string;
          };
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          created_at?: string;
          last_active?: string;
          privacy_settings?: {
            locationSharingLevel: 'none' | 'country' | 'city' | 'precise';
            useAnonymousId: boolean;
            shareTradition: boolean;
          };
          faith_preferences?: {
            primaryTradition: string;
          };
        };
      };
      // Other tables definitions...
    };
  };
};

// Get Supabase URL and anon key from app.json extra params
const supabaseUrl = 'https://bkzqonmtmxwmkvmzzlyq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrenFvbm10bXh3bWt2bXp6bHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0NDgzNjQsImV4cCI6MjA1ODAyNDM2NH0.EFWrN1MDSetW9P0O5UYsR98v0gF1nRoZM-n_KsLus8Q';

// Storage adapter for secure persistent session storage
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  }
};

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper function to check if Supabase is connected
export const checkSupabaseConnection = async () => {
  try {
    const { count, error } = await supabase
      .from('meditation_events')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('Supabase connection error:', error.message);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};