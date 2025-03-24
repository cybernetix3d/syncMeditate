import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator 
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
          <Ionicons name={traditionObj.icon as any} size={20} color={COLORS.pastel2} />
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

export default function HomeScreen() {
  const { user } = useAuth();
  const { currentEvent } = useMeditation();
  const { colors } = useTheme();
  const { refresh } = useLocalSearchParams();

  const [globalEvents, setGlobalEvents] = useState<MeditationEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<MeditationCompletion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);

  const fetchMeditationData = async () => {
    try {
      console.log("FETCHING MEDITATION DATA", new Date().toISOString());
      setLoading(true);
      
      // First, get user history from user_meditation_history (durations are in seconds)
      if (isUserProfile(user)) {
        const { data: rawHistory, error: rawHistoryError } = await supabase
          .from('user_meditation_history')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
          
        console.log("RAW MEDITATION HISTORY:", 
          rawHistory ? `Found ${rawHistory.length} entries` : 'No entries found', 
          rawHistoryError);
        
        if (rawHistory && rawHistory.length > 0) {
          const historyCompletions = rawHistory.map((history: MeditationHistory) => {
            const completion: MeditationCompletion = {
              id: history.id,
              user_id: history.user_id,
              event_id: history.event_id,
              completed_at: history.date,
              duration: history.duration, // duration in seconds
              completed: true,
              meditation_type: 'user_history',
              meditation_events: null,
              notes: history.notes,
              tradition: history.tradition
            };
            return completion;
          });
          setRecentEvents(historyCompletions.slice(0, 10));
        }
      }
      
      const now = new Date();
// For global events, filter for events scheduled for today only.
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

const { data: eventsData, error: eventsError } = await supabase
  .from('meditation_events')
  .select(`
    *,
    meditation_participants (
      id,
      active
    )
  `)
  .eq('is_global', true)
  .gte('start_time', todayStart.toISOString())
  .lt('start_time', tomorrowStart.toISOString())
  .order('start_time', { ascending: true });

if (eventsError) {
  console.error('Error fetching global events:', eventsError);
} else {
  // Filter out events that have already ended.
  const activeEvents = (eventsData || []).filter((event: MeditationEvent) => {
    const eventStart = new Date(event.start_time);
    // Calculate event end time (duration is in minutes)
    const eventEnd = new Date(eventStart.getTime() + event.duration * 60000);
    return eventEnd > now; // Only include events that haven't ended yet
  }).map((event: MeditationEvent) => ({
    ...event,
    participant_count: event.meditation_participants?.filter(p => p.active)?.length || 0,
  }));
  setGlobalEvents(activeEvents);
}
      
    } catch (error) {
      console.error('Error in fetchMeditationData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeditationData();
  }, [user, refresh, forceRefresh]);

  const onRefresh = () => {
    setRefreshing(true);
    setForceRefresh(prev => prev + 1);
    fetchMeditationData();
  };

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
          <MeditationCard
            key={event.id}
            title={event.title}
            subtitle={new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            duration={event.duration}
            tradition={event.tradition || 'secular'}
            participants={event.participant_count}
            isGlobal={true}
            eventId={event.id}
            startTime={event.start_time}
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

  const renderRecentMeditationsSection = () => (
    <ScrollView>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Recent Meditations</Text>
        {isUserProfile(user) && (
          <>
            {recentEvents.length > 0 ? (
              recentEvents.map((completion) => {
                const event = completion.meditation_events;
                const meditationType =
                  completion.meditation_type ||
                  (event ? (event.is_global ? 'global' : 'scheduled') : 'quick');
                const isQuickMeditation = meditationType === 'quick';
                const isHistoryEntry = meditationType === 'user_history';
                const completedDate = new Date(completion.completed_at || Date.now());
  
                // Always treat duration as seconds from user_meditation_history
                const durationMinutes = Math.floor(completion.duration / 60);
                const remainingSeconds = completion.duration % 60;
                const formattedDuration =
                  remainingSeconds > 0
                    ? `${durationMinutes}:${remainingSeconds.toString().padStart(2, '0')}`
                    : `${durationMinutes} min`;
  
                let iconName: any = 'checkmark-circle';
                let iconColor = COLORS.pastel2;
                let backgroundColor = COLORS.secondary;
  
                if (isQuickMeditation) {
                  iconName = 'flash';
                  iconColor = COLORS.primary;
                  backgroundColor = COLORS.pastel1;
                } else if (isHistoryEntry) {
                  iconName = 'book';
                  iconColor = COLORS.primary;
                  backgroundColor = COLORS.pastel3;
                }
  
                return (
                  <View key={completion.id} style={styles.completedMeditationCard}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.traditionIcon, { backgroundColor }]}>
                        <Ionicons name={iconName} size={20} color={iconColor} />
                      </View>
                      <View style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle}>
                          {isQuickMeditation
                            ? `Quick ${formattedDuration} Meditation`
                            : isHistoryEntry
                            ? `${formattedDuration} Meditation`
                            : event?.title || 'Meditation Session'}
                        </Text>
                        <Text style={styles.cardSubtitle}>
                          {completedDate.toLocaleString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <View style={styles.cardDetailItem}>
                        <Ionicons name="time-outline" size={16} color={COLORS.gray} />
                        <Text style={styles.cardDetailText}>{formattedDuration}</Text>
                      </View>
                      {(event?.tradition || completion.tradition) && (
                        <View style={styles.cardDetailItem}>
                          <Ionicons name="leaf-outline" size={16} color={COLORS.gray} />
                          <Text style={styles.cardDetailText}>
                            {FAITH_TRADITIONS.find(
                              (t) => t.id === (event?.tradition || completion.tradition)
                            )?.name || 'Secular'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.cardDetailItem}>
                        <Ionicons
                          name={
                            meditationType === 'quick'
                              ? 'flash-outline'
                              : meditationType === 'global'
                              ? 'globe-outline'
                              : meditationType === 'user_history'
                              ? 'book-outline'
                              : 'calendar-outline'
                          }
                          size={16}
                          color={COLORS.gray}
                        />
                        <Text style={styles.cardDetailText}>
                          {meditationType === 'quick'
                            ? 'Quick'
                            : meditationType === 'global'
                            ? 'Global'
                            : meditationType === 'user_history'
                            ? 'History'
                            : 'Scheduled'}
                        </Text>
                      </View>
                      <View style={styles.cardDetailItem}>
                        <View style={styles.completedBadge}>
                          <Text style={styles.completedText}>Completed</Text>
                          <Ionicons name="checkmark" size={14} color={COLORS.secondary} />
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyStateContainer}>
                <Ionicons name="time" size={40} color={COLORS.lightGray} />
                <Text style={styles.emptyStateText}>You haven't meditated yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Start with a quick session above
                </Text>
              </View>
            )}
          </>
        )}
        {!isUserProfile(user) && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="time" size={40} color={COLORS.lightGray} />
            <Text style={styles.emptyStateText}>Sign in to track your meditations</Text>
            <Text style={styles.emptyStateSubtext}>
              Join the community to save your progress
            </Text>
            <Link href="/auth/sign-in" asChild>
              <Button style={styles.signInButton} size="small" onPress={() => {}}>
                Sign In
              </Button>
            </Link>
          </View>
        )}
      </View>
    </ScrollView>
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
      {renderRecentMeditationsSection()}
      
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
});
