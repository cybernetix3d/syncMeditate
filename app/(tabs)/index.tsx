import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthProvider';
import { useMeditation } from '../../src/context/MeditationProvider';
import { supabase } from '../../src/api/supabase';
import { FAITH_TRADITIONS } from '../../src/components/faith/TraditionSelector';
import Button from '../../src/components/common/Button';
import { COLORS, COMMON_STYLES } from '../../src/constants/Styles';
import { useTheme } from '../../src/context/ThemeContext';
import { UserProfile } from '../../src/context/AuthProvider';
import { scheduleEventReminder, cancelNotification } from '@/src/services/NotificationService';

interface MeditationEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  duration: number;
  tradition: string | null;
  created_by: string | null;
  created_at: string;
  is_global: boolean;
  participant_count: number;
  meditation_participants?: Array<{
    id: string;
    active: boolean;
  }>;
}

interface MeditationCompletion {
  id: string;
  user_id: string;
  event_id: string | null;
  completed_at: string;
  duration: number; // duration stored in seconds in user_meditation_history
  completed: boolean;
  meditation_type?: 'quick' | 'global' | 'scheduled' | 'user_history';
  meditation_events: (MeditationEvent & {
    meditation_participants?: Array<{
      id: string;
      active: boolean;
    }>;
  }) | null;
  notes?: string | null;
  tradition?: string | null;
}

interface MeditationHistory {
  id: string;
  user_id: string;
  event_id: string | null;
  date: string;
  duration: number; // duration in seconds
  tradition: string | null;
  notes: string | null;
  mood_before?: number;
  mood_after?: number;
}

interface CommunityStats {
  total_users: number;
  active_now: number;
  total_sessions: number;
  global_minutes: number;
}

interface GlobalActivity {
  time: string;
  count: number;
}

interface EventCardProps {
  event: MeditationEvent;
  attendanceStatus: string | null;
  isRSVPed: boolean;
  onRSVP: (event: MeditationEvent) => void;
  onSetAttendance: (event: MeditationEvent, status: 'attending' | 'interested' | null) => void;
}

