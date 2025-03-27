import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { Stack, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase, getMeditationEventById } from '@/src/api/supabase';
import { COLORS, LIGHT_COLORS, DARK_COLORS } from '@/src/constants/Styles';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import { useTheme } from '@/src/context/ThemeContext';
import Button from '@/src/components/common/Button'; // Ensure ButtonProps in this file has iconLeft/iconRight
import { useAuth } from '@/src/context/AuthProvider';
import { scheduleEventReminder } from '@/src/services/NotificationService';
import { useFocusEffect } from '@react-navigation/native';
import RequestForm from '@/src/components/meditation/RequestForm';
import RequestList from '@/src/components/meditation/RequestList';

// --- BackButton and HostInfo components ---
const BackButton = () => {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.primary} />
    </TouchableOpacity>
  );
};

const HostInfo = ({ userId, isDark }) => {
  const [hostInfo, setHostInfo] = useState<any>(null); // Added type annotation
  const { colors } = useTheme();

  useEffect(() => {
    const fetchHostInfo = async () => {
      if (!userId) return;
      try {
        console.log(`Fetching host info for user ID: ${userId}`);
        const { data, error } = await supabase
          .from('users') // Use 'users' table
          .select('display_name, avatar_url')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching host info from Supabase:', error);
          if (error.message.includes('security policy')) {
             console.error("RLS policy might be blocking access to the 'users' table.");
          }
        } else if (data) {
          console.log("Host info fetched successfully:", data);
          setHostInfo(data);
        } else {
          console.log("No host info found for user ID:", userId);
          setHostInfo(null);
        }
      } catch (err) {
        console.error('Catch Error fetching host info:', err);
      }
    };
    fetchHostInfo();
  }, [userId]);

  if (!hostInfo) return null;

  return (
    <View style={styles.infoRow}>
      {hostInfo.avatar_url ? (
        <Image source={{ uri: hostInfo.avatar_url }} style={styles.hostAvatar} />
      ) : (
        <Ionicons name="person-circle-outline" size={22} color={colors.gray} style={{marginRight: 10}} />
      )}
      <Text style={[styles.infoText, { color: colors.bodyText }]}>
        Hosted by {hostInfo.display_name || 'Anonymous'}
      </Text>
    </View>
  );
};
// ---

// --- Helper functions ---
const extractOriginalId = (compositeId: string): string => {
  if (!compositeId || typeof compositeId !== 'string') return '';
  const segments = compositeId.split('-');
  if (segments.length >= 5 && segments[0].length === 8) {
     return segments.slice(0, 5).join('-');
  }
  return compositeId;
};

// *** FIX 1: Define calculateNextOccurrence function HERE ***
// Helper function to calculate the next occurrence for DAILY events
// NOTE: This is a basic implementation for DAILY only. Weekly/Monthly require more complex date logic.
const calculateNextOccurrence = (eventStartTimeStr: string, now: Date): Date => {
    const originalStartDate = new Date(eventStartTimeStr);
    // Check if original date is valid
    if (isNaN(originalStartDate.getTime())) {
        console.error("Invalid original start date string:", eventStartTimeStr);
        // Return a date far in the past to indicate an error or handle differently
        return new Date(0);
    }
    const hours = originalStartDate.getHours();
    const minutes = originalStartDate.getMinutes();
    const seconds = originalStartDate.getSeconds();

    // Create a potential start time for today
    const todayOccurrence = new Date(now); // Start with today's date
    todayOccurrence.setHours(hours, minutes, seconds, 0); // Set the time from the original event

    // If today's occurrence time has already passed, calculate for tomorrow
    if (now.getTime() > todayOccurrence.getTime()) {
        const tomorrowOccurrence = new Date(todayOccurrence);
        tomorrowOccurrence.setDate(tomorrowOccurrence.getDate() + 1);
        return tomorrowOccurrence;
    }

    // Otherwise, the next occurrence is today
    return todayOccurrence;
};
// *** END FIX 1 ***


