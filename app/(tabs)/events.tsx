import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator,
  RefreshControl,
  Alert,
  SectionList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthProvider';
import { supabase } from '../../src/api/supabase';
import { FAITH_TRADITIONS } from '../../src/components/faith/TraditionSelector';
import Button from '../../src/components/common/Button';
import { COLORS, COMMON_STYLES } from '../../src/constants/Styles';
import { useTheme } from '../../src/context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

// Event type definition
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
  participant_count?: number;
  is_recurring: boolean;
  recurrence_type: string | null;
}

// Section type for grouped events
interface EventSection {
  title: string;
  data: MeditationEvent[];
}

// Event card component props
interface EventCardProps {
  event: MeditationEvent;
  onJoin: (event: MeditationEvent) => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onJoin }) => {
  const router = useRouter();
  const eventDate = new Date(event.start_time);
  const traditionObj = FAITH_TRADITIONS.find(t => t.id === event.tradition) || FAITH_TRADITIONS[0];
  
  const formatDate = (date: Date): string => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString();
    
    if (isToday) {
      return 'Today';
    } else if (isTomorrow) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
  };
  
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const isHappeningNow = (): boolean => {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(startTime.getTime() + event.duration * 60000);
    return now >= startTime && now <= endTime;
  };
  
  const getTimeUntil = (): string | null => {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const diffMs = startTime.getTime() - now.getTime();
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
  
  const handlePress = () => {
    router.push(`/meditation/${event.id}`);
  };
  
  const isSystemEvent = 
    event.title.includes("Daily Sunrise") || 
    event.title.includes("Midday Mindfulness") || 
    event.title.includes("Sunset Reflection") || 
    event.title.includes("Midnight Stillness");

  return (
    <TouchableOpacity 
      style={[
        styles.eventCard, 
        isSystemEvent && styles.systemEventCard
      ]} 
      onPress={handlePress} 
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.traditionIcon, { backgroundColor: traditionObj.color }]}>
          <Ionicons name={traditionObj.icon as any} size={20} color={COLORS.white} />
        </View>
        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateText}>{formatDate(eventDate)}</Text>
          <Text style={styles.timeText}>{formatTime(eventDate)}</Text>
          {isHappeningNow() ? (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE NOW</Text>
            </View>
          ) : getTimeUntil() ? (
            <Text style={styles.countdownText}>{getTimeUntil()}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.titleContainer}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          {event.is_recurring && (
            <Ionicons name="repeat" size={16} color={COLORS.secondary} style={styles.recurringIcon} />
          )}
          {isSystemEvent && (
            <Ionicons name="star" size={16} color="#FFD700" style={styles.recurringIcon} />
          )}
        </View>
        {event.description ? (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}
        <View style={styles.eventDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color={COLORS.gray} />
            <Text style={styles.detailText}>{event.duration} min</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={16} color={COLORS.gray} />
            <Text style={styles.detailText}>
              {event.participant_count || 0} {event.participant_count === 1 ? 'person' : 'people'}
            </Text>
          </View>
          {event.is_global && (
            <View style={styles.detailItem}>
              <Ionicons name="globe-outline" size={16} color={COLORS.gray} />
              <Text style={styles.detailText}>Global</Text>
            </View>
          )}
          {event.is_recurring && (
            <View style={styles.detailItem}>
              <Ionicons name="repeat-outline" size={16} color={COLORS.gray} />
              <Text style={styles.detailText}>
                {event.recurrence_type === 'daily' ? 'Daily' : 
                 event.recurrence_type === 'weekly' ? 'Weekly' : 'Monthly'}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Button variant="secondary" size="small" onPress={() => onJoin(event)}>
          {isHappeningNow() ? 'Join Now' : 'Details'}
        </Button>
      </View>
    </TouchableOpacity>
  );
};

interface DateHeaderProps {
  date: string;
}

const DateHeader: React.FC<DateHeaderProps> = ({ date }) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === date.toDateString();
    
    if (isToday) {
      return 'Today';
    } else if (isTomorrow) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    }
  };
  
  return (
    <View style={styles.dateHeader}>
      <Text style={styles.dateHeaderText}>{formatDate(date)}</Text>
      <View style={styles.dateHeaderLine} />
    </View>
  );
};

