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
          avatar_url: string | null;
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
          avatar_url?: string | null;
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
          avatar_url?: string | null;
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
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      const value = await SecureStore.getItemAsync(key);
      console.log('Getting item from storage:', key, value ? 'Found' : 'Not found');
      return value;
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
      console.log('Setting item in storage:', key, 'Success');
    } catch (error) {
      console.error('Error setting item in storage:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key);
      console.log('Removing item from storage:', key, 'Success');
    } catch (error) {
      console.error('Error removing item from storage:', error);
    }
  }
};

// Create Supabase client with updated configuration
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
    debug: __DEV__,
  },
});

// Helper function to check if Supabase is connected
export const checkSupabaseConnection = async () => {
  try {
    console.log('Checking Supabase connection...');
    
    // First check auth connection
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Supabase auth connection error:', authError.message);
      return false;
    }
    console.log('Auth connection successful');

    // Then check database connection
    const { count, error: dbError } = await supabase
      .from('meditation_events')
      .select('*', { count: 'exact', head: true });
    
    if (dbError) {
      console.error('Supabase database connection error:', dbError.message);
      return false;
    }
    
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    return false;
  }
};

// Helper function to fix database schema issues
export const fixDatabaseSchema = async () => {
  try {
    console.log('Attempting to fix database schema...');
    
    // Add meditation_type column to meditation_completions if it doesn't exist
    const { error: columnError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE meditation_completions 
        ADD COLUMN IF NOT EXISTS meditation_type TEXT DEFAULT 'quick';
        
        -- Update existing records
        UPDATE meditation_completions
        SET meditation_type = CASE
          WHEN event_id IS NULL THEN 'quick'
          ELSE 'scheduled'
        END
        WHERE meditation_type IS NULL;
      `
    });

    if (columnError) {
      console.error('Error adding meditation_type column:', columnError);
      throw columnError;
    }

    console.log('Database schema fixed successfully');
    return { success: true, message: 'Database schema updated successfully' };
  } catch (err) {
    console.error('Failed to fix database schema:', err);
    return { 
      success: false, 
      message: 'Failed to update database schema',
      error: err 
    };
  }
};

// Helper function to fix meditation permissions issues
export const fixMeditationPermissions = async () => {
  try {
    console.log('Attempting to fix meditation table permissions...');
    
    // Create RLS policy for anonymous users to insert
    const { error: policyError } = await supabase.rpc('exec_sql', {
      query: `
        -- Enable anonymous inserts for meditation_completions
        CREATE POLICY IF NOT EXISTS "Allow anonymous inserts" 
        ON meditation_completions FOR INSERT 
        WITH CHECK (true);
        
        -- Fix permissions for authenticated users
        CREATE POLICY IF NOT EXISTS "Allow authenticated users" 
        ON meditation_completions FOR ALL 
        USING (auth.uid() = user_id);
        
        -- Enable RLS but make sure policies are in place first
        ALTER TABLE meditation_completions ENABLE ROW LEVEL SECURITY;
      `
    });

    if (policyError) {
      console.error('Error fixing meditation permissions:', policyError);
      return { success: false, error: policyError };
    }

    console.log('Permissions fixed successfully');
    return { success: true };
  } catch (err) {
    console.error('Failed to fix permissions:', err);
    return { success: false, error: err };
  }
};