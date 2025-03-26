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
  Modal // Import Modal
} from 'react-native';
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
import RequestForm from '@/src/components/meditation/RequestForm';
import RequestList from '@/src/components/meditation/RequestList';

// --- BackButton and HostInfo components remain the same ---
const BackButton = () => {
  const router = useRouter();
  const { colors } = useTheme(); // Use theme color for icon
  return (
    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
      <Ionicons name="arrow-back" size={24} color={colors.primary} />
    </TouchableOpacity>
  );
};

const HostInfo = ({ userId, isDark }) => {
  const [hostInfo, setHostInfo] = useState(null);
  const { colors } = useTheme(); // Use theme colors

  useEffect(() => {
    const fetchHostInfo = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url') // Added avatar_url
          .eq('id', userId)
          .single();
        if (!error && data) {
          setHostInfo(data);
        } else if (error) {
          console.error('Error fetching host info:', error.message);
        }
      } catch (err) {
        console.error('Catch Error fetching host info:', err);
      }
    };
    fetchHostInfo();
  }, [userId]);

  if (!hostInfo) return null; // Don't render anything if hostInfo is null

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

// Helper: Extract the base UUID from a composite event ID.
const extractOriginalId = (compositeId: string): string => {
  if (!compositeId || typeof compositeId !== 'string') return ''; // Handle invalid input
  const segments = compositeId.split('-');
  // Basic UUID check (5 segments: 8-4-4-4-12 hex chars) - adjust if needed
  if (segments.length >= 5 && segments[0].length === 8) {
     return segments.slice(0, 5).join('-');
  }
  return compositeId; // Return original if it doesn't look like a composite ID we expect
};


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

  // Meditation state: PREPARING, IN_PROGRESS, PAUSED, COMPLETED
  // Note: This state seems unused in the provided logic, but kept for potential future use.
  const [meditationState, setMeditationState] = useState<'PREPARING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'>('PREPARING');

  // *** State to control Modal visibility ***
  const [isRequestFormVisible, setIsRequestFormVisible] = useState(false);
  const [refreshRequestsKey, setRefreshRequestsKey] = useState(0); // State to trigger RequestList refresh

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

      // Use Promise.all for concurrent fetching
      const [eventResult, participantsResult, rsvpResult] = await Promise.all([
        getMeditationEventById(originalId),
        supabase.rpc('get_participant_count', { p_event_id: originalId }), // Ensure RPC param name matches
        (user && user !== true) ? supabase
            .from('event_rsvps')
            .select('id', { count: 'exact', head: true }) // More efficient count check
            .eq('event_id', originalId)
            .eq('user_id', user.id)
            .maybeSingle() : Promise.resolve({ count: 0, error: null }) // Resolve for guests
      ]);

      // Handle Event Fetching
      if (eventResult.error) {
        console.error('Error fetching event details:', eventResult.error);
        setError('Failed to load meditation details.');
        setEvent(null); // Clear event data on error
      } else if (!eventResult.data) {
        setError('Meditation event not found.');
        setEvent(null);
      } else {
        setEvent(eventResult.data);
      }

      // Handle Participant Count
      if (participantsResult.error) {
         console.error('Error getting participant count:', participantsResult.error);
         setParticipantCount(0); // Default to 0 on error
      } else {
         setParticipantCount(participantsResult.data ?? 0);
      }

      // Handle RSVP Check
      if (rsvpResult?.error) {
         console.error('Error checking RSVP:', rsvpResult.error);
         setIsRSVPed(false); // Default to false on error
      } else {
         setIsRSVPed(!!rsvpResult?.count && rsvpResult.count > 0);
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
      // Optional: Reset modal state when screen gains focus
      // setIsRequestFormVisible(false);
    }, [fetchEventDetails])
  );

  // Function to manually trigger refresh if needed
  const handleRefresh = () => {
    fetchEventDetails();
    setRefreshRequestsKey(prev => prev + 1); // Increment key to refresh RequestList
  };

  // Called when the RequestForm is submitted successfully
  const handleFormSubmit = () => {
    setIsRequestFormVisible(false); // Close the modal
    setRefreshRequestsKey(prev => prev + 1); // Trigger RequestList refresh
    // Optional: Show a success message
    // Alert.alert("Success", "Your request has been submitted.");
  };

  // Called when the RequestForm is cancelled
  const handleFormCancel = () => {
    setIsRequestFormVisible(false); // Close the modal
  };

  const handleJoin = async () => {
    // Simplified handleJoin - navigates directly if event exists
    if (!event) return;
    setJoinLoading(true); // Consider setting loading state
    try {
      const originalId = extractOriginalId(event.id);
      // Ensure required parameters are passed correctly
      router.push(`/meditation/sync?id=${originalId}&duration=${event.duration}`);
    } catch (error) {
      console.error('Error navigating to sync screen:', error);
      Alert.alert('Error', 'Failed to join meditation. Please try again.');
      setJoinLoading(false); // Reset loading on error
    }
    // Note: setJoinLoading(false) might ideally be in the finally block
    // or handled by navigation events if the screen unmounts.
  };

  // --- handleToggleRSVP remains largely the same ---
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
        // Delete RSVP
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', originalId)
          .eq('user_id', user.id);

        if (error) throw error; // Throw error to be caught below

        // TODO: Cancel the actual notification using the stored notification_id if possible
        // This requires storing and retrieving the notification_id associated with the RSVP

        setIsRSVPed(false);
        Alert.alert('Reminder Removed', 'You will no longer receive a notification for this event.');

      } else {
        // Add RSVP and schedule notification
        const notificationId = await scheduleEventReminder(
          originalId,
          event.title,
          event.start_time
        );

        if (!notificationId) {
           throw new Error("Failed to schedule notification reminder.");
        }

        const { error } = await supabase
          .from('event_rsvps')
          .insert({
            event_id: originalId,
            user_id: user.id,
            notification_id: notificationId, // Store the notification ID
          });

        if (error) throw error; // Throw error to be caught below

        setIsRSVPed(true);
        Alert.alert(
          'Reminder Set',
          'You will receive a notification before this meditation session begins.',
          [
            { text: 'OK' },
            { text: 'Notification Settings', onPress: () => router.push('/settings/notifications') }
          ]
        );
      }
    } catch (error: any) {
      console.error('Error toggling RSVP:', error);
      Alert.alert('Error', `Failed to ${isRSVPed ? 'remove' : 'set'} reminder: ${error.message || 'Please try again.'}`);
      // Optionally revert UI state if operation failed
      // setIsRSVPed(!isRSVPed);
    } finally {
      setRSVPLoading(false);
    }
  };
  // ---

  // Loading State
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

  // Error State
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

  // Event loaded state
  const eventStart = new Date(event.start_time);
  const now = new Date();
  const canBegin = now >= eventStart; // Can begin if current time is past start time

  // --- Helper functions (formatDate, getRecurrenceText, isHappeningNow, getEventTiming) remain the same ---
    const formatDate = (dateString: string | null): string => {
      if (!dateString) return 'Date not available';
      try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          return 'Invalid date';
        }
        return date.toLocaleString(undefined, { // Use locale default format
          weekday: 'short', // e.g., Mon
          month: 'short', // e.g., Jan
          day: 'numeric', // e.g., 15
          hour: 'numeric', // e.g., 1 PM or 13
          minute: '2-digit', // e.g., 05
          // year: 'numeric' // Optional: Add year if needed
        });
      } catch (e) {
        console.error("Error formatting date:", e);
        return 'Error formatting date';
      }
    };

    const getRecurrenceText = (evt: any): string => {
      if (!evt?.is_recurring) return 'One-time event';
      const recurrenceMap: { [key: string]: string } = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
      return `${recurrenceMap[evt.recurrence_type] || 'Recurring'} event`;
    };

    const isHappeningNow = (evt: any): boolean => {
       if (!evt?.start_time || !evt?.duration) return false;
       try {
         const startTime = new Date(evt.start_time);
         // Ensure duration is a number
         const durationMinutes = Number(evt.duration);
         if (isNaN(durationMinutes)) return false;

         const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
         const currentTime = new Date();
         return currentTime >= startTime && currentTime <= endTime;
       } catch (e) {
          console.error("Error in isHappeningNow:", e);
          return false;
       }
    };

    const getEventTiming = (evt: any): { text: string; isLive: boolean; canJoin: boolean } => {
      if (!evt?.start_time || !evt?.duration) {
         return { text: 'Timing unavailable', isLive: false, canJoin: false };
      }
      try {
        const startTime = new Date(evt.start_time);
        const durationMinutes = Number(evt.duration);
         if (isNaN(startTime.getTime()) || isNaN(durationMinutes)) {
           return { text: 'Invalid time', isLive: false, canJoin: false };
         }

        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
        const currentTime = new Date();
        // Add a grace period (e.g., 5 minutes before start)
        const joinStartTime = new Date(startTime.getTime() - 5 * 60000);

        const canJoin = currentTime >= joinStartTime && currentTime <= endTime;

        if (currentTime < startTime) {
          const diffMs = startTime.getTime() - currentTime.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));

          let startsInText = 'Starts ';
          if (diffDays > 0) startsInText += `in ${diffDays}d ${diffHrs}h`;
          else if (diffHrs > 0) startsInText += `in ${diffHrs}h ${diffMins}m`;
          else if (diffMins > 0) startsInText += `in ${diffMins}m`;
          else startsInText = 'Starting soon';

          return { text: startsInText, isLive: false, canJoin: canJoin };

        } else if (currentTime <= endTime) {
          return { text: 'Happening Now', isLive: true, canJoin: true };
        } else {
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: event?.title || 'Meditation', // Use event title if available
          headerTitleStyle: { color: colors.headerText },
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => <BackButton />,
          headerShown: true,
        }}
      />
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
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

        <View style={[styles.infoSection, { borderBottomColor: colors.border || colors.lightGray }]}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.gray} />
            <Text style={[styles.infoText, { color: colors.bodyText }]}>
              {formatDate(event.start_time)}
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

          {event.created_by && event.created_by !== 'guest-user' && ( // Only show if created by a non-guest user
            <HostInfo userId={event.created_by} isDark={isDark} />
          )}
        </View>

        {event.description ? (
          <View style={[styles.descriptionSection, { borderBottomColor: colors.border || colors.lightGray }]}>
            <Text style={[styles.sectionTitle, { color: colors.headerText }]}>About this meditation</Text>
            <Text style={[styles.description, { color: colors.bodyText }]}>
              {event.description}
            </Text>
          </View>
        ) : null}

        {/* --- Action Buttons / Request Area --- */}
        {timing.canJoin ? ( // Show "Join" button if meditation is happening or starting soon
            <View style={styles.actionSection}>
              <Button
                 variant="primary"
                 onPress={handleJoin}
                 loading={joinLoading}
                 style={styles.actionButton}
                 size="large"
                 fullWidth
               >
                 {timing.isLive ? 'Join Meditation Now' : 'Join Meditation'}
               </Button>
            </View>
         ) : timing.text !== 'Ended' ? ( // Show RSVP if not ended and cannot join yet
            <View style={styles.actionSection}>
                <Button
                    variant={isRSVPed ? "secondary" : "primary"} // Use secondary when RSVPed
                    onPress={handleToggleRSVP}
                    loading={rsvpLoading}
                    style={styles.actionButton}
                    size="large"
                    fullWidth
                    iconLeft={isRSVPed ? 'notifications-off-outline' : 'notifications-outline'} // Add icon
                >
                    {isRSVPed ? 'Cancel Reminder' : 'Set Reminder'}
                </Button>
            </View>
         ) : ( // Show "Ended" message if event has ended
              <View style={styles.actionSection}>
                  <Text style={[styles.infoText, { color: colors.gray, textAlign: 'center'}]}>This meditation has ended.</Text>
              </View>
         )}


        {/* --- Requests Section (Always visible if event hasn't ended) --- */}
        {timing.text !== 'Ended' && (
          <>
            <View style={styles.actionSection}>
              {/* Button to open the Request Form Modal */}
              <Button
                variant="outline"
                onPress={() => setIsRequestFormVisible(true)} // Open the modal
                size="large"
                fullWidth
                iconLeft="add-circle-outline"
              >
                Submit Prayer/Healing Request
              </Button>
            </View>

            <View style={[styles.requestsContainer, { backgroundColor: colors.surface }]}>
              <Text style={[styles.requestsTitle, { color: colors.primary }]}>
                Community Requests
              </Text>
              {/* Pass refreshRequestsKey to RequestList to trigger re-fetch */}
              <RequestList refreshKey={refreshRequestsKey} />
            </View>
          </>
        )}

      </ScrollView>

      {/* --- Request Form Modal --- */}
      <Modal
        animationType="slide" // Or "fade"
        transparent={false} // Make modal background opaque
        visible={isRequestFormVisible}
        onRequestClose={() => {
          // Android back button press
          handleFormCancel();
        }}
      >
        {/* Use SafeAreaView inside Modal for better layout */}
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
           {/* Optional: Add a header with a close button */}
           <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, {color: colors.headerText}]}>Submit Request</Text>
                <TouchableOpacity onPress={handleFormCancel} style={styles.closeButton}>
                    <Ionicons name="close-circle" size={30} color={colors.primary} />
                </TouchableOpacity>
           </View>
           <View style={styles.modalContent}>
                <RequestForm
                    onSubmit={handleFormSubmit}
                    onCancel={handleFormCancel}
                />
           </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set dynamically
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
     paddingBottom: 40, // Ensure space at the bottom
  },
  header: {
    paddingVertical: 25, // More vertical padding
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
  },
  backButton: {
    marginLeft: Platform.OS === 'ios' ? 10 : 0, // Adjust margin for iOS back button placement
    padding: 5, // Easier to tap
  },
  traditionBadge: {
    width: 60, // Slightly larger
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3, // Add subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  title: {
    fontSize: 26, // Larger title
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    // color set dynamically
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8, // More space
  },
  timing: {
    fontSize: 16,
    fontWeight: '600',
    // color set dynamically
  },
  liveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor set dynamically
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15, // More rounded
  },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#fff',
    marginRight: 7,
  },
  liveText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  infoSection: {
    padding: 20,
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18, // Increased spacing
  },
  hostAvatar: {
     width: 24,
     height: 24,
     borderRadius: 12,
     marginRight: 10,
     backgroundColor: '#ccc' // Placeholder bg
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12, // Consistent margin
    // color set dynamically
    flexShrink: 1, // Allow text to wrap if needed
  },
  descriptionSection: {
    padding: 20,
    borderBottomWidth: 1,
    // borderBottomColor set dynamically
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600', // Use 600 for titles
    marginBottom: 12,
    // color set dynamically
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    // color set dynamically
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingVertical: 15, // Add vertical padding
  },
  actionButton: {
    // No marginBottom needed if using gap or separate sections
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
    // color set dynamically
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30, // More padding for error state
  },
  errorText: {
    fontSize: 17, // Slightly larger error text
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 25,
    lineHeight: 24,
    // color set dynamically
  },
  buttonContainer: { // Style specifically for the "Begin" / "Submit" buttons if needed
      paddingHorizontal: 20,
      paddingVertical: 10,
      gap: 10, // Add gap between buttons if they appear together
  },
  requestsContainer: {
    // backgroundColor set dynamically
    borderRadius: 12,
    marginHorizontal: 15, // Consistent margin
    marginBottom: 20,
    padding: 15, // Inner padding
    marginTop: 10, // Space above requests section
    elevation: 1, // Subtle elevation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  requestsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15, // More space below title
    // color set dynamically
    textAlign: 'center',
  },
  // --- Modal Styles ---
  modalContainer: {
    flex: 1,
    // backgroundColor set dynamically
  },
  modalHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingHorizontal: 15,
     paddingVertical: 10,
     borderBottomWidth: 1,
     borderBottomColor: '#ccc' // Use colors.border here
  },
  modalTitle: {
     fontSize: 18,
     fontWeight: '600',
  },
  closeButton: {
     padding: 5, // Hit area
  },
  modalContent: {
    flex: 1, // Allows RequestForm's ScrollView/KAV to work
    // Padding/margin is handled within RequestForm or its internal ScrollView
  },
});