export default function EventsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<MeditationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [eventSections, setEventSections] = useState<EventSection[]>([]);
  const { colors } = useTheme();
  
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Get current date for filtering
      const now = new Date();
      const nowISOString = now.toISOString();
      
      // Set the upper limit date (30 days from now)
      const upperLimitDate = new Date();
      upperLimitDate.setDate(upperLimitDate.getDate() + 30);
      const upperLimitISOString = upperLimitDate.toISOString();
      
      // 1. Fetch non-recurring events that are upcoming (start_time >= now)
      let nonRecurringEvents = [];
      const { data: fetchedNonRecurringEvents, error: nonRecurringError } = await supabase
        .from('meditation_events')
        .select('*')
        .gte('start_time', nowISOString)
        .lt('start_time', upperLimitISOString)
        .eq('is_recurring', false)
        .order('start_time', { ascending: true });

      if (nonRecurringError) {
        console.error('Error fetching non-recurring events:', nonRecurringError);
      } else {
        nonRecurringEvents = fetchedNonRecurringEvents || [];
      }
      
      // 2. Fetch recurring events separately (we'll handle their recurrence in a more optimized way)
      let recurringEventsBase = [];
      const { data: fetchedRecurringEvents, error: recurringError } = await supabase
        .from('meditation_events')
        .select('*')
        .eq('is_recurring', true)
        .order('start_time', { ascending: true });

      if (recurringError) {
        console.error('Error fetching recurring events:', recurringError);
      } else {
        recurringEventsBase = fetchedRecurringEvents || [];
      }

      // 3. Fetch participant counts in a single batch query
      const allEvents = [...(nonRecurringEvents || []), ...(recurringEventsBase || [])];
      const eventIds = allEvents.map(event => event.id);
      
      let participantCountMap = {};
      
      if (eventIds.length > 0) {
        const { data: participantCounts, error: countsError } = await supabase
          .rpc('get_participant_counts_by_events', { event_ids: eventIds });
  
        if (!countsError && participantCounts) {
          // Convert results to a Map for easy lookup
          participantCountMap = participantCounts.reduce((acc, item) => {
            acc[item.event_id] = item.count;
            return acc;
          }, {});
        }
      }
      
      // Apply participant counts to non-recurring events
      const nonRecurringEventsWithCounts = (nonRecurringEvents || []).map(event => ({
        ...event,
        participant_count: participantCountMap[event.id] || 0
      }));
      
      // Handle recurring events more efficiently
      const recurringEvents = [];
      
      // Get dates for the next 30 days
      const dates = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0); // Normalize to start of day
        dates.push(date);
      }
      
      // Process each recurring event
      (recurringEventsBase || []).forEach(baseEvent => {
        const originalStartDate = new Date(baseEvent.start_time);
        const originalDayOfWeek = originalStartDate.getDay();
        const originalDayOfMonth = originalStartDate.getDate();
        const originalHour = originalStartDate.getHours();
        const originalMinute = originalStartDate.getMinutes();
        
        // Only generate occurrences for the next 7 days for better performance
        // (we can load more on demand as the user scrolls)
        const limitedDates = dates.slice(0, 7);
        
        limitedDates.forEach(date => {
          let shouldShowOnThisDate = false;
          
          if (baseEvent.recurrence_type === 'daily') {
            shouldShowOnThisDate = true;
          } 
          else if (baseEvent.recurrence_type === 'weekly') {
            shouldShowOnThisDate = (date.getDay() === originalDayOfWeek);
          } 
          else if (baseEvent.recurrence_type === 'monthly') {
            shouldShowOnThisDate = (date.getDate() === originalDayOfMonth);
          }
          
          if (!shouldShowOnThisDate) return;
          
          // Create a new instance of the event for this date
          const newStartTime = new Date(date);
          newStartTime.setHours(originalHour, originalMinute, 0, 0);
          
          // Skip if this event time is in the past for today
          if (newStartTime < now && date.getDate() === now.getDate()) return;
          
          // Create a cloned event with the new start time
          const instanceId = `${baseEvent.id}-${newStartTime.toISOString()}`;
          const clonedEvent = { 
            ...baseEvent,
            start_time: newStartTime.toISOString(),
            id: instanceId,
            participant_count: participantCountMap[baseEvent.id] || 0
          };
          
          recurringEvents.push(clonedEvent);
        });
      });
      
      // Combine all events
      const allProcessedEvents = [...nonRecurringEventsWithCounts, ...recurringEvents];
      
      // Group events by date more efficiently
      const grouped = {};
      
      allProcessedEvents.forEach(event => {
        const dateKey = new Date(event.start_time).toISOString().split('T')[0];
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      });
      
      // Convert to sections and sort
      const sections = Object.keys(grouped)
        .sort()
        .map(date => ({
          title: date,
          data: grouped[date].sort((a, b) => 
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          ),
        }));
      
      setEventSections(sections);
      setEvents(allProcessedEvents);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Refresh events when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchEvents();
    }, [])
  );
  
  // Initial load
  useEffect(() => {
    fetchEvents();
  }, []);
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };
  
  const handleJoinEvent = (event: MeditationEvent) => {
    // Extract the original event ID (removing the date-specific suffix)
    const originalId = event.id.split('-')[0];
    
    if (isHappeningNow(event.start_time, event.duration)) {
      // If event is happening now, go directly to sync
      router.push(`/meditation/sync?id=${originalId}&duration=${event.duration}`);
    } else {
      // Otherwise go to details page
      router.push(`/meditation/${originalId}`);
    }
  };

  const isHappeningNow = (startTime: string, duration: number): boolean => {
    const now = new Date();
    const eventStart = new Date(startTime);
    const eventEnd = new Date(eventStart.getTime() + duration * 60000);
    return now >= eventStart && now <= eventEnd;
  };
  
  const handleCreateEvent = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to create a meditation event.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => router.push('/auth/sign-in') }
        ]
      );
      return;
    }
    
    try {
      router.push({
        pathname: 'events/create'
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Navigation Error', 'Could not navigate to create event page');
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={60} color={COLORS.lightGray} />
      <Text style={styles.emptyTitle}>No Upcoming Events</Text>
      <Text style={styles.emptySubtitle}>
        There are no scheduled meditation events at this time.
      </Text>
      <Button variant="primary" onPress={handleCreateEvent} style={styles.createButton}>
        Create an Event
      </Button>
    </View>
  );
  
  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.gray }]}>Loading events...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Upcoming Sessions</Text>
        <View style={styles.headerButtonsContainer}>
          <TouchableOpacity 
            style={[styles.iconButton]} 
            onPress={onRefresh} 
            activeOpacity={0.7}
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={24} 
              color={colors.primary} 
              style={{ opacity: refreshing ? 0.5 : 1 }}
            />
            {refreshing && (
              <ActivityIndicator 
                size="small" 
                color={colors.primary} 
                style={styles.refreshIndicator} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.createEventButton, { backgroundColor: colors.secondary }]} 
            onPress={handleCreateEvent} 
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={20} color={colors.white} />
            <Text style={[styles.createEventText, { color: colors.white }]}>Create</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {eventSections.length > 0 ? (
        <SectionList
          sections={eventSections}
          renderItem={({ item }) => <EventCard event={item} onJoin={handleJoinEvent} />}
          renderSectionHeader={({ section: { title } }) => <DateHeader date={title} />}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState()}
        />
      ) : (
        <View style={styles.emptyStateWrapper}>
          {renderEmptyState()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  createEventText: {
    fontWeight: '600',
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  eventsList: {
    paddingBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: 10,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 20,
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  traditionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateTimeContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.white,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  countdownText: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  cardBody: {
    padding: 15,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 10,
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 4,
  },
  cardFooter: {
    padding: 15,
    paddingTop: 0,
    alignItems: 'flex-start',
  },
  emptyStateWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.accent,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    marginTop: 15,
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recurringIcon: {
    marginLeft: 5,
  },
  refreshIndicator: {
    marginLeft: 5,
  },
  listContent: {
    paddingBottom: 20,
  },
  systemEventCard: {
    backgroundColor: COLORS.background,
    borderLeftColor: COLORS.accent,
    borderLeftWidth: 30,
  },
});