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
    
    // First check if the meditation_completions table exists
    const { data: tablesData, error: tablesError } = await supabase
      .from('meditation_completions')
      .select('id')
      .limit(1);
      
    if (tablesError) {
      console.error('Error checking meditation_completions table:', tablesError);
      return { 
        success: false, 
        message: 'Cannot access meditation_completions table',
        error: tablesError 
      };
    }
    
    console.log('Database schema check completed');
    return { success: true, message: 'Database schema appears to be working' };
  } catch (err) {
    console.error('Failed to fix database schema:', err);
    return { 
      success: false, 
      message: 'Failed to check database schema',
      error: err 
    };
  }
};

// Helper function to fix meditation permissions issues
export const fixMeditationPermissions = async () => {
  try {
    console.log('Checking meditation table permissions...');
    
    // First get the user session
    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;
    
    if (!userId) {
      console.log('No authenticated user found');
      return { success: false, error: 'No authenticated user' };
    }
    
    // Get the structure of the user_meditation_history table
    try {
      console.log('Checking user_meditation_history table structure');
      const { data: sample, error: sampleError } = await supabase
        .from('user_meditation_history')
        .select('*')
        .limit(1);
        
      if (sampleError) {
        console.error('Error checking table structure:', sampleError);
      } else {
        console.log('Table structure sample:', sample);
      }
    } catch (e) {
      console.error('Error checking table structure:', e);
    }
    
    // Try inserting a test record with minimal fields
    const testId = `test-${Date.now()}`;
    const testRecord = {
      id: testId,
      user_id: userId,
      duration: 1,
      date: new Date().toISOString()
    };
    
    console.log('Testing insert with minimal fields:', testRecord);
    
    // Try inserting a test record
    const { data: insertData, error: insertError } = await supabase
      .from('user_meditation_history')
      .insert(testRecord)
      .select();
      
    if (insertError) {
      console.error('Error testing insert permissions:', insertError);
      return { success: false, error: insertError };
    }
    
    console.log('Test record inserted successfully:', insertData);
    
    // Then delete it
    const { error: deleteError } = await supabase
      .from('user_meditation_history')
      .delete()
      .eq('id', testId);
      
    if (deleteError) {
      console.error('Error testing delete permissions:', deleteError);
    } else {
      console.log('Test record deleted successfully');
    }
    
    console.log('Permission check completed successfully');
    return { success: true };
  } catch (err) {
    console.error('Failed to check permissions:', err);
    return { success: false, error: err };
  }
};