const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  attendanceStatus,
  isRSVPed,
  onRSVP,
  onSetAttendance
}) => {
  const router = useRouter();
  const { colors } = useTheme();
  const traditionObj = FAITH_TRADITIONS.find(t => t.id === (event.tradition || 'secular')) || FAITH_TRADITIONS[0];
  
  const isHappeningNow = (): boolean => {
    const now = new Date();
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(eventStart.getTime() + event.duration * 60000);
    return now >= eventStart && now <= eventEnd;
  };
  
  const canJoin = (): boolean => {
    const now = new Date();
    const eventStart = new Date(event.start_time);
    return now >= eventStart;
  };
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getTimeUntil = (): string | null => {
    const now = new Date();
    const eventStart = new Date(event.start_time);
    const diffMs = eventStart.getTime() - now.getTime();
    if (diffMs < 0) return null;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return diffHrs > 0 ? `In ${diffHrs}h ${diffMins}m` : `In ${diffMins}m`;
  };
  
  const handlePress = () => {
    if (isHappeningNow()) {
      router.push(`/meditation/sync?id=${event.id}&duration=${event.duration}`);
    } else {
      router.push(`/meditation/${event.id}`);
    }
  };
  
  const live = isHappeningNow();
  const timeUntil = getTimeUntil();
  
  return (
    <TouchableOpacity 
      style={[styles.meditationCard, { backgroundColor: colors.surface }]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.traditionIcon, { backgroundColor: traditionObj.color }]}>
          <Ionicons name={traditionObj.ionicon as any} size={20} color="#FFF" />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>{event.title}</Text>
          <Text style={[styles.cardSubtitle, { color: colors.gray }]}>
            {formatTime(new Date(event.start_time))}
          </Text>
        </View>
      </View>
      
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <View style={styles.cardDetailItem}>
          <Ionicons name="time-outline" size={16} color={colors.gray} />
          <Text style={[styles.cardDetailText, { color: colors.gray }]}>{event.duration} min</Text>
        </View>
        
        <View style={styles.cardDetailItem}>
          <Ionicons name="people-outline" size={16} color={colors.gray} />
          <Text style={[styles.cardDetailText, { color: colors.gray }]}>
            {event.participant_count || 0} active
          </Text>
        </View>
        
        <View style={styles.cardActions}>
          {/* RSVP button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isRSVPed ? colors.secondary : colors.surface }
            ]}
            onPress={() => onRSVP(event)}
          >
            <Ionicons
              name={isRSVPed ? "notifications" : "notifications-outline"}
              size={18}
              color={isRSVPed ? colors.white : colors.gray}
            />
          </TouchableOpacity>
          
          {/* Attendance buttons */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: attendanceStatus === 'attending' ? colors.primary : colors.surface }
            ]}
            onPress={() => onSetAttendance(event, attendanceStatus === 'attending' ? null : 'attending')}
          >
            <Ionicons
              name={attendanceStatus === 'attending' ? "checkmark-circle" : "checkmark-circle-outline"}
              size={18}
              color={attendanceStatus === 'attending' ? colors.white : colors.gray}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: attendanceStatus === 'interested' ? colors.accent : colors.surface }
            ]}
            onPress={() => onSetAttendance(event, attendanceStatus === 'interested' ? null : 'interested')}
          >
            <Ionicons
              name={attendanceStatus === 'interested' ? "star" : "star-outline"}
              size={18}
              color={attendanceStatus === 'interested' ? colors.white : colors.gray}
            />
          </TouchableOpacity>
        </View>
        
        {/* Join button / Live indicator */}
        {live ? (
          <View style={[styles.joinNowButton, styles.liveButton]}>
            <View style={styles.liveIndicator} />
            <Text style={[styles.joinNowText, styles.liveText]}>Live Now</Text>
          </View>
        ) : timeUntil ? (
          <View style={styles.timeUntilContainer}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text style={[styles.timeUntilText, { color: colors.primary }]}>{timeUntil}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

const MeditationCard: React.FC<{
  title: string;
  subtitle: string;
  duration: number;
  tradition: string;
  participants?: number;
  isGlobal?: boolean;
  eventId: string;
  startTime?: string;
}> = ({ title, subtitle, duration, tradition, participants = 0, isGlobal = false, eventId, startTime }) => {
  const router = useRouter();
  const traditionObj = FAITH_TRADITIONS.find(t => t.id === tradition) || FAITH_TRADITIONS[0];

  const isHappeningNow = (): boolean => {
    if (!startTime) return false;
    const now = new Date();
    const eventStart = new Date(startTime);
    const eventEnd = new Date(eventStart.getTime() + duration * 60000);
    return now >= eventStart && now <= eventEnd;
  };

  const canJoin = (): boolean => {
    if (!startTime) return true;
    const now = new Date();
    const eventStart = new Date(startTime);
    return now >= eventStart;
  };

  const getTimeUntil = (): string | null => {
    if (!startTime) return null;
    const now = new Date();
    const eventStart = new Date(startTime);
    const diffMs = eventStart.getTime() - now.getTime();
    if (diffMs < 0) return null;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return diffHrs > 0 ? `In ${diffHrs}h ${diffMins}m` : `In ${diffMins}m`;
  };

  const navigateToMeditation = () => {
    if (canJoin()) {
      router.push(`/meditation/sync?id=${eventId}&duration=${duration}`);
    } else {
      router.push(`/meditation/${eventId}`);
    }
  };

  const timeUntil = getTimeUntil();
  const live = isHappeningNow();
  const joinable = canJoin();

  return (
    <TouchableOpacity
      style={[styles.meditationCard, !joinable && styles.disabledCard]}
      onPress={navigateToMeditation}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.traditionIcon, { backgroundColor: traditionObj.color }]}>
          <Ionicons name={traditionObj.ionicon as any} size={20} color={COLORS.pastel2} />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.cardDetailItem}>
          <Ionicons name="time-outline" size={16} color={COLORS.gray} />
          <Text style={styles.cardDetailText}>{duration} min</Text>
        </View>
        {isGlobal && (
          <View style={styles.cardDetailItem}>
            <Ionicons name="people-outline" size={16} color={COLORS.gray} />
            <Text style={styles.cardDetailText}>{participants} active</Text>
          </View>
        )}
        <View style={[
          styles.joinNowButton, 
          live && styles.liveButton,
          !joinable && styles.disabledButton
        ]}>
          {live ? (
            <>
              <View style={styles.liveIndicator} />
              <Text style={[styles.joinNowText, styles.liveText]}>Live</Text>
            </>
          ) : timeUntil ? (
            <Text style={[styles.joinNowText, styles.disabledText]}>{timeUntil}</Text>
          ) : (
            <>
              <Text style={styles.joinNowText}>Join</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile =>
  typeof user !== 'boolean' && user !== null && 'id' in user;

// Helper functions for event status
const getEventAttendanceStatus = (eventId: string, statuses: Record<string, string>): string | null => {
  // Extract the original event ID (removing the date-specific suffix)
  let originalId = eventId;
  if (eventId.includes('-')) {
    const segments = eventId.split('-');
    // If this looks like a UUID with date suffix, extract the complete UUID (first 5 segments)
    if (segments.length > 5) {
      originalId = segments.slice(0, 5).join('-'); // Join first 5 segments to form complete UUID
    }
  }
  
  return statuses[originalId] || null;
};

const isEventRSVPed = (eventId: string, rsvpedEventIds: string[]): boolean => {
  // Extract the original event ID (removing the date-specific suffix)
  let originalId = eventId;
  if (eventId.includes('-')) {
    const segments = eventId.split('-');
    // If this looks like a UUID with date suffix, extract the complete UUID
    if (segments.length > 5) {
      originalId = segments.slice(0, 5).join('-');
    }
  }
  return rsvpedEventIds.includes(originalId);
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { currentEvent } = useMeditation();
  const { colors } = useTheme();
  const { refresh } = useLocalSearchParams();
  const router = useRouter();

  const [globalEvents, setGlobalEvents] = useState<MeditationEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<MeditationCompletion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [rsvpedEvents, setRsvpedEvents] = useState<string[]>([]);
  const [attendanceStatuses, setAttendanceStatuses] = useState<Record<string, string>>({});

  const fetchMeditationData = async () => {
    try {
      console.log("FETCHING MEDITATION DATA", new Date().toISOString());
      setLoading(true);
      
      // Get current date info for filtering events
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      
      // =======================================================
      // FETCH ALL GLOBAL EVENTS (both system and user-created)
      // =======================================================
      console.log(`Fetching global events between ${todayStart.toISOString()} and ${tomorrowStart.toISOString()}`);
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('meditation_events')
        .select(`
          *,
          meditation_participants (
            id,
            active
          )
        `)
        .eq('is_global', true)  // Filter only for is_global=true, but no other restrictions
        .gte('start_time', todayStart.toISOString())
        .lt('start_time', tomorrowStart.toISOString())
        .order('start_time', { ascending: true });

      if (eventsError) {
        console.error('Error fetching global events:', eventsError);
      } else {
        // Map the events with participant count but don't filter out ended events
        const allEvents = (eventsData || []).map((event: MeditationEvent) => ({
          ...event,
          participant_count: event.meditation_participants?.filter(p => p.active)?.length || 0,
        }));
        
        console.log(`Found ${allEvents.length} global events for today`);
        console.log('Event IDs:', allEvents.map(e => e.id));
        
        // Remove potential duplicates by ID
        const uniqueEvents = allEvents.filter((event, index, self) =>
          index === self.findIndex((e) => e.id === event.id)
        );
        
        console.log(`After removing duplicates: ${uniqueEvents.length} events`);
        
        setGlobalEvents(uniqueEvents);
      }
    } catch (error) {
      console.error('Error in fetchMeditationData:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeditationData();
    
    if (isUserProfile(user)) {
      fetchRSVPs();
      fetchAttendanceStatuses();
    }
    
    // Prevent component from refreshing multiple times unnecessarily
    return () => {
      console.log('Cleaning up home screen data fetching');
    };
  }, [isUserProfile(user) ? user.id : null, refresh, forceRefresh]); // Safely access user.id

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setForceRefresh(prev => prev + 1);
    // fetchMeditationData will be called by the useEffect above
  }, []);

  const renderQuickStartSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Start</Text>
      <View style={styles.quickStartContainer}>
        <Link href="/meditation/sync?id=quick&duration=5" asChild>
          <TouchableOpacity style={styles.quickStartItem} activeOpacity={0.7}>
            <View style={styles.quickStartIconContainer}>
              <Ionicons name="flash" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickStartText}>5 min</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/meditation/sync?id=quick&duration=10" asChild>
          <TouchableOpacity style={styles.quickStartItem} activeOpacity={0.7}>
            <View style={styles.quickStartIconContainer}>
              <Ionicons name="leaf" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickStartText}>10 min</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/meditation/sync?id=quick&duration=20" asChild>
          <TouchableOpacity style={styles.quickStartItem} activeOpacity={0.7}>
            <View style={styles.quickStartIconContainer}>
              <Ionicons name="moon" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.quickStartText}>20 min</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );

  const renderGlobalMeditationsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Upcoming Global Meditations</Text>
      {globalEvents.length > 0 ? (
        globalEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            attendanceStatus={getEventAttendanceStatus(event.id, attendanceStatuses)}
            isRSVPed={isEventRSVPed(event.id, rsvpedEvents)}
            onRSVP={handleRSVP}
            onSetAttendance={handleSetAttendance}
          />
        ))
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="globe" size={40} color={COLORS.lightGray} />
          <Text style={styles.emptyStateText}>No Global Meditations Today</Text>
          <Text style={styles.emptyStateSubtext}>Check back later for new sessions</Text>
          <Link href="/events/create" asChild>
            <Button style={styles.createButton} size="small" onPress={() => {}}>
              Create Event
            </Button>
          </Link>
        </View>
      )}
    </View>
  );

  const renderWelcomeSection = () => (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.welcomeText, { color: colors.primary }]}>
          {isUserProfile(user) && user.display_name 
            ? `Welcome, ${user.display_name}` 
            : 'Welcome to SoulSync'}
        </Text>
        <TouchableOpacity onPress={onRefresh} style={{ padding: 8 }}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.subtitleText, { color: colors.gray }]}>
        Find peace in synchronized meditation
      </Text>
    </View>
  );

  // Fetch RSVPs for the current user
  const fetchRSVPs = async () => {
    if (!user || !isUserProfile(user)) return;
    
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('event_id, notification_id')
        .eq('user_id', user.id);
      
      if (error) {
        console.log('RSVP table may not exist yet:', error.message);
        return;
      }
      
      if (data) {
        setRsvpedEvents(data.map(rsvp => rsvp.event_id));
      }
    } catch (error) {
      console.error('Error fetching RSVPs:', error);
    }
  };

  // Fetch attendance statuses for the current user
  const fetchAttendanceStatuses = async () => {
    if (!user || !isUserProfile(user)) return;
    
    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('event_id, attendance_status')
        .eq('user_id', user.id)
        .not('attendance_status', 'is', null);
        
      if (error) {
        console.log('Error fetching attendance statuses:', error.message);
        return;
      }
      
      if (data) {
        const statuses = data.reduce((acc, item) => {
          if (item.attendance_status) {
            acc[item.event_id] = item.attendance_status;
          }
          return acc;
        }, {} as Record<string, string>);
        
        setAttendanceStatuses(statuses);
      }
    } catch (error) {
      console.error('Error in fetchAttendanceStatuses:', error);
    }
  };

  // Handle RSVP for an event
  const handleRSVP = async (event: MeditationEvent) => {
    if (!isUserProfile(user)) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to set reminders for meditation events.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/sign-in') }
        ]
      );
      return;
    }
    
    try {
      // Extract the original event ID (removing the date-specific suffix)
      let originalId = event.id;
      if (event.id.includes('-')) {
        const segments = event.id.split('-');
        // If this looks like a UUID with date suffix, extract the complete UUID
        if (segments.length > 5) {
          originalId = segments.slice(0, 5).join('-');
        }
      }
      
      console.log(`Processing event with ID: ${event.id}`);
      console.log(`Using event ID for RSVP: ${originalId}`);
      
      // Check if already RSVPed
      const isAlreadyRSVPed = isEventRSVPed(event.id, rsvpedEvents);
      
      if (isAlreadyRSVPed) {
        try {
          // Find and cancel any existing notification
          const { data: rsvpData, error: fetchError } = await supabase
            .from('event_rsvps')
            .select('notification_id')
            .eq('event_id', originalId)
            .eq('user_id', user.id)
            .single();
            
          if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error fetching RSVP data:', fetchError);
            Alert.alert('Error', 'Could not retrieve reminder information.');
            return;
          }
            
          // Cancel the notification if it exists
          if (rsvpData?.notification_id) {
            try {
              await cancelNotification(rsvpData.notification_id);
              console.log(`Cancelled notification ${rsvpData.notification_id}`);
            } catch (notifError) {
              console.error('Error canceling notification:', notifError);
              // Continue anyway - we still want to remove the RSVP
            }
          }
            
          // Remove RSVP
          const { error } = await supabase
            .from('event_rsvps')
            .delete()
            .eq('user_id', user.id)
            .eq('event_id', originalId);
            
          if (error) {
            console.error('Error removing RSVP:', error);
            Alert.alert('Error', 'Failed to remove reminder. Please try again.');
            return;
          }
            
          // Update local state
          setRsvpedEvents(prev => prev.filter(id => id !== originalId));
          Alert.alert('Reminder Removed', 'You will no longer receive a reminder for this event.');
        } catch (error) {
          console.error('Error handling RSVP removal:', error);
          Alert.alert('Error', 'An error occurred while removing your reminder.');
        }
      } else {
        // Add RSVP
        try {
          // Schedule a notification
          let notificationId = null;
          try {
            notificationId = await scheduleEventReminder(originalId, event.title, event.start_time);
            console.log(`Scheduled notification with ID: ${notificationId}`);
          } catch (notifError) {
            console.error('Error scheduling notification:', notifError);
            // Continue anyway - we still want to add the RSVP even if notification fails
          }
          
          // Create the RSVP record with the notification ID
          const rsvpData = {
            user_id: user.id,
            event_id: originalId,
            reminder_sent: false,
            created_at: new Date().toISOString(),
            notification_id: notificationId
          };
          
          const { error } = await supabase
            .from('event_rsvps')
            .upsert(rsvpData, { onConflict: 'user_id,event_id' });
          
          if (error) {
            console.error('Error adding RSVP:', error);
            
            // Try to cancel the notification if it was created but RSVP failed
            if (notificationId) {
              try {
                await cancelNotification(notificationId);
              } catch (cancelError) {
                console.error('Error canceling notification after RSVP failure:', cancelError);
              }
            }
            
            Alert.alert('Error', 'Failed to set reminder. Please try again.');
            return;
          }
          
          // Update local state
          setRsvpedEvents(prev => [...prev, originalId]);
          Alert.alert(
            'Reminder Set',
            'You will receive a notification before this meditation session begins.',
            [
              { text: 'OK' },
              { 
                text: 'Notification Settings', 
                onPress: () => router.push('/settings/notifications') 
              }
            ]
          );
        } catch (error) {
          console.error('Error in RSVP creation:', error);
          Alert.alert('Error', 'Failed to set reminder. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error in handleRSVP:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  // Handle setting attendance status
  const handleSetAttendance = async (
    event: MeditationEvent,
    status: 'attending' | 'interested' | null
  ) => {
    if (!isUserProfile(user)) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to mark your attendance for meditation events.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/sign-in') }
        ]
      );
      return;
    }

    try {
      // Extract the original event ID (removing any instance-specific suffix)
      let originalId = event.id;
      if (event.id.includes('-')) {
        const segments = event.id.split('-');
        if (segments.length > 5) {
          // Join the first 5 segments to form a complete UUID
          originalId = segments.slice(0, 5).join('-');
        }
      }
      
      console.log(`Setting attendance status for event: ${originalId} to ${status || 'null'}`);
      
      // Check if an RSVP record already exists for this event and user
      const { data: existingRSVP, error: fetchError } = await supabase
        .from('event_rsvps')
        .select('id, notification_id')
        .eq('event_id', originalId)
        .eq('user_id', user.id)
        .maybeSingle();
        
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking for existing RSVP:', fetchError);
        Alert.alert('Error', 'Could not update attendance status. Please try again.');
        return;
      }
      
      let notificationId = existingRSVP?.notification_id || null;
      
      // When setting status to 'attending', schedule a reminder if it doesn't exist
      if (status === 'attending' && !notificationId) {
        try {
          // For recurring events, ensure we use the next occurrence time
          const now = new Date();
          const eventTime = new Date(event.start_time);
          
          // Only schedule notification if the event is in the future
          if (eventTime > now) {
            notificationId = await scheduleEventReminder(originalId, event.title, event.start_time);
            console.log(`Scheduled attending notification with ID: ${notificationId}`);
          }
        } catch (notifError) {
          console.error('Error scheduling notification:', notifError);
          // Continue anyway - we still want to set attendance status even if notification fails
        }
      } 
      // If removing attendance and a notification exists, cancel it
      else if (status !== 'attending' && existingRSVP && existingRSVP.notification_id) {
        try {
          await cancelNotification(existingRSVP.notification_id);
          console.log(`Cancelled notification ${existingRSVP.notification_id}`);
          notificationId = null;
        } catch (cancelError) {
          console.error('Error canceling notification:', cancelError);
          // Continue anyway - we still want to update attendance status
        }
      }
      
      // Update or create the RSVP record with the new attendance status
      if (existingRSVP) {
        const { error: updateError } = await supabase
          .from('event_rsvps')
          .update({ 
            attendance_status: status, 
            notification_id: notificationId 
          })
          .eq('id', existingRSVP.id);
          
        if (updateError) {
          console.error('Error updating attendance status:', updateError);
          Alert.alert('Error', 'Failed to update attendance status. Please try again.');
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from('event_rsvps')
          .insert({
            user_id: user.id,
            event_id: originalId,
            attendance_status: status,
            created_at: new Date().toISOString(),
            notification_id: notificationId
          });
          
        if (insertError) {
          console.error('Error setting attendance status:', insertError);
          Alert.alert('Error', 'Failed to set attendance status. Please try again.');
          return;
        }
      }
      
      // Update local state
      if (status) {
        setAttendanceStatuses(prev => ({ ...prev, [originalId]: status }));
      } else {
        setAttendanceStatuses(prev => {
          const newStatuses = { ...prev };
          delete newStatuses[originalId];
          return newStatuses;
        });
      }
      
      // Refresh event list to update participant counts
      fetchMeditationData();
      
      Alert.alert('Status Updated', 
        status === 'attending' 
          ? 'You are now attending this event.' 
          : status === 'interested' 
            ? 'You are now interested in this event.' 
            : 'Attendance status removed.');
          
    } catch (error) {
      console.error('Error in handleSetAttendance:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading meditations...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {renderWelcomeSection()}
      {renderQuickStartSection()}
      {renderGlobalMeditationsSection()}
      
      <View style={styles.quotesContainer}>
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "Quiet the mind, and the soul will speak."
          </Text>
          <Text style={styles.quoteAuthor}>— Ma Jaya Sati Bhagavati</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  header: {
    padding: 20,
    paddingTop: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitleText: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 15,
  },
  quickStartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStartItem: {
    backgroundColor: COLORS.pastel2,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '30%',
    shadowColor: COLORS.darkGray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickStartIconContainer: {
    backgroundColor: COLORS.pastel3,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStartText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  meditationCard: {
    backgroundColor: COLORS.pastel2,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: COLORS.darkGray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 15,
  },
  traditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    padding: 12,
  },
  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  cardDetailText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 4,
  },
  joinNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: COLORS.pastel3,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  joinNowText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pastel2,
    borderRadius: 12,
    padding: 30,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  signInButton: {
    marginTop: 15,
  },
  quotesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quoteCard: {
    backgroundColor: COLORS.pastel3,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.accent,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'right',
  },
  liveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.pastel2,
    marginRight: 6,
  },
  liveText: {
    color: COLORS.pastel2,
  },
  createButton: {
    marginTop: 15,
  },
  completedMeditationCard: {
    backgroundColor: COLORS.pastel2,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: COLORS.darkGray,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: COLORS.pastel3,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.secondary,
    marginRight: 4,
  },
  disabledCard: {
    opacity: 0.8,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
  },
  disabledText: {
    color: COLORS.gray,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  actionButton: {
    padding: 8,
    borderRadius: 15,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
    width: 36,
    height: 36,
  },
  timeUntilContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  timeUntilText: {
    marginLeft: 4,
  },
  activeButton: {
    backgroundColor: COLORS.secondary,
  },
  attendingButton: {
    backgroundColor: COLORS.primary,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pastel3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    marginLeft: 8,
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
});
