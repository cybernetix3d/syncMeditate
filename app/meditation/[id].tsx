import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getMeditationEventById } from '@/src/api/supabase';
import { COLORS, LIGHT_COLORS, DARK_COLORS } from '@/src/constants/Styles';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import { useTheme } from '@/src/context/ThemeContext';
import Button from '@/src/components/common/Button';
import { useAuth } from '@/src/context/AuthProvider';
import { scheduleEventReminder } from '@/src/services/NotificationService';
import { useFocusEffect } from '@react-navigation/native';

// Back button component
const BackButton = () => {
  const router = useRouter();
  return (
    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
    </TouchableOpacity>
  );
};

// HostInfo component
const HostInfo = ({ userId, isDark }) => {
  const [hostInfo, setHostInfo] = useState(null);
  useEffect(() => {
    const fetchHostInfo = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('id', userId)
          .single();
        if (!error && data) {
          setHostInfo(data);
        }
      } catch (err) {
        console.error('Error fetching host info:', err);
      }
    };
    fetchHostInfo();
  }, [userId]);
  if (!hostInfo) return null;
  return (
    <View style={styles.infoRow}>
      <Ionicons name="person-outline" size={20} color={isDark ? DARK_COLORS.gray : LIGHT_COLORS.gray} />
      <Text style={[styles.infoText, isDark && styles.darkText]}>
        Hosted by {hostInfo.display_name || 'Anonymous'}
      </Text>
    </View>
  );
};

// Helper: Extract the base UUID from a composite event ID.
// A standard UUID has 5 segments (separated by dashes). If there are more than 5 segments,
// we assume the first 5 form the original UUID.
const extractOriginalId = (compositeId: string): string => {
  const segments = compositeId.split('-');
  return segments.length > 5 ? segments.slice(0, 5).join('-') : compositeId;
};

// Helper: Extract occurrence time from composite ID if available.
const extractOccurrenceTime = (compositeId: string): string | null => {
  const segments = compositeId.split('-');
  return segments.length > 5 ? segments.slice(5).join('-') : null;
};

// Helper: Given an occurrence time, recurrence type, and current time, compute next occurrence if needed.
const getNextOccurrence = (occurrenceTimeStr: string, recurrenceType: string): string => {
  let occurrence = new Date(occurrenceTimeStr);
  const now = new Date();
  if (occurrence > now) {
    return occurrence.toISOString();
  }
  // Compute next occurrence based on recurrence type
  if (recurrenceType === 'daily') {
    while (occurrence <= now) {
      occurrence.setDate(occurrence.getDate() + 1);
    }
  } else if (recurrenceType === 'weekly') {
    while (occurrence <= now) {
      occurrence.setDate(occurrence.getDate() + 7);
    }
  } else if (recurrenceType === 'monthly') {
    while (occurrence <= now) {
      occurrence.setMonth(occurrence.getMonth() + 1);
    }
  }
  return occurrence.toISOString();
};

