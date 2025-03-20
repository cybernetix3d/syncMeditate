import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
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

// Event card component
const EventCard: React.FC<EventCardProps> = ({ event, onJoin }) => {
  const router = useRouter();
  const eventDate = new Date(event.start_time);
  const traditionObj = FAITH_TRADITIONS.find(t => t.id === event.tradition) || FAITH_TRADITIONS[0];
  
  // Format date for display
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
  
  // Format time for display
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Check if event is happening now
  const isHappeningNow = (): boolean => {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const endTime = new Date(startTime.getTime() + event.duration * 60000);
    
    return now >= startTime && now <= endTime;
  };
  
  // Calculate time until event
  const getTimeUntil = (): string | null => {
    const now = new Date();
    const startTime = new Date(event.start_time);
    const diffMs = startTime.getTime() - now.getTime();
    
    if (diffMs < 0) return null;
    
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHrs > 24) {
      return null; // Just show the date
    } else if (diffHrs > 0) {
      return `In ${diffHrs}h ${diffMins}m`;
    } else {
      return `In ${diffMins}m`;
    }
  };
  
  // Handle event card tap
  const handlePress = () => {
    router.push(`/meditation/${event.id}`);
  };
  
  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.traditionIcon, { backgroundColor: traditionObj.color }]}>
          <Ionicons name={traditionObj.icon as any} size={20} color="white" />
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
          <Text 
            style={styles.eventDescription}
            numberOfLines={2}
          >
            {event.description}
          </Text>
        ) : null}
        
        <View style={styles.eventDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="time-outline" size={16} color="#666666" />
            <Text style={styles.detailText}>{event.duration} min</Text>
          </View>
          
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={16} color="#666666" />
            <Text style={styles.detailText}>
              {event.participant_count || 0} {event.participant_count === 1 ? 'person' : 'people'}
            </Text>
          </View>
          
          {event.is_global && (
            <View style={styles.detailItem}>
              <Ionicons name="globe-outline" size={16} color="#666666" />
              <Text style={styles.detailText}>Global</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <Button
          variant="secondary"
          size="small"
          onPress={() => onJoin(event)}
        >
          {isHappeningNow() ? 'Join Now' : 'Details'}
        </Button>
      </View>
    </TouchableOpacity>
  );
};

// Date header component for sections
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
  
  // Fetch meditation events
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Get current time
      const now = new Date();
      
      // Get events happening now or in the future
      const { data, error } = await supabase
        .from('meditation_events')
        .select('*')
        .gte('start_time', new Date(now.getTime() - 60 * 60 * 1000).toISOString()) // Include events that started up to 1 hour ago
        .order('start_time', { ascending: true });
        
      if (error) {
        console.error('Error fetching events:', error);
        return;
      }
      
      // For each event, get participant count
      const eventsWithCounts = await Promise.all(
        (data || []).map(async (event) => {
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
      
      // Group events by date
      groupEventsByDate(eventsWithCounts);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Group events by date for section list
  const groupEventsByDate = (events: MeditationEvent[]) => {
    const grouped: Record<string, MeditationEvent[]> = {};
    
    events.forEach(event => {
      const date = new Date(event.start_time).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    
    // Convert to array of sections
    const sections = Object.keys(grouped)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({
        title: date,
        data: grouped[date]
      }));
    
    setEventSections(sections);
  };
  
  useEffect(() => {
    fetchEvents();
  }, []);
  
  // Refresh events list
  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };
  
  // Join an event
  const handleJoinEvent = (event: MeditationEvent) => {
    router.push(`/meditation/sync?id=${event.id}&duration=${event.duration}`);
  };
  
  // Create new event
  const handleCreateEvent = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'You need to sign in to create a meditation event.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Sign In', 
            onPress: () => router.push('/auth/sign-in')
          }
        ]
      );
      return;
    }
    
    // Navigate to event creation screen
    // This will be implemented in future
    Alert.alert('Coming Soon', 'Event creation will be available in a future update.');
  };
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-outline" size={60} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Upcoming Events</Text>
      <Text style={styles.emptySubtitle}>
        There are no scheduled meditation events at this time.
      </Text>
      <Button 
        variant="primary"
        onPress={handleCreateEvent}
        style={styles.createButton}
      >
        Create an Event
      </Button>
    </View>
  );
  
  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A2151" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Upcoming Sessions</Text>
        <TouchableOpacity
          style={styles.createEventButton}
          onPress={handleCreateEvent}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createEventText}>Create</Text>
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
              colors={['#1A2151']}
              tintColor="#1A2151"
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
    backgroundColor: '#F8F8F8',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F8F8',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2151',
  },
  createEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A6FFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  createEventText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
  },
  eventsList: {
    paddingBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F8F8F8',
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2151',
    marginRight: 10,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  eventCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
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
    borderBottomColor: '#F0F0F0',
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
    color: '#1A2151',
  },
  timeText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
  },
  countdownText: {
    fontSize: 12,
    color: '#4A6FFF',
    fontWeight: '600',
  },
  cardBody: {
    padding: 15,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2151',
    marginBottom: 5,
  },
  eventDescription: {
    fontSize: 14,
    color: '#666666',
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
    color: '#666666',
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
    color: '#1A2151',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    marginTop: 10,
  }
});