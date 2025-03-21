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
import { useAuth } from '@/src/context/AuthProvider';
import { useMeditation } from '@/src/context/MeditationProvider';
import { supabase } from '@/src/api/supabase';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import Button from '@/src/components/common/Button';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';
import { UserProfile } from '@/src/context/AuthProvider';

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
    if (!startTime) return true; // Quick start meditations can always be joined
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
    if (diffHrs > 24) {
      return null;
    } else if (diffHrs > 0) {
      return `In ${diffHrs}h ${diffMins}m`;
    } else {
      return `In ${diffMins}m`;
    }
  };

  const navigateToMeditation = () => {
    if (canJoin() && joinable) {
      router.push(`/meditation/sync?id=${eventId}&duration=${duration}`);
    } else {
      // Navigate to details page instead
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

// Helper function to check if user is a UserProfile
const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile => {
  return typeof user !== 'boolean' && user !== null && 'id' in user;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { currentEvent } = useMeditation();
  const { colors } = useTheme();
  const { refresh } = useLocalSearchParams();

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
    duration: number;
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
    duration: number;
    tradition: string | null;
    notes: string | null;
    mood_before?: number;
    mood_after?: number;
  }
  
  const [globalEvents, setGlobalEvents] = useState<MeditationEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<MeditationCompletion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forceRefresh, setForceRefresh] = useState(0);

  const fetchMeditationData = async () => {
    try {
      console.log("FETCHING MEDITATION DATA", new Date().toISOString());
      setLoading(true);
      
      if (isUserProfile(user)) {
        // First try a simple direct query to get raw history data
        const { data: rawHistory, error: rawHistoryError } = await supabase
          .from('user_meditation_history')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false });
          
        console.log("RAW MEDITATION HISTORY:", 
          rawHistory ? `Found ${rawHistory.length} entries` : 'No entries found', 
          rawHistoryError);
        
        if (rawHistory && rawHistory.length > 0) {
          // Convert these directly to the right format
          const historyCompletions = rawHistory.map((history: MeditationHistory) => {
            const completion: MeditationCompletion = {
              id: history.id,
              user_id: history.user_id,
              event_id: history.event_id,
              completed_at: history.date,
              duration: history.duration,
              completed: true,
              meditation_type: 'user_history',
              meditation_events: null,
              notes: history.notes,
              tradition: history.tradition
            };
            return completion;
          });
          
          // Just use history for now to debug
          setRecentEvents(historyCompletions.slice(0, 10));
          setLoading(false);
          setRefreshing(false);
          return;
        }
      }
      
      const now = new Date();
      
      // Get all events with participant counts
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
        .gte('start_time', now.toISOString()) // Get events starting now or in the future
        .order('start_time', { ascending: true })
        .limit(5);
        
      if (eventsError) {
        console.error('Error fetching global events:', eventsError);
      } else {
        // Process events and add participant counts
        const activeEvents = (eventsData || []).map((event: MeditationEvent) => ({
          ...event,
          participant_count: event.meditation_participants?.filter(p => p.active)?.length || 0
        }));
        setGlobalEvents(activeEvents);
      }

      if (isUserProfile(user)) {
        // Get completed meditations with full event details
        const { data: completionsWithEvents, error: completionsWithEventsError } = await supabase
          .from('meditation_completions')
          .select(`
            id,
            user_id,
            event_id,
            completed_at,
            duration,
            completed,
            meditation_events (
              *,
              meditation_participants (
                id,
                active
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('completed', true)
          .not('event_id', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(5);
          
        if (completionsWithEventsError) {
          console.error('Error fetching recent completions with events:', completionsWithEventsError);
        }
        
        // Also get quick meditations (those without event_id)
        const { data: quickMeditations, error: quickMeditationsError } = await supabase
          .from('meditation_completions')
          .select('id, user_id, event_id, completed_at, duration, completed')
          .eq('user_id', user.id)
          .eq('completed', true)
          .is('event_id', null)
          .order('completed_at', { ascending: false })
          .limit(5);
          
        if (quickMeditationsError) {
          console.error('Error fetching quick sessions from meditation_completions:', quickMeditationsError);
        } else {
          console.log('Quick meditations found:', quickMeditations?.length || 0);
        }
        
        // Also get meditations from user_meditation_history
        const { data: historyEntries, error: historyError } = await supabase
          .from('user_meditation_history')
          .select(`
            id,
            user_id,
            event_id,
            date,
            duration,
            tradition,
            notes,
            mood_before,
            mood_after
          `)
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(5);
          
        if (historyError) {
          console.error('Error fetching meditation history:', historyError);
        } else {
          console.log('Meditation history entries found:', historyEntries?.length || 0);
        }
        
        // Convert history entries to the same format as completions
        const historyCompletions = (historyEntries || []).map((history: MeditationHistory) => {
          const completion: MeditationCompletion = {
            id: history.id,
            user_id: history.user_id,
            event_id: history.event_id,
            completed_at: history.date,
            duration: history.duration,
            completed: true,
            meditation_type: 'user_history',
            meditation_events: null,
            notes: history.notes,
            tradition: history.tradition
          };
          return completion;
        });
        
        // Process quick meditations to add type
        const processedQuickMeditations = (quickMeditations || []).map(qm => {
          const completion: MeditationCompletion = {
            ...qm,
            meditation_events: null,
            meditation_type: 'quick'
          };
          return completion;
        });
        
        // Process scheduled meditations to add type
        const processedScheduledMeditations = (completionsWithEvents || []).map(ce => {
          // First check if meditation_events exists and is an object
          const meditationEvents = ce.meditation_events && typeof ce.meditation_events === 'object' 
            ? ce.meditation_events as unknown as (MeditationEvent & {
                meditation_participants?: Array<{
                  id: string;
                  active: boolean;
                }>;
              }) 
            : null;
          
          const isGlobal = meditationEvents && 'is_global' in meditationEvents && meditationEvents.is_global === true;
          
          const completion: MeditationCompletion = {
            ...ce,
            meditation_type: isGlobal ? 'global' : 'scheduled',
            meditation_events: meditationEvents
          };
          return completion;
        });
        
        // Combine all types of completions
        const allCompletions: MeditationCompletion[] = [
          ...processedScheduledMeditations,
          ...processedQuickMeditations,
          ...historyCompletions
        ].sort((a, b) => {
          const dateA = new Date(a.completed_at || Date.now()).getTime();
          const dateB = new Date(b.completed_at || Date.now()).getTime();
          return dateB - dateA;
        }).slice(0, 10);
        
        // Log for debugging
        console.log('Final combined meditations:', 
          allCompletions.map(c => ({
            id: c.id,
            type: c.meditation_type,
            date: c.completed_at,
            duration: c.duration
          }))
        );
        
        setRecentEvents(allCompletions);
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
    // Increment forceRefresh to trigger a re-fetch
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
      <Text style={styles.sectionTitle}>Global Meditations</Text>
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
          <Text style={styles.emptyStateText}>No Upcoming Global Meditations</Text>
          <Text style={styles.emptyStateSubtext}>Check back later for new meditation sessions</Text>
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Recent Meditations</Text>
      {isUserProfile(user) && (
        <>
          {/* Debug info - show counts */}
          <View style={{ marginBottom: 10, padding: 10, backgroundColor: colors.surface, borderRadius: 8 }}>
            <Text style={{ color: colors.bodyText }}>History entries found: {recentEvents.length}</Text>
            <Text style={{ color: colors.bodyText, marginVertical: 5 }}>
              Types: {recentEvents.map(e => e.meditation_type || 'unknown').join(', ')}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                console.log('Manual refresh clicked');
                setForceRefresh(prev => prev + 1);
              }}
              style={{ 
                backgroundColor: colors.primary, 
                padding: 8, 
                borderRadius: 4, 
                alignItems: 'center',
                marginTop: 5 
              }}
            >
              <Text style={{ color: '#fff' }}>Force Refresh Data</Text>
            </TouchableOpacity>
          </View>
          
          {recentEvents.length > 0 ? (
            recentEvents.map((completion) => {
              const event = completion.meditation_events;
              const meditationType = completion.meditation_type || (event ? (event.is_global ? 'global' : 'scheduled') : 'quick');
              const isQuickMeditation = meditationType === 'quick';
              const isHistoryEntry = meditationType === 'user_history';
              const completedDate = new Date(completion.completed_at || Date.now());
              
              // Format duration based on whether it's in seconds or minutes
              let durationMinutes = Math.round(completion.duration / 60);
              let formattedDuration;
              
              // If duration is very small, it's likely already in minutes
              if (completion.duration < 100 && isHistoryEntry) {
                // This is likely already in minutes
                durationMinutes = completion.duration;
                formattedDuration = `${durationMinutes} min`;
              } else {
                // Duration is in seconds
                durationMinutes = Math.floor(completion.duration / 60);
                const remainingSeconds = completion.duration % 60;
                formattedDuration = remainingSeconds > 0 ? 
                  `${durationMinutes}:${remainingSeconds.toString().padStart(2, '0')}` : 
                  `${durationMinutes} min`;
              }
              
              let iconName: any = "checkmark-circle";
              let iconColor = COLORS.pastel2;
              let backgroundColor = COLORS.secondary;
              
              if (isQuickMeditation) {
                iconName = "flash";
                iconColor = COLORS.primary;
                backgroundColor = COLORS.pastel1;
              } else if (isHistoryEntry) {
                iconName = "book";
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
                        {isQuickMeditation ? 
                          `Quick ${formattedDuration} Meditation` : 
                          isHistoryEntry ?
                          `${formattedDuration} Meditation` :
                          (event?.title || 'Meditation Session')}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {completedDate.toLocaleString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
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
                          {FAITH_TRADITIONS.find(t => t.id === (event?.tradition || completion.tradition))?.name || 'Secular'}
                        </Text>
                      </View>
                    )}
                    <View style={styles.cardDetailItem}>
                      <Ionicons 
                        name={meditationType === 'quick' ? "flash-outline" : 
                              meditationType === 'global' ? "globe-outline" : 
                              meditationType === 'user_history' ? "book-outline" :
                              "calendar-outline"} 
                        size={16} 
                        color={COLORS.gray} 
                      />
                      <Text style={styles.cardDetailText}>
                        {meditationType === 'quick' ? "Quick" : 
                         meditationType === 'global' ? "Global" : 
                         meditationType === 'user_history' ? "History" :
                         "Scheduled"}
                      </Text>
                    </View>
                    <View style={[styles.completedBadge]}>
                      <Text style={styles.completedText}>Completed</Text>
                      <Ionicons name="checkmark" size={14} color={COLORS.secondary} />
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="time" size={40} color={COLORS.lightGray} />
              <Text style={styles.emptyStateText}>You haven't meditated yet</Text>
              <Text style={styles.emptyStateSubtext}>Start with a quick session above</Text>
            </View>
          )}
        </>
      )}
      
      {!isUserProfile(user) && (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="time" size={40} color={COLORS.lightGray} />
          <Text style={styles.emptyStateText}>Sign in to track your meditations</Text>
          <Text style={styles.emptyStateSubtext}>Join the community to save your progress</Text>
          <Link href="/auth/sign-in" asChild>
            <Button style={styles.signInButton} size="small" onPress={() => {}}>
              Sign In
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
            : 'Welcome to SyncMeditate'}
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
    backgroundColor: COLORS.pastel3, // Define this in your style sheet
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
    backgroundColor: COLORS.pastel3, // Define this opacity version
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
    backgroundColor: COLORS.pastel3, // Define this very light opacity version
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: COLORS.primary,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: COLORS.gray,
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
