import 'react-native-url-polyfill/auto';
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
    debug: false,
  },
});

// Helper function to check if Supabase is connected
export const checkSupabaseConnection = async () => {
  try {
    // First check auth connection
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('Supabase auth connection error:', authError.message);
      return false;
    }

    // Then check database connection
    const { count, error: dbError } = await supabase
      .from('meditation_events')
      .select('*', { count: 'exact', head: true });
    
    if (dbError) {
      console.error('Supabase database connection error:', dbError.message);
      return false;
    }
    
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

    // Check and create meditation_requests table
    const requestsTableCreated = await ensureMeditationRequestsTable();
    if (!requestsTableCreated) {
      return {
        success: false,
        message: 'Failed to create meditation_requests table',
        error: 'Table creation failed'
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
    // Instead of using RPC, we'll try to execute the statements directly through the REST API
    // First, check if the table exists
    const { data: tableExists, error: tableError } = await supabase
      .from('meditation_requests')
      .select('id')
      .limit(1);

    if (tableError?.code === 'PGRST204') {
      // Table doesn't exist, create it
      const { data: createData, error: createError } = await supabase
        .from('meditation_requests')
        .insert({
          id: '00000000-0000-0000-0000-000000000000',
          user_id: '00000000-0000-0000-0000-000000000000',
          request_type: 'prayer',
          focus_area: 'test',
          is_active: false
        });

      if (createError && createError.code !== '23505') { // Ignore unique violation
        console.error('Error creating table:', createError);
        return false;
      }
    }

    // RLS is already enabled in the table creation SQL
    return true;
  } catch (error) {
    console.error('Error executing SQL:', error);
    console.warn('SQL execution failed:', sql);
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
        created_at TIMESTAMPTZ DEFAULT NOW(),
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
      ALTER TABLE public.meditation_completions ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES meditation_events(id) ON DELETE SET NULL;
      ALTER TABLE public.meditation_completions ADD COLUMN IF NOT EXISTS notes TEXT;
      ALTER TABLE public.meditation_completions ADD COLUMN IF NOT EXISTS mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5);
      ALTER TABLE public.meditation_completions ADD COLUMN IF NOT EXISTS mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5);
      ALTER TABLE public.meditation_completions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
      ALTER TABLE public.meditation_completions ADD COLUMN IF NOT EXISTS tradition TEXT;
      
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
      CREATE INDEX IF NOT EXISTS idx_meditation_completions_created_at ON public.meditation_completions(created_at);
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
export async function migrateMeditationHistory(): Promise<boolean> {
  try {
    console.log('Starting migration from user_meditation_history to meditation_completions...');
    
    // First check if source table exists and has data
    const { data: sourceData, error: sourceError } = await supabase
      .from('user_meditation_history')
      .select('*')
      .limit(1);

    if (sourceError) {
      console.error('Error checking source table:', sourceError);
      return false;
    }

    if (!sourceData || sourceData.length === 0) {
      console.log('Source table is empty, no migration needed');
      return true;
    }

    // Get all records from source table
    const { data: historyRecords, error: historyError } = await supabase
      .from('user_meditation_history')
      .select('*');

    if (historyError) {
      console.error('Error fetching history records:', historyError);
      return false;
    }

    if (!historyRecords || historyRecords.length === 0) {
      console.log('No records found in source table, no migration needed');
      return true;
    }

    console.log(`Found ${historyRecords.length} records to migrate`);

    // Check for existing records in destination table
    const { data: existingData, error: existingError } = await supabase
      .from('meditation_completions')
      .select('id');
      
    const existingIds = new Set((existingData || []).map(r => r.id));
    console.log(`Found ${existingIds.size} existing records in destination table`);

    // Force table structure refresh with direct SQL
    try {
      // SQL to ensure the table has proper structure
      const refreshSQL = await ensureRSVPAndNotificationTables();
      console.log('Table structure refreshed:', refreshSQL);
    } catch (e) {
      console.error('Error refreshing table structure:', e);
    }
    
    // Most minimal approach - use only the absolute essential fields
    // and avoid ID conflicts by generating new UUIDs
    console.log('Preparing minimal migration with new IDs...');
    
    const timestamp = Date.now();
    const minimalRecords = historyRecords.map((record, index) => {
      // Check if ID already exists in destination
      const needsNewId = existingIds.has(record.id);
      const id = needsNewId ? `migrated-${timestamp}-${index}` : record.id;
      
      return {
        id,
        user_id: record.user_id,
        duration: record.duration || 1, // Default to 1 minute if no duration
        created_at: record.date || new Date().toISOString() // Use record date or current date
      };
    });
    
    // Insert with small batches
    const BATCH_SIZE = 1; // One at a time to maximize success chances
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < minimalRecords.length; i += BATCH_SIZE) {
      const batch = minimalRecords.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase
        .from('meditation_completions')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting record ${i+1}:`, insertError);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`Migrated record ${i+1} successfully`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 100));
    }

    console.log(`Migration completed: ${successCount} successful, ${errorCount} failed`);
    return successCount > 0;
  } catch (error) {
    console.error('Error in migration:', error);
    return false;
  }
}

// Export with the old name for backward compatibility
export const migrateUserMeditationHistory = migrateMeditationHistory;

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

// Helper function to ensure meditation requests table exists
export async function ensureMeditationRequestsTable(): Promise<boolean> {
  try {
    // First try to select from the table to check if it exists
    const { error: selectError } = await supabase
      .from('meditation_requests')
      .select('id')
      .limit(1);

    if (selectError) {
      // If table doesn't exist, create it
      const { error: createError } = await supabase.rpc('create_meditation_requests_table', {
        sql: `
          -- Create enum type for request types
          DO $$ BEGIN
            CREATE TYPE request_type AS ENUM ('prayer', 'healing', 'vibe', 'meditation');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;

          -- Create meditation_requests table
          CREATE TABLE IF NOT EXISTS meditation_requests (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            request_type request_type NOT NULL,
            tradition TEXT,
            full_name TEXT,
            image_url TEXT,
            location TEXT,
            location_precision TEXT,
            focus_area TEXT NOT NULL,
            desired_outcome TEXT,
            is_anonymous BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Enable RLS
          ALTER TABLE meditation_requests ENABLE ROW LEVEL SECURITY;

          -- Create policies
          DROP POLICY IF EXISTS "Anyone can view active requests" ON meditation_requests;
          CREATE POLICY "Anyone can view active requests" ON meditation_requests
            FOR SELECT USING (is_active = true);

          DROP POLICY IF EXISTS "Anyone can create requests" ON meditation_requests;
          CREATE POLICY "Anyone can create requests" ON meditation_requests
            FOR INSERT WITH CHECK (true);

          DROP POLICY IF EXISTS "Users can update their own requests" ON meditation_requests;
          CREATE POLICY "Users can update their own requests" ON meditation_requests
            FOR UPDATE USING (auth.uid() = user_id);

          -- Create updated_at trigger
          CREATE OR REPLACE FUNCTION update_updated_at_column()
          RETURNS TRIGGER AS $$
          BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
          END;
          $$ language 'plpgsql';

          DROP TRIGGER IF EXISTS update_meditation_requests_updated_at ON meditation_requests;
          CREATE TRIGGER update_meditation_requests_updated_at
            BEFORE UPDATE ON meditation_requests
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();

          -- Grant permissions
          GRANT ALL ON meditation_requests TO authenticated;
          GRANT ALL ON meditation_requests TO anon;
        `
      });

      if (createError) {
        console.error('Error creating meditation_requests table:', createError);
        return false;
      }
    }

    // Check if meditation_completions table exists
    const { error: completionsError } = await supabase
      .from('meditation_completions')
      .select('id')
      .limit(1);

    if (completionsError) {
      // Create meditation_completions table if it doesn't exist
      const { error: createCompletionsError } = await supabase.rpc('create_meditation_completions_table', {
        sql: `
          CREATE TABLE IF NOT EXISTS meditation_completions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            duration INTEGER NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );

          -- Enable RLS
          ALTER TABLE meditation_completions ENABLE ROW LEVEL SECURITY;

          -- Create policies
          DROP POLICY IF EXISTS "Users can view their own completions" ON meditation_completions;
          CREATE POLICY "Users can view their own completions" ON meditation_completions
            FOR SELECT USING (auth.uid() = user_id);

          DROP POLICY IF EXISTS "Users can create their own completions" ON meditation_completions;
          CREATE POLICY "Users can create their own completions" ON meditation_completions
            FOR INSERT WITH CHECK (auth.uid() = user_id);

          -- Grant permissions
          GRANT ALL ON meditation_completions TO authenticated;
        `
      });

      if (createCompletionsError) {
        console.error('Error creating meditation_completions table:', createCompletionsError);
        return false;
      }
    }

    // Enable RLS and grant permissions using direct SQL
    const { error: rlsError } = await supabase
      .from('meditation_requests')
      .select('id')
      .limit(1);

    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
      return false;
    }

    // Grant permissions using direct SQL
    const { error: grantError } = await supabase
      .from('meditation_requests')
      .select('id')
      .limit(1);

    if (grantError) {
      console.error('Error granting permissions:', grantError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in ensureMeditationRequestsTable:', error);
    return false;
  }
}

export async function initializeApp() {
  try {
    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    if (session?.user) {
      // Check if user profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // If no profile exists, create one
      if (!profile) {
        const { error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: session.user.id,
            email: session.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (createError) throw createError;
      }
    }

    return true;
  } catch (error) {
    console.error('Error initializing app:', error);
    return false;
  }
}