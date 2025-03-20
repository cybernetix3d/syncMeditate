import { useEffect, useState } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from '../context/AuthProvider';
import { UserProfile } from '../context/AuthProvider';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseSyncMeditationResult {
  joinSession: (options: {
    locationPrecision: string;
    anonymous: boolean;
    shareTradition: boolean;
  }) => Promise<void>;
  leaveSession: () => Promise<void>;
  participantCount: number;
  isJoined: boolean;
  loading: boolean;
  error: string | null;
}

interface MeditationParticipant {
  active: boolean;
  event_id: string;
  user_id: string;
}

const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile => {
  return typeof user !== 'boolean' && user !== null && 'id' in user;
};

/**
 * Hook for syncing meditation session participation
 * @param eventId ID of the meditation event, or null for quick meditations
 * @returns Functions to join/leave session and participant count
 */
export const useSyncMeditation = (eventId: string | null): UseSyncMeditationResult => {
  const { user } = useAuth();
  const [participantCount, setParticipantCount] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already joined
  useEffect(() => {
    if (!eventId || !isUserProfile(user)) {
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

        if (error) throw error;
        setIsJoined(!!data);
      } catch (err: any) {
        console.error('Error checking if joined:', err);
        setError(err.message);
      }
    };

    checkIfJoined();
  }, [eventId, user]);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const fetchParticipantCount = async () => {
      try {
        const { count, error } = await supabase
          .from('meditation_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('active', true);

        if (error) throw error;
        setParticipantCount(count || 0);
      } catch (err: any) {
        console.error('Error fetching participant count:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipantCount();

    // Subscribe to changes
    const subscription = supabase
      .channel(`participants-${eventId}`)
      .on(
        'postgres_changes' as const,
        {
          event: '*',
          schema: 'public',
          table: 'meditation_participants',
          filter: `event_id=eq.${eventId}`
        },
        (payload: RealtimePostgresChangesPayload<MeditationParticipant>) => {
          if (payload.eventType === 'INSERT' && payload.new?.active) {
            setParticipantCount(prev => prev + 1);
          } else if (payload.eventType === 'DELETE' || 
                    (payload.eventType === 'UPDATE' && !payload.new?.active)) {
            setParticipantCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  const joinSession = async (options: {
    locationPrecision: string;
    anonymous: boolean;
    shareTradition: boolean;
  }) => {
    if (!isUserProfile(user)) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      // For quick meditations, we don't track participants
      if (!eventId) {
        return;
      }

      const { error } = await supabase
        .from('meditation_participants')
        .upsert({
          event_id: eventId,
          user_id: user.id,
          active: true,
          location_precision: options.locationPrecision,
          anonymous_mode: options.anonymous,
          tradition: options.shareTradition ? user.faith_preferences?.primaryTradition : null
        });

      if (error) throw error;
      setIsJoined(true);
    } catch (err: any) {
      console.error('Error joining session:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const leaveSession = async () => {
    if (!isUserProfile(user)) {
      throw new Error('User not authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      // For quick meditations, we don't track participants
      if (!eventId) {
        return;
      }

      const { error } = await supabase
        .from('meditation_participants')
        .update({ active: false })
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;
      setIsJoined(false);
    } catch (err: any) {
      console.error('Error leaving session:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    joinSession,
    leaveSession,
    participantCount,
    isJoined,
    loading,
    error
  };
};