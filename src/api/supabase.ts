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
      event_rsvps: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          created_at: string;
          reminder_sent: boolean;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id: string;
          created_at?: string;
          reminder_sent?: boolean;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string;
          created_at?: string;
          reminder_sent?: boolean;
        };
      };
      user_notification_settings: {
        Row: {
          user_id: string;
          event_reminders: boolean;
          reminder_time: number;
          daily_meditation_reminder: boolean;
          daily_reminder_time: string;
          community_notifications: boolean;
          system_notifications: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          event_reminders?: boolean;
          reminder_time?: number;
          daily_meditation_reminder?: boolean;
          daily_reminder_time?: string;
          community_notifications?: boolean;
          system_notifications?: boolean;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          event_reminders?: boolean;
          reminder_time?: number;
          daily_meditation_reminder?: boolean;
          daily_reminder_time?: string;
          community_notifications?: boolean;
          system_notifications?: boolean;
          updated_at?: string;
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

// Helper function to safely execute SQL statements
const executeSQLSafely = async (sql: string): Promise<boolean> => {
  try {
    // Many databases have a 'stored procedure' approach for executing SQL
    // Supabase typically requires admin access for schema changes, so this approach
    // is primarily useful in development or if you have proper permissions
    await supabase.rpc('execute_sql', { sql });
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    console.warn('SQL execution failed. This may require admin access:', sql);
    return false;
  }
};

// Helper function to ensure meditation events table has necessary columns
export const ensureRecurringEventsSchema = async (): Promise<boolean> => {
  try {
    const sql = `
      ALTER TABLE meditation_events ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;
      ALTER TABLE meditation_events ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL;
      ALTER TABLE meditation_events ADD COLUMN IF NOT EXISTS system_created BOOLEAN DEFAULT FALSE;
      
      CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
      );
      
      ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
      
      BEGIN;
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policy 
          WHERE polrelid = 'app_settings'::regclass 
          AND polname = 'Anyone can read app settings'
        ) THEN
          CREATE POLICY "Anyone can read app settings"
          ON app_settings
          FOR SELECT
          USING (true);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- Ignore error
      END;
      $$;
      COMMIT;
    `;
    
    return await executeSQLSafely(sql);
  } catch (error) {
    console.error('Error ensuring recurring events schema:', error);
    return false;
  }
};

// Helper function to ensure event_rsvps and notification settings tables exist
export const ensureRSVPAndNotificationTables = async (): Promise<boolean> => {
  try {
    console.log('Checking RSVP, notification, and meditation_completions tables...');
    
    // Check if the event_rsvps table exists
    const eventRSVPsSQL = `
      CREATE TABLE IF NOT EXISTS public.event_rsvps (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_id UUID NOT NULL REFERENCES public.meditation_events(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        reminder_sent BOOLEAN DEFAULT FALSE,
        notification_id TEXT,
        attendance_status TEXT CHECK (attendance_status IN ('attending', 'interested', NULL)) DEFAULT NULL,
        UNIQUE(event_id, user_id)
      );
      
      -- Add the attendance_status column if it doesn't exist
      ALTER TABLE public.event_rsvps 
      ADD COLUMN IF NOT EXISTS attendance_status TEXT CHECK (attendance_status IN ('attending', 'interested', NULL)) DEFAULT NULL;
      
      -- Add RLS policies
      ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
      
      -- Allow users to see all RSVPs (for counting purposes)
      DROP POLICY IF EXISTS "Users can view all RSVPs" ON public.event_rsvps;
      CREATE POLICY "Users can view all RSVPs" 
        ON public.event_rsvps FOR SELECT 
        USING (true);
      
      -- Allow users to create/delete their own RSVPs
      DROP POLICY IF EXISTS "Users can manage their own RSVPs" ON public.event_rsvps;
      CREATE POLICY "Users can manage their own RSVPs" 
        ON public.event_rsvps FOR ALL 
        USING (auth.uid() = user_id);
    `;
    
    // Check if the user_notification_settings table exists
    const notificationSettingsSQL = `
      CREATE TABLE IF NOT EXISTS public.user_notification_settings (
        user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        event_reminders BOOLEAN DEFAULT TRUE,
        reminder_time INTEGER DEFAULT 15,
        daily_meditation_reminder BOOLEAN DEFAULT FALSE,
        daily_reminder_time TEXT DEFAULT '08:00',
        community_notifications BOOLEAN DEFAULT TRUE,
        system_notifications BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Add RLS policies
      ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
      
      -- Allow users to manage only their own notification settings
      DROP POLICY IF EXISTS "Users can manage their own notification settings" ON public.user_notification_settings;
      CREATE POLICY "Users can manage their own notification settings" 
        ON public.user_notification_settings FOR ALL 
        USING (auth.uid() = user_id);
    `;

    // Check if the meditation_completions table exists and has all required columns
    const meditationCompletionsSQL = `
      CREATE TABLE IF NOT EXISTS public.meditation_completions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES meditation_events(id) ON DELETE SET NULL,
        date TIMESTAMPTZ DEFAULT NOW(),
        duration INTEGER NOT NULL,
        tradition TEXT,
        meditation_type TEXT,
        notes TEXT,
        mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5),
        mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
        tags TEXT[] DEFAULT '{}'
      );
      
      -- Add the meditation_type column if it doesn't exist
      ALTER TABLE public.meditation_completions ADD COLUMN IF NOT EXISTS meditation_type TEXT;
      
      -- Enable RLS on the table
      ALTER TABLE public.meditation_completions ENABLE ROW LEVEL SECURITY;
      
      -- Add RLS policies for meditation_completions
      DROP POLICY IF EXISTS "Users can record own meditation completions" ON public.meditation_completions;
      CREATE POLICY "Users can record own meditation completions"
        ON public.meditation_completions FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
      
      DROP POLICY IF EXISTS "Users can view own meditation completions" ON public.meditation_completions;
      CREATE POLICY "Users can view own meditation completions"
        ON public.meditation_completions FOR SELECT TO authenticated
        USING (user_id = auth.uid());
      
      DROP POLICY IF EXISTS "Users can update own meditation completions" ON public.meditation_completions;
      CREATE POLICY "Users can update own meditation completions"
        ON public.meditation_completions FOR UPDATE TO authenticated
        USING (user_id = auth.uid());
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_meditation_completions_user_id ON public.meditation_completions(user_id);
      CREATE INDEX IF NOT EXISTS idx_meditation_completions_date ON public.meditation_completions(date);
    `;
    
    // Add helper functions for string IDs
    const helperFunctionsSQL = `
      -- Function to safely get meditation events by non-UUID string IDs
      CREATE OR REPLACE FUNCTION get_meditation_event_by_string_id(event_id_param TEXT)
      RETURNS SETOF meditation_events
      LANGUAGE sql
      SECURITY DEFINER
      AS $$
        SELECT *
        FROM meditation_events
        WHERE id::text = event_id_param
        OR id::text LIKE event_id_param || '-%'; -- Also match recurring instances
      $$;
      
      -- Grant execute to all authenticated users
      GRANT EXECUTE ON FUNCTION get_meditation_event_by_string_id(TEXT) TO authenticated;
    `;

    // Execute the SQL statements
    await executeSQLSafely(eventRSVPsSQL);
    await executeSQLSafely(notificationSettingsSQL);
    await executeSQLSafely(meditationCompletionsSQL);
    await executeSQLSafely(helperFunctionsSQL);
    
    console.log('Table creation and verification completed');
    return true;
  } catch (err) {
    console.error('Failed to create/check tables:', err);
    return false;
  }
};

// Helper function to migrate data from user_meditation_history to meditation_completions
export const migrateUserMeditationHistory = async (): Promise<boolean> => {
  try {
    console.log('Starting migration from user_meditation_history to meditation_completions...');
    
    // Check if tables exist
    const migrationSQL = `
      -- First ensure both tables exist
      CREATE TABLE IF NOT EXISTS public.user_meditation_history (
        id TEXT PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        date TIMESTAMPTZ DEFAULT NOW(),
        duration INTEGER NOT NULL,
        tradition TEXT
      );
      
      CREATE TABLE IF NOT EXISTS public.meditation_completions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        event_id UUID REFERENCES meditation_events(id) ON DELETE SET NULL,
        date TIMESTAMPTZ DEFAULT NOW(),
        duration INTEGER NOT NULL,
        tradition TEXT,
        meditation_type TEXT,
        notes TEXT,
        mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5),
        mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
        tags TEXT[] DEFAULT '{}'
      );
      
      -- Add meditation_type column if it doesn't exist
      ALTER TABLE public.meditation_completions 
      ADD COLUMN IF NOT EXISTS meditation_type TEXT DEFAULT 'quick';
      
      -- Create a function to migrate data (idempotent - won't duplicate)
      CREATE OR REPLACE FUNCTION migrate_meditation_history() RETURNS INTEGER AS $$
      DECLARE
        migration_count INTEGER := 0;
      BEGIN
        INSERT INTO public.meditation_completions (
          id, 
          user_id, 
          date, 
          duration, 
          tradition, 
          meditation_type
        )
        SELECT
          CAST(COALESCE(NULLIF(id, ''), uuid_generate_v4()) AS UUID),
          user_id,
          date,
          duration,
          tradition,
          'history' as meditation_type
        FROM public.user_meditation_history h
        WHERE NOT EXISTS (
          -- Skip records that have already been migrated (by matching user and timestamp)
          SELECT 1 FROM public.meditation_completions c
          WHERE c.user_id = h.user_id AND c.date = h.date
        );
        
        GET DIAGNOSTICS migration_count = ROW_COUNT;
        RETURN migration_count;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Execute the migration function
      SELECT migrate_meditation_history();
    `;
    
    await executeSQLSafely(migrationSQL);
    
    console.log('Migration SQL executed');
    
    // Check if the migration worked by counting records
    try {
      const { count: sourceCount, error: sourceError } = await supabase
        .from('user_meditation_history')
        .select('*', { count: 'exact', head: true });
        
      const { count: destCount, error: destError } = await supabase
        .from('meditation_completions')
        .select('*', { count: 'exact', head: true });
        
      if (sourceError) {
        console.error('Error counting source records:', sourceError);
      } else if (destError) {
        console.error('Error counting destination records:', destError);
      } else {
        console.log(`Migration status: ${sourceCount} records in source, ${destCount} records in destination`);
      }
    } catch (countError) {
      console.error('Error checking migration counts:', countError);
    }
    
    return true;
  } catch (err) {
    console.error('Failed to migrate meditation history:', err);
    return false;
  }
};

// Helper function to format event ID with appropriate casting for Supabase queries
export const formatEventIdParam = (id: string): string => {
  // If it's already a valid UUID, return as is
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }
  
  // For other ID formats, explicitly cast to text to prevent Postgres UUID casting errors
  // We cast as text using the :: PostgreSQL syntax
  return `eq.${id}`;
};

// Helper function to safely get meditation details without UUID errors
export const getMeditationEventById = async (id: string) => {
  try {
    console.log(`Getting meditation event with ID: ${id}`);
    
    // Numeric or hex IDs need special handling to prevent type errors
    if (/^[0-9a-f]+$/i.test(id) && !id.includes('-')) {
      // Use the RPC method which doesn't try to cast to UUID
      const { data, error } = await supabase
        .rpc('get_meditation_event_by_string_id', { event_id_param: id });
      
      if (error) {
        console.error(`Error getting meditation by string ID ${id}:`, error);
        return { data: null, error };
      }
      
      return { data: data?.[0] || null, error: null };
    }
    
    // Otherwise use normal query for UUID format
    const { data, error } = await supabase
      .from('meditation_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();
      
    return { data, error };
  } catch (error) {
    console.error('Error in getMeditationEventById:', error);
    return { data: null, error };
  }
};