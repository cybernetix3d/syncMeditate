// src/utils/adminEventManager.ts
import { supabase } from '../../src/api/supabase';

export class AdminEventManager {
  /**
   * Create solar events for a given date
   * @param date The date to create events for (defaults to today)
   * @returns Promise resolving to success boolean
   */
  static async createSolarEventsForDate(date: Date = new Date()): Promise<boolean> {
    try {
      console.log('Admin creating solar events for date:', date.toISOString());
      
      // Normalize the date to start of day
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      // Create end of day for filtering
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // First check if we already have solar events for this date
      // Use a standard OR condition without relying on is_system
      const { data: existingEvents, error: checkError } = await supabase
        .from('meditation_events')
        .select('id, title')
        .or(`title.ilike.%Sunrise%,title.ilike.%Midday%,title.ilike.%Sunset%,title.ilike.%Midnight%`)
        .gte('start_time', targetDate.toISOString())
        .lt('start_time', nextDay.toISOString());
      
      if (checkError) {
        console.error("Error checking for existing solar events:", checkError);
        return false;
      }
      
      // Delete existing solar events for this date if they exist
      if (existingEvents && existingEvents.length > 0) {
        console.log(`Found ${existingEvents.length} existing solar events for ${targetDate.toDateString()}, deleting...`);
        
        const eventIds = existingEvents.map(e => e.id);
        const { error: deleteError } = await supabase
          .from('meditation_events')
          .delete()
          .in('id', eventIds);
        
        if (deleteError) {
          console.error("Error deleting existing solar events:", deleteError);
          return false;
        }
        
        console.log(`Deleted ${existingEvents.length} existing solar events`);
      }
      
      // Get admin user or system account
      let systemId = null;
      try {
        // Try to get the current authenticated user
        const { data: session } = await supabase.auth.getSession();
        if (session?.session?.user?.id) {
          systemId = session.session.user.id;
        } else {
          // Use null if no authenticated user
          systemId = null;
        }
      } catch (error) {
        console.error('Error finding user for system events:', error);
        // Use null as fallback
        systemId = null;
      }
      
      // Define the four solar events for the given date
      const basicEvents = [
        {
          title: "Daily Sunrise Meditation",
          description: "Start your day with a peaceful sunrise meditation. This daily practice helps center your mind and prepare for the day ahead.",
          start_time: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 6, 0, 0).toISOString(),
          duration: 15,
          tradition: 'universal',
          created_by: systemId,
          is_global: true
        },
        {
          title: "Midday Mindfulness",
          description: "Take a break from your busy day to recenter and find clarity with this midday practice.",
          start_time: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12, 0, 0).toISOString(),
          duration: 10,
          tradition: 'universal',
          created_by: systemId,
          is_global: true
        },
        {
          title: "Sunset Reflection",
          description: "Wind down your day with a peaceful sunset meditation. Release the day's tensions and find tranquility.",
          start_time: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 18, 0, 0).toISOString(),
          duration: 20,
          tradition: 'universal',
          created_by: systemId,
          is_global: true
        },
        {
          title: "Midnight Stillness",
          description: "Experience the profound silence of late night meditation. Connect with your deeper self in this quiet practice.",
          start_time: new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0).toISOString(), 
          duration: 15,
          tradition: 'universal',
          created_by: systemId,
          is_global: true
        }
      ];
      
      // Create the events in the database
      try {
        const { data, error } = await supabase
          .from('meditation_events')
          .insert(basicEvents)
          .select();
        
        if (error) {
          console.error('Error creating solar events:', error);
          
          // If error is related to created_by constraint, try once more with null
          if (error.code === '23503' && error.message.includes('meditation_events_created_by_fkey')) {
            console.log('Retrying with NULL for created_by field');
            
            // Set all created_by to null and try again
            const nullEvents = basicEvents.map(event => ({
              ...event,
              created_by: null
            }));
            
            const { data: retryData, error: retryError } = await supabase
              .from('meditation_events')
              .insert(nullEvents)
              .select();
              
            if (retryError) {
              console.error('Second attempt failed:', retryError);
              return false;
            }
            
            console.log(`Successfully created ${retryData?.length || 0} solar events on second attempt`);
            return true;
          }
          
          return false;
        }
        
        console.log(`Successfully created ${data?.length || 0} solar events`);
        return true;
      } catch (insertError) {
        console.error('Exception during database insertion:', insertError);
        return false;
      }
    } catch (error) {
      console.error('Exception in createSolarEventsForDate:', error);
      return false;
    }
  }

  /**
   * Create solar events for a range of dates
   * @param startDate The start date (inclusive)
   * @param days Number of days to create events for
   * @returns Promise resolving to number of successful days
   */
  static async createSolarEventsForRange(startDate: Date = new Date(), days: number = 7): Promise<number> {
    try {
      console.log(`Creating solar events for ${days} days starting from ${startDate.toDateString()}`);
      
      let successCount = 0;
      
      // Create events for each day in the range
      for (let i = 0; i < days; i++) {
        const targetDate = new Date(startDate);
        targetDate.setDate(targetDate.getDate() + i);
        
        const success = await this.createSolarEventsForDate(targetDate);
        if (success) {
          successCount++;
        }
      }
      
      console.log(`Successfully created solar events for ${successCount} out of ${days} days`);
      return successCount;
    } catch (error) {
      console.error('Exception in createSolarEventsForRange:', error);
      return 0;
    }
  }

  /**
   * Get all system events for a date range
   * @param startDate The start date (inclusive)
   * @param days Number of days to fetch
   * @returns Promise resolving to array of system events
   */
  static async getSystemEvents(startDate: Date = new Date(), days: number = 14): Promise<any[]> {
    try {
      // Normalize the date to start of day
      const targetDate = new Date(startDate);
      targetDate.setHours(0, 0, 0, 0);
      
      // Calculate end date
      const endDate = new Date(targetDate);
      endDate.setDate(endDate.getDate() + days);
      
      console.log('Fetching system events between:', targetDate.toISOString(), 'and', endDate.toISOString());
      
      // Skip using is_system and just filter by title pattern
      const { data, error } = await supabase
        .from('meditation_events')
        .select('*')
        .or(`title.ilike.%Sunrise%,title.ilike.%Midday%,title.ilike.%Sunset%,title.ilike.%Midnight%`)
        .gte('start_time', targetDate.toISOString())
        .lt('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });
      
      if (error) {
        console.error('Error fetching system events:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Exception in getSystemEvents:', error);
      return [];
    }
  }

  /**
   * Delete a specific system event
   * @param eventId The ID of the event to delete
   * @returns Promise resolving to success boolean
   */
  static async deleteSystemEvent(eventId: string): Promise<boolean> {
    try {
      // Try to delete directly (no need to check is_system)
      const { error } = await supabase
        .from('meditation_events')
        .delete()
        .eq('id', eventId);
      
      if (error) {
        console.error('Error deleting system event:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception in deleteSystemEvent:', error);
      return false;
    }
  }
}