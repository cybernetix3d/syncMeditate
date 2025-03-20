import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthProvider';
import { supabase } from '../api/supabase';
import { getLocationWithPrivacy, LocationPrecision, locationToPoint } from '../services/geolocation';

interface SyncMeditationOptions {
  locationPrecision: LocationPrecision | string;
  anonymous: boolean;
  shareTradition: boolean;
}

interface UseSyncMeditationResult {
  joinSession: (options: SyncMeditationOptions) => Promise<void>;
  leaveSession: () => Promise<void>;
  isJoined: boolean;
  participantCount: number;
  error: string | null;
}

/**
 * Hook for managing synchronized meditation sessions
 * @param eventId ID of the meditation event
 * @returns Functions and state for meditation synchronization
 */
export const useSyncMeditation = (eventId: string): UseSyncMeditationResult => {
  const { user } = useAuth();
  const [isJoined, setIsJoined] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Set up real-time subscription to participant count
  useEffect(() => {
    if (!eventId) return;

    const subscription = supabase
      .channel(`meditation-count-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meditation_participants',
        filter: `event_id=eq.${eventId}`
      }, () => {
        // When there's any change, update the count
        countParticipants();
      })
      .subscribe();

    // Initial count
    countParticipants();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  // Count active participants
  const countParticipants = async () => {
    try {
      const { count, error } = await supabase
        .from('meditation_participants')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('active', true);

      if (error) {
        console.error('Error counting participants:', error);
        return;
      }

      setParticipantCount(count || 0);
    } catch (error) {
      console.error('Error in countParticipants:', error);
    }
  };

  // Check if current user is already joined
  useEffect(() => {
    if (!user || !eventId) {
      setIsJoined(false);
      return;
    }

    const checkIfJoined = async () => {
      try {
        const { data, error } = await supabase
          .from('meditation_participants')
          .select('id')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .eq('active', true)
          .maybeSingle();

        if (error) {
          console.error('Error checking if joined:', error);
          return;
        }

        setIsJoined(!!data);
        if (data) {
          setParticipantId(data.id);
        }
      } catch (error) {
        console.error('Error in checkIfJoined:', error);
      }
    };

    checkIfJoined();
  }, [user, eventId]);

  // Join meditation session
  const joinSession = async (options: SyncMeditationOptions) => {
    if (!user || !eventId) {
      setError('User not authenticated or event ID missing');
      return;
    }

    if (isJoined) {
      // Already joined, nothing to do
      return;
    }

    try {
      setError(null);

      // Get user location with privacy controls
      const location = await getLocationWithPrivacy(
        options.locationPrecision as LocationPrecision
      );

      // Convert location to PostgreSQL point format
      const locationPoint = locationToPoint(location);

      // Get user's faith tradition if they're sharing it
      let tradition = null;
      if (options.shareTradition && user.faith_preferences?.primaryTradition) {
        tradition = user.faith_preferences.primaryTradition;
      }

      // Create participant record
      const { data, error } = await supabase
        .from('meditation_participants')
        .insert([
          {
            event_id: eventId,
            user_id: user.id,
            joined_at: new Date().toISOString(),
            active: true,
            location: locationPoint,
            location_precision: options.locationPrecision,
            tradition: tradition,
            anonymous_mode: options.anonymous,
            session_id: Math.random().toString(36).substring(2, 15) // Generate random session ID
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error joining session:', error);
        setError('Failed to join meditation session');
        return;
      }

      // Update state
      setIsJoined(true);
      setParticipantId(data.id);
    } catch (error) {
      console.error('Error in joinSession:', error);
      setError('An unexpected error occurred');
    }
  };

  // Leave meditation session
  const leaveSession = async () => {
    if (!user || !eventId || !isJoined || !participantId) {
      return;
    }

    try {
      setError(null);

      // Update participant record
      const { error } = await supabase
        .from('meditation_participants')
        .update({
          active: false,
          left_at: new Date().toISOString()
        })
        .eq('id', participantId);

      if (error) {
        console.error('Error leaving session:', error);
        setError('Failed to leave meditation session');
        return;
      }

      // Update state
      setIsJoined(false);
      setParticipantId(null);
    } catch (error) {
      console.error('Error in leaveSession:', error);
      setError('An unexpected error occurred');
    }
  };

  return {
    joinSession,
    leaveSession,
    isJoined,
    participantCount,
    error
  };
};