export default function MeditationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [rsvpLoading, setRSVPLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  
  const fetchEventDetails = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      
      // Extract the base UUID from the composite id
      const originalId = extractOriginalId(id);
      // Also extract the occurrence part, if any.
      let occurrencePart = extractOccurrenceTime(id);
      
      // Fetch event template using originalId
      const { data: eventData, error: eventError } = await getMeditationEventById(originalId);
      if (eventError) {
        console.error('Error fetching event details:', eventError);
        setError('Failed to load meditation details. Please try again later.');
        return;
      }
      if (!eventData) {
        setError('Meditation event not found.');
        return;
      }
      
      // If an occurrence time was provided, adjust the event start_time.
      if (occurrencePart) {
        // If the occurrence is in the past, compute the next upcoming occurrence.
        let occurrenceDate = new Date(occurrencePart);
        if (occurrenceDate <= new Date() && eventData.recurrence_type) {
          occurrencePart = getNextOccurrence(occurrencePart, eventData.recurrence_type);
        }
        eventData.start_time = occurrencePart;
      }
      
      setEvent(eventData);
      
      // Get participant count
      if (eventData.id) {
        try {
          const { data: participantsData, error: participantsError } = await supabase
            .rpc('get_participant_count', { event_id: eventData.id });
          if (!participantsError && participantsData !== null) {
            setParticipantCount(participantsData);
          }
        } catch (err) {
          console.error('Error getting participant count:', err);
        }
      }
      
      // Check if the user has RSVPed
      if (user && user !== true && eventData.id) {
        try {
          const { data: rsvpData, error: rsvpError } = await supabase
            .from('event_rsvps')
            .select('id')
            .eq('event_id', eventData.id)
            .eq('user_id', user.id)
            .maybeSingle();
          setIsRSVPed(!!rsvpData);
        } catch (err) {
          console.error('Error checking RSVP:', err);
        }
      }
    } catch (err) {
      console.error('Error in fetchEventDetails:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);
  
  useFocusEffect(
    useCallback(() => {
      fetchEventDetails();
    }, [fetchEventDetails])
  );
  
  const handleRefresh = () => {
    fetchEventDetails();
  };
  
  const handleJoin = async () => {
    if (!event) return;
    setJoinLoading(true);
    try {
      const originalId = extractOriginalId(event.id);
      router.push(`/meditation/sync?id=${originalId}&duration=${event.duration}`);
    } catch (error) {
      console.error('Error navigating to sync screen:', error);
      Alert.alert('Error', 'Failed to join meditation. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };
  
  const handleToggleRSVP = async () => {
    if (!event) return;
    if (!user || user === true) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to set a reminder for this meditation event.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/sign-in') }
        ]
      );
      return;
    }
    
    setRSVPLoading(true);
    try {
      const originalId = extractOriginalId(event.id);
      
      if (isRSVPed) {
        // Remove RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', originalId)
          .eq('user_id', user.id);
        if (error) {
          console.error('Error removing RSVP:', error);
          Alert.alert('Error', 'Failed to remove reminder. Please try again.');
          return;
        }
        setIsRSVPed(false);
        Alert.alert('Reminder Removed', 'You will no longer receive a notification for this event.');
      } else {
        // Add RSVP and schedule notification using user settings
        try {
          const notificationId = await scheduleEventReminder(
            originalId,
            event.title,
            event.start_time
          );
          const { error } = await supabase
            .from('event_rsvps')
            .insert({
              event_id: originalId,
              user_id: user.id,
              notification_id: notificationId,
              created_at: new Date().toISOString()
            });
          if (error) {
            console.error('Error adding RSVP:', error);
            Alert.alert('Error', 'Failed to set reminder. Please try again.');
            return;
          }
          setIsRSVPed(true);
          Alert.alert(
            'Reminder Set',
            'You will receive a notification before this meditation session begins.',
            [
              { text: 'OK' },
              { text: 'Notification Settings', onPress: () => router.push('/settings/notifications') }
            ]
          );
        } catch (error) {
          console.error('Error scheduling reminder:', error);
          Alert.alert('Error', 'Failed to set reminder. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error toggling RSVP:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setRSVPLoading(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const getRecurrenceText = (event: any) => {
    if (!event.is_recurring) return 'One-time event';
    const recurrenceMap = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
    return `${recurrenceMap[event.recurrence_type] || 'Recurring'} event`;
  };
  
  const isHappeningNow = (event: any): boolean => {
    if (!event) return false;
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(startTime.getTime() + event.duration * 60000);
    return now >= startTime && now <= endTime;
  };
  
  const getEventTiming = (event: any): { text: string; isLive: boolean } => {
    if (!event) return { text: '', isLive: false };
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(startTime.getTime() + event.duration * 60000);
    if (now < startTime) {
      const diffMs = startTime.getTime() - now.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      if (diffDays > 0) {
        return { text: `Starts in ${diffDays}d ${diffHrs}h`, isLive: false };
      } else if (diffHrs > 0) {
        return { text: `Starts in ${diffHrs}h ${diffMins}m`, isLive: false };
      } else {
        return { text: `Starts in ${diffMins}m`, isLive: false };
      }
    } else if (now <= endTime) {
      return { text: 'Happening Now', isLive: true };
    } else {
      return { text: 'Ended', isLive: false };
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            title: 'Meditation Details',
            headerLeft: () => <BackButton />,
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, isDark && styles.darkText]}>
            Loading meditation details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (error) {
    return (
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
        <Stack.Screen
          options={{
            title: 'Meditation Details',
            headerLeft: () => <BackButton />,
            headerShown: true,
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="red" />
          <Text style={[styles.errorText, isDark && styles.darkText]}>{error}</Text>
          <Button variant="primary" onPress={handleRefresh} style={styles.refreshButton}>
            Try Again
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!event) return null;
  
  const tradition = FAITH_TRADITIONS.find(t => t.id === event.tradition) || FAITH_TRADITIONS[0];
  const timing = getEventTiming(event);
  
  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]}>
      <Stack.Screen
        options={{
          title: 'Meditation Details',
          headerLeft: () => <BackButton />,
          headerShown: true,
        }}
      />
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <View style={[styles.traditionBadge, { backgroundColor: tradition.color }]}>
            <Ionicons name={(tradition as any).ionicon} size={24} color="#fff" />
          </View>
          <Text style={[styles.title, isDark && styles.darkText]}>{event.title}</Text>
          <View style={styles.timingRow}>
            {timing.isLive ? (
              <View style={styles.liveContainer}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{timing.text}</Text>
              </View>
            ) : (
              <Text style={[styles.timing, isDark && styles.darkTiming]}>{timing.text}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={isDark ? DARK_COLORS.gray : LIGHT_COLORS.gray} />
            <Text style={[styles.infoText, isDark && styles.darkText]}>
              {formatDate(event.start_time)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={isDark ? DARK_COLORS.gray : LIGHT_COLORS.gray} />
            <Text style={[styles.infoText, isDark && styles.darkText]}>
              {event.duration} minutes
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="repeat-outline" size={20} color={isDark ? DARK_COLORS.gray : LIGHT_COLORS.gray} />
            <Text style={[styles.infoText, isDark && styles.darkText]}>
              {getRecurrenceText(event)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={isDark ? DARK_COLORS.gray : LIGHT_COLORS.gray} />
            <Text style={[styles.infoText, isDark && styles.darkText]}>
              {participantCount || 0} {participantCount === 1 ? 'person' : 'people'} participating
            </Text>
          </View>
          
          {event.created_by && (
            <HostInfo userId={event.created_by} isDark={isDark} />
          )}
        </View>
        
        {event.description ? (
          <View style={styles.descriptionSection}>
            <Text style={[styles.sectionTitle, isDark && styles.darkText]}>About this meditation</Text>
            <Text style={[styles.description, isDark && styles.darkText]}>
              {event.description}
            </Text>
          </View>
        ) : null}
        
        <View style={styles.actionSection}>
          {isHappeningNow(event) ? (
            <Button variant="primary" onPress={handleJoin} loading={joinLoading} style={styles.actionButton}>
              Join Meditation Now
            </Button>
          ) : (
            <Button
              variant={isRSVPed ? "secondary" : "primary"}
              onPress={handleToggleRSVP}
              loading={rsvpLoading}
              style={styles.actionButton}
            >
              {isRSVPed ? 'Cancel Reminder' : 'Set Reminder'}
            </Button>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  darkContainer: {
    backgroundColor: DARK_COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: 10,
  },
  traditionBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: LIGHT_COLORS.headerText,
  },
  darkText: {
    color: DARK_COLORS.headerText,
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  timing: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
  darkTiming: {
    color: DARK_COLORS.accent,
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F95738',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
    marginRight: 5,
  },
  liveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 10,
    color: LIGHT_COLORS.bodyText,
    flex: 1,
  },
  descriptionSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: LIGHT_COLORS.headerText,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: LIGHT_COLORS.bodyText,
  },
  actionSection: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButton: {
    marginBottom: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 15,
    color: LIGHT_COLORS.bodyText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 20,
    color: LIGHT_COLORS.bodyText,
  },
  refreshButton: {
    minWidth: 120,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 5,
  },
});
