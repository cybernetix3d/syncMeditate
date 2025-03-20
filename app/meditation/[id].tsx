import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  SafeAreaView,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/src/api/supabase';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import Button from '@/src/components/common/Button';
import { UserProfile } from '@/src/context/AuthProvider';

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
  content?: {
    audio_url?: string;
    instructions?: string;
    sections?: Array<{
      title: string;
      duration: number;
      description?: string;
    }>;
  };
  creator?: {
    display_name: string;
    avatar_url?: string;
  };
  participant_count?: number;
}

const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile => {
  return typeof user !== 'boolean' && user !== null && 'id' in user;
};

export default function MeditationDetailsScreen() {
  const params = useLocalSearchParams();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const { colors } = useTheme();
  const { user } = useAuth();
  
  const [event, setEvent] = useState<MeditationEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('meditation_events')
          .select(`
            *,
            creator:created_by(display_name, avatar_url)
          `)
          .eq('id', eventId)
          .single();

        if (error) {
          throw error;
        }

        // Get participant count
        const { count, error: countError } = await supabase
          .from('meditation_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', eventId)
          .eq('active', true);

        if (countError) {
          console.error('Error fetching participant count:', countError);
        }

        // Format the event data
        const formattedEvent: MeditationEvent = {
          ...data,
          participant_count: count || 0,
        };

        setEvent(formattedEvent);
        setParticipantCount(count || 0);
      } catch (error) {
        console.error('Error fetching meditation details:', error);
        Alert.alert(
          'Error',
          'Could not load meditation details. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } finally {
        setLoading(false);
      }
    };

    // Set up real-time subscription for participant count
    const subscription = supabase
      .channel(`meditation-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meditation_participants',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new.active) {
            setParticipantCount(prev => prev + 1);
          } else if (
            payload.eventType === 'UPDATE' && 
            payload.old.active && 
            !payload.new.active
          ) {
            setParticipantCount(prev => Math.max(0, prev - 1));
          } else if (payload.eventType === 'DELETE' && payload.old.active) {
            setParticipantCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    fetchEventDetails();

    return () => {
      subscription.unsubscribe();
    };
  }, [eventId]);

  const handleJoinMeditation = async () => {
    if (!event) return;

    try {
      setIsJoining(true);
      router.push(`/meditation/sync?id=${eventId}&duration=${event.duration}`);
    } catch (error) {
      console.error('Error joining meditation:', error);
      Alert.alert('Error', 'Failed to join the meditation. Please try again.');
      setIsJoining(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeUntil = (dateString: string): string | null => {
    const now = new Date();
    const eventStart = new Date(dateString);
    const diffMs = eventStart.getTime() - now.getTime();
    
    if (diffMs < 0) return null;
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 24) {
      return `Starts in ${Math.floor(diffHrs / 24)} days`;
    } else if (diffHrs > 0) {
      return `Starts in ${diffHrs}h ${diffMins}m`;
    } else {
      return `Starts in ${diffMins}m`;
    }
  };

  const isHappeningNow = (): boolean => {
    if (!event) return false;
    
    const now = new Date();
    const eventStart = new Date(event.start_time);
    const eventEnd = new Date(eventStart.getTime() + event.duration * 60000);
    
    return now >= eventStart && now <= eventEnd;
  };

  const canJoin = (): boolean => {
    if (!event) return false;
    
    const now = new Date();
    const eventStart = new Date(event.start_time);
    
    // Can join if it's within 5 minutes of the start time or has already started
    return now.getTime() >= eventStart.getTime() - 5 * 60000;
  };

  const getStatusBadge = () => {
    if (!event) return null;
    
    if (isHappeningNow()) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: COLORS.accent }]}>
          <View style={styles.statusDot} />
          <Text style={styles.statusBadgeText}>Live Now</Text>
        </View>
      );
    }
    
    const timeUntil = getTimeUntil(event.start_time);
    if (timeUntil) {
      return (
        <View style={[styles.statusBadge, { backgroundColor: colors.surface }]}>
          <Ionicons name="time-outline" size={12} color={colors.primary} />
          <Text style={[styles.countdownText, { color: colors.primary }]}>{timeUntil}</Text>
        </View>
      );
    }
    
    return null;
  };

  const getTraditionInfo = () => {
    if (!event?.tradition) return FAITH_TRADITIONS[0];
    return FAITH_TRADITIONS.find(t => t.id === event.tradition) || FAITH_TRADITIONS[0];
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.gray }]}>
          Loading meditation details...
        </Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={50} color={colors.accent} />
        <Text style={[styles.errorText, { color: colors.primary }]}>
          Meditation not found
        </Text>
        <Button onPress={() => router.back()} style={styles.backButton}>
          Go Back
        </Button>
      </View>
    );
  }

  const tradition = getTraditionInfo();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.white }]}>Meditation Details</Text>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={() => {
            Share.share({
              message: `Join me for meditation: ${event.title} on SyncMeditate`,
            });
          }}
        >
          <Ionicons name="share-outline" size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]}>
        <View style={[styles.eventHeader, { backgroundColor: colors.primary }]}>
          <Text style={[styles.eventTitle, { color: colors.white }]}>{event.title}</Text>
          {getStatusBadge()}
        </View>

        <View style={styles.content}>
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: tradition.color }]}>
                <Ionicons name={tradition.icon as any} size={20} color={COLORS.white} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.gray }]}>Tradition</Text>
                <Text style={[styles.infoValue, { color: colors.headerText }]}>
                  {tradition.name}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
                <Ionicons name="calendar" size={20} color={COLORS.white} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.gray }]}>Date & Time</Text>
                <Text style={[styles.infoValue, { color: colors.headerText }]}>
                  {formatDate(event.start_time)}
                </Text>
                <Text style={[styles.infoSubvalue, { color: colors.subtitleText }]}>
                  {formatTime(event.start_time)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.accent }]}>
                <Ionicons name="time" size={20} color={COLORS.white} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.gray }]}>Duration</Text>
                <Text style={[styles.infoValue, { color: colors.headerText }]}>
                  {event.duration} minutes
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={[styles.iconContainer, { backgroundColor: colors.pastel3 }]}>
                <Ionicons name="people" size={20} color={COLORS.white} />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={[styles.infoLabel, { color: colors.gray }]}>Participants</Text>
                <Text style={[styles.infoValue, { color: colors.headerText }]}>
                  {participantCount} {participantCount === 1 ? 'person' : 'people'}
                </Text>
                {isHappeningNow() && (
                  <Text style={[styles.infoSubvalue, { color: colors.accent }]}>
                    Happening now
                  </Text>
                )}
              </View>
            </View>

            {event.creator && (
              <View style={styles.infoRow}>
                <View style={[styles.iconContainer, { backgroundColor: colors.pastel1 }]}>
                  <Ionicons name="person" size={20} color={COLORS.white} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, { color: colors.gray }]}>Host</Text>
                  <Text style={[styles.infoValue, { color: colors.headerText }]}>
                    {event.creator.display_name}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {event.description && (
            <View style={[styles.descriptionCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                About this Meditation
              </Text>
              <Text style={[styles.description, { color: colors.bodyText }]}>
                {event.description}
              </Text>
            </View>
          )}

          {event.content?.sections && (
            <View style={[styles.sectionsCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                Meditation Sections
              </Text>
              {event.content.sections.map((section, index) => (
                <View key={index} style={styles.meditationSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionName, { color: colors.headerText }]}>
                      {section.title}
                    </Text>
                    <Text style={[styles.sectionDuration, { color: colors.primary }]}>
                      {section.duration} min
                    </Text>
                  </View>
                  {section.description && (
                    <Text style={[styles.sectionDescription, { color: colors.bodyText }]}>
                      {section.description}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          <View style={styles.joinButtonContainer}>
            <Button
              onPress={handleJoinMeditation}
              disabled={!canJoin() || isJoining}
              loading={isJoining}
              fullWidth
              size="large"
            >
              {isHappeningNow() ? 'Join Now' : canJoin() ? 'Join When Starts' : 'Cannot Join Yet'}
            </Button>
            {!canJoin() && (
              <Text style={[styles.joinButtonHelp, { color: colors.gray }]}>
                This meditation hasn't started yet
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  backButton: {
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  shareButton: {
    padding: 10,
  },
  scrollView: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  eventHeader: {
    padding: 20,
    paddingTop: 30,
    paddingBottom: 30,
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    marginRight: 5,
  },
  statusBadgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoSubvalue: {
    fontSize: 14,
    marginTop: 2,
  },
  descriptionCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionsCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  meditationSection: {
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  sectionName: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDuration: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  joinButtonContainer: {
    marginTop: 10,
    marginBottom: 30,
  },
  joinButtonHelp: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 10,
  },
});