export default function MeditationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();
  const { user } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [rsvpLoading, setRSVPLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  // Keep state for modal visibility
  const [isRequestFormVisible, setIsRequestFormVisible] = useState(false);
  const [refreshRequestsKey, setRefreshRequestsKey] = useState(0);

  const fetchEventDetails = useCallback(async () => {
     if (!id) {
      setError("Event ID is missing.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const originalId = extractOriginalId(id);
      if (!originalId) {
         setError("Invalid Event ID format.");
         setLoading(false);
         return;
      }

      console.log(`Fetching details for event ID: ${originalId}`);

      const [eventResult, participantsResult, rsvpResult] = await Promise.all([
        getMeditationEventById(originalId),
        supabase.rpc('get_participant_count', { p_event_id: originalId })
          .then(res => { console.log("Participant Count Result:", res); return res; }), // Log result
        (user && user !== true) ? supabase
            .from('event_rsvps')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', originalId)
            .eq('user_id', user.id)
            .maybeSingle()
            .then(res => { // Log RSVP result
                console.log('RSVP Check Result:', JSON.stringify(res));
                if (res.error && !res.error.message) {
                    console.error('RSVP check failed with empty error message. Check RLS policies on event_rsvps table.');
                }
                return res;
            })
         : Promise.resolve({ count: 0, error: null })
      ]);

      // Handle Event Fetching
      if (eventResult.error) {
        console.error('Error fetching event details:', eventResult.error);
        setError('Failed to load meditation details.');
        setEvent(null);
      } else if (!eventResult.data) {
        setError('Meditation event not found.');
        setEvent(null);
      } else {
        console.log("Event data fetched:", eventResult.data);
        setEvent(eventResult.data);
      }

      // Handle Participant Count
      if (participantsResult.error) {
         console.error('Error getting participant count:', participantsResult.error);
         setParticipantCount(0);
      } else {
         console.log("Participant count:", participantsResult.data);
         setParticipantCount(participantsResult.data ?? 0);
      }

      // Handle RSVP Check
      if (rsvpResult?.error) {
         console.error('Error checking RSVP:', rsvpResult.error);
         setIsRSVPed(false);
      } else {
         const rsvpExists = !!rsvpResult?.count && rsvpResult.count > 0;
         console.log("RSVP exists:", rsvpExists);
         setIsRSVPed(rsvpExists);
      }

    } catch (err) {
      console.error('Error in fetchEventDetails (catch block):', err);
      setError('An unexpected error occurred. Please try again.');
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id, user]); // user dependency is important for RSVP check

  useFocusEffect(
    useCallback(() => {
      fetchEventDetails();
    }, [fetchEventDetails])
  );

  const handleRefresh = () => {
    fetchEventDetails();
    setRefreshRequestsKey(prev => prev + 1);
  };

  const handleFormSubmit = () => {
    console.log("RequestForm onSubmit triggered");
    setIsRequestFormVisible(false);
    setRefreshRequestsKey(prev => prev + 1); // Trigger RequestList refresh
    // Alert.alert("Success", "Your request has been submitted.");
  };

  const handleFormCancel = () => {
    console.log("RequestForm onCancel triggered");
    setIsRequestFormVisible(false);
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
      setJoinLoading(false);
    }
    // Note: setJoinLoading(false) ideally in finally or navigation event
  };

  const handleToggleRSVP = async () => {
     if (!event) return;
    if (!user || user === true) {
      Alert.alert('Sign In Required','Please sign in to set a reminder...',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign In', onPress: () => router.push('/auth/sign-in') }]
      );
      return;
    }

    setRSVPLoading(true);
    try {
        const originalId = extractOriginalId(event.id);

        if (isRSVPed) {
            // Delete RSVP
            const { error } = await supabase.from('event_rsvps').delete().eq('event_id', originalId).eq('user_id', user.id);
            if (error) throw error;
            setIsRSVPed(false);
            // --- Decrement local count ---
            setParticipantCount(prev => Math.max(0, prev - 1)); // Ensure count doesn't go below 0
            // ------------------------------
            Alert.alert('Reminder Removed', 'You will no longer receive a notification.');
            // TODO: Cancel notification
        } else {
            // Calculate next occurrence for scheduling (as added before)
            let scheduleTimeStr: string;
            const now = new Date();
            if (event.is_recurring && event.recurrence_type === 'daily') {
                const nextOccurrenceDate = calculateNextOccurrence(event.start_time, now);
                if (nextOccurrenceDate <= now) {
                    console.warn("Calculated next occurrence is not in the future, attempting tomorrow.");
                    nextOccurrenceDate.setDate(nextOccurrenceDate.getDate() + 1);
                }
                scheduleTimeStr = nextOccurrenceDate.toISOString();
            } else {
                const originalStartTime = new Date(event.start_time);
                if (originalStartTime <= now && !event.is_recurring) { // Only error if non-recurring and past
                     throw new Error("Cannot set a reminder for a past event.");
                }
                 // For recurring (non-daily) or future non-recurring, use original time for now
                scheduleTimeStr = event.start_time;
            }

            const notificationId = await scheduleEventReminder(originalId, event.title, scheduleTimeStr);
            if (!notificationId) { throw new Error("Failed to schedule reminder."); }

            // Insert RSVP
            const { error } = await supabase.from('event_rsvps').insert({ event_id: originalId, user_id: user.id, notification_id: notificationId });
            if (error) throw error;

            setIsRSVPed(true);
            // --- Increment local count ---
            setParticipantCount(prev => prev + 1);
            // ------------------------------
            Alert.alert('Reminder Set', 'You will receive a notification before this session.',
                [{ text: 'OK' }, { text: 'Notification Settings', onPress: () => router.push('/settings/notifications') }]
            );
        }
    } catch (error: any) {
        console.error('Error toggling RSVP:', error);
        Alert.alert('Error', `Failed to ${isRSVPed ? 'remove' : 'set'} reminder: ${error.message || 'Please try again.'}`);
        // Note: If the DB operation failed, the local count update might be wrong.
        // Consider reverting the local count change in the catch block if needed, though
        // a full refresh on error might be simpler.
    } finally {
        setRSVPLoading(false);
    }
};

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Loading...', headerLeft: () => <BackButton />, headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.bodyText }]}>Loading Meditation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Error State ---
  if (error || !event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Error', headerLeft: () => <BackButton />, headerShown: true }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={colors.secondary} />
          <Text style={[styles.errorText, { color: colors.bodyText }]}>
            {error || 'Could not load event details.'}
          </Text>
           <Button onPress={handleRefresh} variant="outline">
             Try Again
           </Button>
        </View>
      </SafeAreaView>
    );
  }

  // --- Helper functions for rendering ---
  const formatDate = (dateString: string | null): string => {
      if (!dateString) return 'Date not available';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      } catch (e) { console.error("Error formatting date:", e); return 'Error formatting date'; }
  };

  const getRecurrenceText = (evt: any): string => {
      if (!evt?.is_recurring) return 'One-time event';
      const recurrenceMap: { [key: string]: string } = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
      return `${recurrenceMap[evt.recurrence_type] || 'Recurring'} event`;
  };

  // Define getEventTiming function using calculateNextOccurrence
  const getEventTiming = (evt: any): { text: string; isLive: boolean; canJoin: boolean } => {
    const now = new Date();
    if (!evt?.start_time || !evt?.duration) return { text: 'Timing unavailable', isLive: false, canJoin: false };

    try {
      let effectiveStartTime: Date;
      const originalStartTime = new Date(evt.start_time);
      if (isNaN(originalStartTime.getTime())) throw new Error("Invalid original start time");

      if (evt.is_recurring && evt.recurrence_type === 'daily') {
        effectiveStartTime = calculateNextOccurrence(evt.start_time, now);
      } else if (evt.is_recurring) {
        console.warn(`Recurrence type '${evt.recurrence_type}' calculation not fully implemented.`);
        effectiveStartTime = originalStartTime; // Fallback for now
      } else {
        effectiveStartTime = originalStartTime;
      }

      if (isNaN(effectiveStartTime.getTime())) throw new Error("Invalid effective start time");

      const durationMinutes = Number(evt.duration);
      if (isNaN(durationMinutes)) return { text: 'Invalid duration', isLive: false, canJoin: false };

      const effectiveEndTime = new Date(effectiveStartTime.getTime() + durationMinutes * 60000);
      const joinStartTime = new Date(effectiveStartTime.getTime() - 5 * 60000); // 5 min grace

      const canJoin = now >= joinStartTime && now <= effectiveEndTime;

      if (now < effectiveStartTime) {
        const diffMs = effectiveStartTime.getTime() - now.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let startsInText = 'Starts ';
        if (diffDays > 0) startsInText += `in ${diffDays}d ${diffHrs}h`;
        else if (diffHrs > 0) startsInText += `in ${diffHrs}h ${diffMins}m`;
        else if (diffMins > 1) startsInText += `in ${diffMins}m`;
        else startsInText = 'Starting soon';

        return { text: startsInText, isLive: false, canJoin: canJoin };
      } else if (now <= effectiveEndTime) {
        return { text: 'Happening Now', isLive: true, canJoin: true };
      } else {
        // If daily recurring, calculateNextOccurrence should handle getting the *next* one.
        // If we are here, it means even the calculated start is in the past.
        return { text: 'Ended', isLive: false, canJoin: false };
      }
    } catch (e) {
      console.error("Error in getEventTiming:", e);
      return { text: 'Timing error', isLive: false, canJoin: false };
    }
  };
  // ---

  const timing = getEventTiming(event);
  const traditionInfo = FAITH_TRADITIONS.find(t => t.id === event.tradition);

  // --- Event Loaded State Render ---
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: event?.title || 'Meditation',
          headerTitleStyle: { color: colors.headerText },
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => <BackButton />,
          headerShown: true,
        }}
      />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          {traditionInfo && (
             <View style={[styles.traditionBadge, { backgroundColor: traditionInfo.color || colors.primary }]}>
               <Ionicons name={traditionInfo.ionicon as any} size={24} color="#fff" />
             </View>
          )}
          <Text style={[styles.title, { color: colors.headerText }]}>{event.title}</Text>
          <View style={styles.timingRow}>
            {timing.isLive ? (
              <View style={[styles.liveContainer, { backgroundColor: colors.secondary }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>{timing.text}</Text>
              </View>
            ) : (
              <Text style={[styles.timing, { color: colors.accent }]}>{timing.text}</Text>
            )}
          </View>
        </View>

        {/* Info Section */}
        <View style={[styles.infoSection, { borderBottomColor: colors.border || colors.lightGray }]}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.gray} />
            <Text style={[styles.infoText, { color: colors.bodyText }]}>
                {/* Display the *next* calculated start time for recurring events */}
                {formatDate(event.is_recurring && event.recurrence_type === 'daily' ? calculateNextOccurrence(event.start_time, new Date()).toISOString() : event.start_time)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.gray} />
            <Text style={[styles.infoText, { color: colors.bodyText }]}>
              {event.duration || 'N/A'} minutes
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="repeat-outline" size={20} color={colors.gray} />
            <Text style={[styles.infoText, { color: colors.bodyText }]}>
              {getRecurrenceText(event)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={20} color={colors.gray} />
            <Text style={[styles.infoText, { color: colors.bodyText }]}>
              {participantCount} {participantCount === 1 ? 'person' : 'people'} participating
            </Text>
          </View>
          {event.created_by && event.created_by !== 'guest-user' && (
            <HostInfo userId={event.created_by} isDark={isDark} />
          )}
        </View>

        {/* Description */}
        {event.description ? (
          <View style={[styles.descriptionSection, { borderBottomColor: colors.border || colors.lightGray }]}>
            <Text style={[styles.sectionTitle, { color: colors.headerText }]}>About this meditation</Text>
            <Text style={[styles.description, { color: colors.bodyText }]}>
              {event.description}
            </Text>
          </View>
        ) : null}

        {/* --- Action Buttons / Request Area (Using timing logic) --- */}
        {timing.canJoin ? (
            <View style={styles.actionSection}>
              <Button
                 variant="primary"
                 onPress={handleJoin}
                 loading={joinLoading}
                 style={styles.actionButton}
                 size="large"
                 fullWidth
               >
                 {timing.isLive ? 'Join Now' : 'Join Meditation'}
               </Button>
               {/* Optional: Add request button here too? */}
               <Button
                   variant="outline"
                   onPress={() => setIsRequestFormVisible(true)}
                   size="large"
                   fullWidth
                   style={{ marginTop: 10 }}
                   iconLeft="add-circle-outline" // Assuming ButtonProps is fixed
               >
                   Submit Prayer/Healing Request
               </Button>
            </View>
         ) : timing.text !== 'Ended' ? (
            <View style={styles.actionSection}>
                <Button
                    variant={isRSVPed ? "secondary" : "primary"}
                    onPress={handleToggleRSVP}
                    loading={rsvpLoading}
                    style={styles.actionButton}
                    size="large"
                    fullWidth
                    iconLeft={isRSVPed ? 'notifications-off-outline' : 'notifications-outline'} // Assuming ButtonProps is fixed
                >
                    {isRSVPed ? 'Cancel Reminder' : 'Set Reminder'}
                </Button>
                <Button
                   variant="outline"
                   onPress={() => setIsRequestFormVisible(true)}
                   size="large"
                   fullWidth
                   style={{ marginTop: 10 }}
                   iconLeft="add-circle-outline" // Assuming ButtonProps is fixed
               >
                   Submit Prayer/Healing Request
               </Button>
            </View>
         ) : (
              <View style={styles.actionSection}>
                  <Text style={[styles.infoText, { color: colors.gray, textAlign: 'center'}]}>This meditation has ended.</Text>
              </View>
         )}

        {/* --- Requests Section (Always visible unless explicitly hidden) --- */}
        {/* {timing.text !== 'Ended' && ( // Optionally hide if ended */}
            <View style={[styles.requestsContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.requestsTitle, { color: colors.primary }]}>
                Community Requests
              </Text>
              <RequestList refreshKey={refreshRequestsKey} />
            </View>
        {/* )} */}

      </ScrollView>

      {/* --- Request Form Modal --- */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={isRequestFormVisible}
        onRequestClose={handleFormCancel}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.headerText }]}>Submit Request</Text>
            <TouchableOpacity onPress={handleFormCancel} style={styles.closeButton}>
              <Ionicons name="close-circle" size={30} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardAvoidingContainer}
            // keyboardVerticalOffset={60} // Adjust if necessary
          >
            <View style={styles.modalContent}>
                <RequestForm
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    paddingVertical: 25, paddingHorizontal: 20, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#eee', // Default border
  },
  backButton: { marginLeft: Platform.OS === 'ios' ? 10 : 0, padding: 5 },
  traditionBadge: {
    width: 60, height: 60, borderRadius: 30, justifyContent: 'center',
    alignItems: 'center', marginBottom: 15, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2, shadowRadius: 2,
  },
  title: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  timingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  timing: { fontSize: 16, fontWeight: '600' },
  liveContainer: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 15,
  },
  liveDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#fff', marginRight: 7 },
  liveText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  infoSection: { padding: 20, borderBottomWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  hostAvatar: { width: 24, height: 24, borderRadius: 12, marginRight: 10, backgroundColor: '#ccc' },
  infoText: { fontSize: 16, marginLeft: 12, flexShrink: 1 },
  descriptionSection: { padding: 20, borderBottomWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  description: { fontSize: 16, lineHeight: 24 },
  actionSection: { paddingHorizontal: 20, paddingVertical: 15 },
  actionButton: { /* Style if needed, like marginBottom: 10 */ },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 16, marginTop: 15 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  errorText: { fontSize: 17, textAlign: 'center', marginTop: 20, marginBottom: 25, lineHeight: 24 },
  requestsContainer: {
    borderRadius: 12, marginHorizontal: 15, marginBottom: 20, padding: 15,
    marginTop: 10, elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1,
  },
  requestsTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, textAlign: 'center' },
  modalContainer: { flex: 1 },
  modalHeader: {
     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
     paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1,
     borderBottomColor: '#ccc', // Use theme colors.border
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  closeButton: { padding: 5 },
  keyboardAvoidingContainer: { flex: 1, flexDirection: 'column', justifyContent: 'center' },
  modalContent: { flex: 1, padding: 15 },
});