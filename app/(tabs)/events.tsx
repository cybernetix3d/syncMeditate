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
import { useAuth } from '@/src/context/AuthProvider';
import { supabase } from '@/src/api/supabase';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import Button from '@/src/components/common/Button';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';
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
  
  return (
    <TouchableOpacity style={styles.eventCard} onPress={handlePress} activeOpacity={0.7}>
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
        <Text style={styles.eventTitle}>{event.title}</Text>
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
      const now = new Date();
      
      // Get all future events and recent events
      const { data, error } = await supabase
        .from('meditation_events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      // Only keep events that haven't ended yet
      const activeEvents = (data || []).filter(event => {
        const startTime = new Date(event.start_time);
        const endTime = new Date(startTime.getTime() + event.duration * 60000); // Convert duration from minutes to milliseconds
        return endTime > now; // Only show events that haven't ended yet
      });

      const eventsWithCounts = await Promise.all(
        activeEvents.map(async (event) => {
          const { count, error: countError } = await supabase
            .from('meditation_participants')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', event.id)
            .eq('active', true);
          if (countError) {
            console.error('Error counting participants:', countError);
            return { ...event, participant_count: 0 };
          }
          return { ...event, participant_count: count || 0 };
        })
      );
      
      setEvents(eventsWithCounts);
      groupEventsByDate(eventsWithCounts);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const groupEventsByDate = (events: MeditationEvent[]) => {
    const grouped: Record<string, MeditationEvent[]> = {};
    events.forEach(event => {
      const date = new Date(event.start_time).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    const sections = Object.keys(grouped)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({
        title: date,
        data: grouped[date]
      }));
    setEventSections(sections);
  };
  
  // Refresh events when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Events screen focused, refreshing events');
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
    if (isHappeningNow(event.start_time, event.duration)) {
      // If event is happening now, go directly to sync
      router.push(`/meditation/sync?id=${event.id}&duration=${event.duration}`);
    } else {
      // Otherwise go to details page
      router.push(`/meditation/${event.id}`);
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
    router.push('/events/create');
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
        <TouchableOpacity 
          style={[styles.createEventButton, { backgroundColor: colors.secondary }]} 
          onPress={handleCreateEvent} 
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={[styles.createEventText, { color: colors.white }]}>Create</Text>
        </TouchableOpacity>
      </View>
      
      {eventSections.length > 0 ? (
        <SectionList
          sections={eventSections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard event={item} onJoin={handleJoinEvent} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <DateHeader date={title} />
          )}
          contentContainerStyle={styles.eventsList}
          stickySectionHeadersEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
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
    paddingVertical: 10,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
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
  quotesContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quoteCard: {
    backgroundColor: 'rgba(233,237,201,0.05)',
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
});
