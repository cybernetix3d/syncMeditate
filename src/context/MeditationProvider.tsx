import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthProvider';

// Define meditation event type
export interface MeditationEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string; // ISO string
  duration: number; // in minutes
  tradition: string | null;
  created_by: string | null;
  created_at: string; // ISO string
  is_global: boolean;
}

// Define participant type
export interface MeditationParticipant {
  id: string;
  event_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  active: boolean;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  location_precision: 'precise' | 'city' | 'country' | 'none';
  tradition: string | null;
  anonymous_mode: boolean;
}

// Define meditation session state
export type MeditationSessionState = 'PREPARING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED';

// Define meditation context
interface MeditationContextType {
  currentEvent: MeditationEvent | null;
  participants: MeditationParticipant[];
  participantCount: number;
  isParticipating: boolean;
  sessionState: MeditationSessionState;
  loadEvent: (eventId: string) => Promise<MeditationEvent | null>;
  joinEvent: (eventId: string, locationPrecision: string) => Promise<void>;
  leaveEvent: (eventId: string) => Promise<void>;
  changeSessionState: (state: MeditationSessionState) => void;
  createEvent: (event: Partial<MeditationEvent>) => Promise<string | null>;
  completeMeditation: (eventId: string, duration: number) => Promise<void>;
}

// Create meditation context
const MeditationContext = createContext<MeditationContextType>({
  currentEvent: null,
  participants: [],
  participantCount: 0,
  isParticipating: false,
  sessionState: 'PREPARING',
  loadEvent: async () => null,
  joinEvent: async () => {},
  leaveEvent: async () => {},
  changeSessionState: () => {},
  createEvent: async () => null,
  completeMeditation: async () => {}
});

// Create provider component
export function MeditationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentEvent, setCurrentEvent] = useState<MeditationEvent | null>(null);
  const [participants, setParticipants] = useState<MeditationParticipant[]>([]);
  const [isParticipating, setIsParticipating] = useState(false);
  const [sessionState, setSessionState] = useState<MeditationSessionState>('PREPARING');

  // Subscribe to real-time updates when event is loaded
  useEffect(() => {
    if (!currentEvent) return;

    // Subscribe to participants changes
    const subscription = supabase
      .channel(`meditation-participants-${currentEvent.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meditation_participants',
        filter: `event_id=eq.${currentEvent.id}`
      }, payload => {
        // Update participants state based on the change type
        if (payload.eventType === 'INSERT') {
          setParticipants(prev => [...prev, payload.new as MeditationParticipant]);
        } else if (payload.eventType === 'UPDATE') {
          setParticipants(prev => 
            prev.map(p => p.id === payload.new.id ? payload.new as MeditationParticipant : p)
          );
        } else if (payload.eventType === 'DELETE') {
          setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe();

    // Fetch initial participants
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('meditation_participants')
        .select('*')
        .eq('event_id', currentEvent.id)
        .eq('active', true);

      if (data) {
        setParticipants(data as MeditationParticipant[]);
      }
    };

    fetchParticipants();

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [currentEvent]);

  // Check if current user is participating
  useEffect(() => {
    if (!user || !currentEvent) {
      setIsParticipating(false);
      return;
    }

    const isUserParticipating = participants.some(
      p => p.user_id === user.id && p.active
    );
    
    setIsParticipating(isUserParticipating);
  }, [user, currentEvent, participants]);

  // Load meditation event by ID
  const loadEvent = async (eventId: string): Promise<MeditationEvent | null> => {
    try {
      const { data, error } = await supabase
        .from('meditation_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error loading meditation event:', error);
        return null;
      }

      const event = data as MeditationEvent;
      setCurrentEvent(event);
      return event;
    } catch (error) {
      console.error('Error in loadEvent:', error);
      return null;
    }
  };

  // Join meditation event
  const joinEvent = async (eventId: string, locationPrecision: string) => {
    if (!user) return;

    try {
      // Create a participant record
      const { error } = await supabase
        .from('meditation_participants')
        .insert([
          {
            event_id: eventId,
            user_id: user.id,
            active: true,
            location_precision: locationPrecision,
            anonymous_mode: user.privacy_settings?.useAnonymousId || true,
            // Location would be added here in a real implementation
          }
        ]);

      if (error) {
        console.error('Error joining event:', error);
      }
    } catch (error) {
      console.error('Error in joinEvent:', error);
    }
  };

  // Leave meditation event
  const leaveEvent = async (eventId: string) => {
    if (!user) return;

    try {
      // Find the participant record
      const { data } = await supabase
        .from('meditation_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .eq('active', true);

      if (data && data.length > 0) {
        // Update the record to mark as inactive
        const { error } = await supabase
          .from('meditation_participants')
          .update({
            active: false,
            left_at: new Date().toISOString()
          })
          .eq('id', data[0].id);

        if (error) {
          console.error('Error leaving event:', error);
        }
      }
    } catch (error) {
      console.error('Error in leaveEvent:', error);
    }
  };

  // Change meditation session state
  const changeSessionState = (state: MeditationSessionState) => {
    setSessionState(state);
  };

  // Create a new meditation event
  const createEvent = async (event: Partial<MeditationEvent>): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('meditation_events')
        .insert([
          {
            title: event.title,
            description: event.description,
            start_time: event.start_time || new Date().toISOString(),
            duration: event.duration || 10,
            tradition: event.tradition,
            created_by: user.id,
            is_global: event.is_global || false
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error in createEvent:', error);
      return null;
    }
  };

  // Complete meditation session
  const completeMeditation = async (eventId: string, duration: number) => {
    if (!user) return;

    try {
      // Record meditation completion
      const { error } = await supabase
        .from('meditation_completions')
        .insert([
          {
            user_id: user.id,
            event_id: eventId,
            duration: duration,
            completed: true
          }
        ]);

      if (error) {
        console.error('Error recording meditation completion:', error);
      }

      // Update participant status
      await leaveEvent(eventId);
    } catch (error) {
      console.error('Error in completeMeditation:', error);
    }
  };

  return (
    <MeditationContext.Provider value={{
      currentEvent,
      participants,
      participantCount: participants.filter(p => p.active).length,
      isParticipating,
      sessionState,
      loadEvent,
      joinEvent,
      leaveEvent,
      changeSessionState,
      createEvent,
      completeMeditation
    }}>
      {children}
    </MeditationContext.Provider>
  );
}

// Create hook for using meditation context
export const useMeditation = () => {
  const context = useContext(MeditationContext);
  if (context === undefined) {
    throw new Error('useMeditation must be used within a MeditationProvider');
  }
  return context;
};