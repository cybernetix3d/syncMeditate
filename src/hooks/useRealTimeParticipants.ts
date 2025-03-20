import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { pointToLocation } from '../services/geolocation';

export interface ParticipantLocation {
  id: string;
  location: {
    latitude: number;
    longitude: number;
  };
  precision: string;
  tradition: string | null;
}

interface UseRealTimeParticipantsResult {
  participantCount: number;
  participantLocations: ParticipantLocation[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for tracking real-time meditation participants
 * @param eventId ID of the meditation event, or null for quick meditations
 * @returns Real-time participant data
 */
export const useRealTimeParticipants = (eventId: string | null): UseRealTimeParticipantsResult => {
  const [participantCount, setParticipantCount] = useState(0);
  const [participantLocations, setParticipantLocations] = useState<ParticipantLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set up real-time subscription to participants
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchInitialData = async () => {
      try {
        // Fetch participant count
        const { count: participantCount, error: countError } = await supabase
          .from('meditation_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('active', true);

        if (countError) {
          throw countError;
        }

        // Fetch participant locations
        const { data: locationData, error: locationError } = await supabase
          .from('meditation_participants')
          .select('id, location, location_precision, tradition')
          .eq('event_id', eventId)
          .eq('active', true)
          .not('location', 'is', null);

        if (locationError) {
          throw locationError;
        }

        // Process location data
        const locations = locationData
          .filter(item => item.location) // Ensure location exists
          .map(item => ({
            id: item.id,
            location: pointToLocation(item.location as unknown as string) || {
              latitude: 0,
              longitude: 0
            },
            precision: item.location_precision,
            tradition: item.tradition
          }));

        setParticipantCount(participantCount || 0);
        setParticipantLocations(locations);
      } catch (error: any) {
        console.error('Error fetching participant data:', error);
        setError(error.message || 'Failed to fetch participant data');
      } finally {
        setLoading(false);
      }
    };

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`participants-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meditation_participants',
        filter: `event_id=eq.${eventId}`
      }, payload => {
        // Handle different event types
        if (payload.eventType === 'INSERT') {
          handleInsert(payload.new);
        } else if (payload.eventType === 'UPDATE') {
          handleUpdate(payload.new);
        } else if (payload.eventType === 'DELETE') {
          handleDelete(payload.old);
        }
      })
      .subscribe();

    // Initial data fetch
    fetchInitialData();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  // Handle new participant
  const handleInsert = (newParticipant: any) => {
    if (newParticipant.active) {
      // Increment participant count
      setParticipantCount(prev => prev + 1);

      // Add location if available
      if (newParticipant.location) {
        const location = pointToLocation(newParticipant.location as unknown as string);
        if (location) {
          setParticipantLocations(prev => [
            ...prev,
            {
              id: newParticipant.id,
              location,
              precision: newParticipant.location_precision,
              tradition: newParticipant.tradition
            }
          ]);
        }
      }
    }
  };

  // Handle participant update
  const handleUpdate = (updatedParticipant: any) => {
    // Update participant count if active status changed
    if (!updatedParticipant.active) {
      setParticipantCount(prev => Math.max(0, prev - 1));
      setParticipantLocations(prev => prev.filter(p => p.id !== updatedParticipant.id));
    }

    // Update location if changed
    if (updatedParticipant.location) {
      const location = pointToLocation(updatedParticipant.location as unknown as string);
      if (location) {
        setParticipantLocations(prev => {
          const index = prev.findIndex(p => p.id === updatedParticipant.id);
          if (index === -1) {
            return [
              ...prev,
              {
                id: updatedParticipant.id,
                location,
                precision: updatedParticipant.location_precision,
                tradition: updatedParticipant.tradition
              }
            ];
          }
          const newLocations = [...prev];
          newLocations[index] = {
            id: updatedParticipant.id,
            location,
            precision: updatedParticipant.location_precision,
            tradition: updatedParticipant.tradition
          };
          return newLocations;
        });
      }
    }
  };

  // Handle participant deletion
  const handleDelete = (deletedParticipant: any) => {
    if (deletedParticipant.active) {
      setParticipantCount(prev => Math.max(0, prev - 1));
    }
    setParticipantLocations(prev => prev.filter(p => p.id !== deletedParticipant.id));
  };

  return {
    participantCount,
    participantLocations,
    loading,
    error
  };
};