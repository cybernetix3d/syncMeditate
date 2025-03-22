// app/admin/events.tsx
import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SectionList
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthProvider';
import { supabase } from '../../src/api/supabase';
import { COLORS } from '../../src/constants/Styles';
import { useTheme } from '../../src/context/ThemeContext';
import { AdminEventManager } from '../../src/utils/adminEventManager';
import type { UserProfile } from '../../src/context/AuthProvider';

// Type guard function for UserProfile
const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile => {
  return user !== null && typeof user !== 'boolean' && 'id' in user;
};

// Define interfaces for our component
interface SystemEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  duration: number;
  tradition: string | null;
  created_by: string | null;
  is_global: boolean;
  is_recurring?: boolean;  
  recurrence_type?: string;  
  is_system?: boolean;  
}

interface EventSection {
  title: string;
  data: SystemEvent[];
}

export default function AdminEventsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [eventSections, setEventSections] = useState<EventSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Check if user is admin
  const isAdmin = isUserProfile(user) && (user.email === 'timhart.sound@gmail.com' || user.is_admin === true);
  
  useEffect(() => {
    // Set mounted to true to indicate component is mounted
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only attempt navigation after component is mounted
    if (mounted && !isAdmin) {
      Alert.alert('Unauthorized', 'You do not have permission to access the admin panel.');
      // Use setTimeout to delay navigation slightly
      setTimeout(() => {
        router.replace('/');
      }, 100);
      return;
    }
    
    if (mounted && isAdmin) {
      fetchSystemEvents();
    }
  }, [isAdmin, mounted]);
  
  const fetchSystemEvents = async () => {
    try {
      setLoading(true);
      
      // Get events for the next 14 days
      const systemEvents = await AdminEventManager.getSystemEvents();
      
      console.log(`Fetched ${systemEvents.length} system events`);
      setEvents(systemEvents);
      groupEventsByDate(systemEvents);
    } catch (error) {
      console.error('Error fetching system events:', error);
      Alert.alert('Error', 'Failed to load system events');
    } finally {
      setLoading(false);
    }
  };
  
  const groupEventsByDate = (events: SystemEvent[]) => {
    const grouped: Record<string, SystemEvent[]> = {};
    
    events.forEach(event => {
      const startDate = new Date(event.start_time);
      const dateKey = startDate.toISOString().split('T')[0];
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    // Convert to sections and sort
    const sections: EventSection[] = Object.keys(grouped)
      .sort()
      .map(date => ({
        title: date,
        data: grouped[date].sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ),
      }));
    
    setEventSections(sections);
  };
  
  const handleCreateTodayEvents = async () => {
    try {
      // Confirm with user
      Alert.alert(
        'Create Solar Events',
        'This will create or replace all solar events for today. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: async () => {
              try {
                setActionLoading(true);
                const success = await AdminEventManager.createSolarEventsForDate();
                
                if (success) {
                  Alert.alert('Success', 'Solar events created successfully');
                  fetchSystemEvents();
                } else {
                  Alert.alert('Error', 'Failed to create solar events');
                }
              } catch (error) {
                console.error('Error creating solar events:', error);
                Alert.alert('Error', `Failed to create solar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setActionLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleCreateTodayEvents:', error);
      Alert.alert('Error', `Failed to create solar events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleCreateWeekEvents = async () => {
    try {
      console.log("Week events button clicked");
      
      // Confirm with user
      Alert.alert(
        'Create Week of Solar Events',
        'This will create or replace all solar events for the next 7 days. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Continue', 
            onPress: async () => {
              try {
                console.log("User confirmed - starting process");
                setActionLoading(true);
                
                // Log AdminEventManager object to verify it's imported correctly
                console.log("AdminEventManager availability:", 
                  AdminEventManager ? "Available" : "Not available",
                  "createSolarEventsForRange method:", 
                  AdminEventManager?.createSolarEventsForRange ? "Available" : "Not available"
                );
                
                console.log("Calling createSolarEventsForRange");
                const successCount = await AdminEventManager.createSolarEventsForRange();
                console.log(`Creation completed with ${successCount} successful days`);
                
                Alert.alert('Success', `Created solar events for ${successCount} out of 7 days`);
                fetchSystemEvents();
              } catch (error) {
                console.error('Error creating week events:', error);
                Alert.alert('Error', `Failed to create week events: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                console.log("Process finished, setting actionLoading to false");
                setActionLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleCreateWeekEvents:', error);
      Alert.alert('Error', `Failed to create week events: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const handleDeleteEvent = async (eventId: string) => {
    try {
      // Confirm with user
      Alert.alert(
        'Delete System Event',
        'Are you sure you want to delete this system event?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: async () => {
              try {
                setActionLoading(true);
                const success = await AdminEventManager.deleteSystemEvent(eventId);
                
                if (success) {
                  // Update local state for immediate UI update
                  const updatedEvents = events.filter(e => e.id !== eventId);
                  setEvents(updatedEvents);
                  groupEventsByDate(updatedEvents);
                  Alert.alert('Success', 'Event deleted successfully');
                } else {
                  Alert.alert('Error', 'Failed to delete event');
                }
              } catch (error) {
                console.error('Error deleting event:', error);
                Alert.alert('Error', `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setActionLoading(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error in handleDeleteEvent:', error);
      Alert.alert('Error', `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const renderEventItem = ({ item }: { item: SystemEvent }) => {
    const eventDate = new Date(item.start_time);
    const formattedTime = eventDate.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
    
    // Check if this is a recurring event and get the type
    const isRecurring = item.is_recurring || false;
    const recurrenceType = item.recurrence_type || 'daily';
    
    return (
      <View style={[styles.eventCard, { backgroundColor: colors.surface }]}>
        <View style={styles.eventHeader}>
          <Text style={[styles.eventTitle, { color: colors.primary }]}>{item.title}</Text>
          <TouchableOpacity onPress={() => handleDeleteEvent(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#ff3b30" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.eventDetails}>
          <View style={styles.eventDetail}>
            <Ionicons name="time-outline" size={16} color={colors.gray} />
            <Text style={[styles.detailText, { color: colors.bodyText }]}>{formattedTime}</Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="hourglass-outline" size={16} color={colors.gray} />
            <Text style={[styles.detailText, { color: colors.bodyText }]}>{item.duration} min</Text>
          </View>
          
          {/* Display recurrence information if this is a recurring event */}
          {isRecurring && (
            <View style={styles.eventDetail}>
              <Ionicons name="repeat" size={16} color={colors.gray} />
              <Text style={[styles.detailText, { color: colors.bodyText }]}>
                {recurrenceType.charAt(0).toUpperCase() + recurrenceType.slice(1)}
              </Text>
            </View>
          )}
          
          {item.is_global && (
            <View style={styles.eventDetail}>
              <Ionicons name="globe-outline" size={16} color={colors.gray} />
              <Text style={[styles.detailText, { color: colors.bodyText }]}>Global</Text>
            </View>
          )}
        </View>
        
        {item.description && (
          <Text 
            style={[styles.eventDescription, { color: colors.bodyText }]} 
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}
      </View>
    );
  };
  
  const renderSectionHeader = ({ section }: { section: EventSection }) => {
    const date = new Date(section.title);
    const formattedDate = date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    return (
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>{formattedDate}</Text>
        <View style={[styles.sectionDivider, { backgroundColor: colors.gray }]} />
      </View>
    );
  };
  
  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.bodyText }}>Unauthorized access. Redirecting...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.actionBar}>
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            { backgroundColor: colors.primary },
            actionLoading && { opacity: 0.7 }
          ]} 
          onPress={handleCreateTodayEvents}
          disabled={actionLoading}
        >
          <Text style={styles.actionButtonText}>Today's Events</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.actionButton, 
            { backgroundColor: colors.secondary },
            actionLoading && { opacity: 0.7 }
          ]} 
          onPress={handleCreateWeekEvents}
          disabled={actionLoading}
        >
          <Text style={styles.actionButtonText}>Week of Events</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.createButton, 
            { backgroundColor: COLORS.accent },
          ]} 
          onPress={() => router.push('/admin/create')}
        >
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={styles.actionButtonText}>Create Custom</Text>
        </TouchableOpacity>
      </View>
      
      {actionLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.bodyText }]}>
            Processing...
          </Text>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.gray }]}>
            Loading system events...
          </Text>
        </View>
      ) : (
        <SectionList
          sections={eventSections}
          keyExtractor={(item) => item.id}
          renderItem={renderEventItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color={colors.gray} />
              <Text style={[styles.emptyText, { color: colors.bodyText }]}>
                No system events found
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.gray }]}>
                Use the buttons above to create events
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionBar: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  sectionHeader: {
    padding: 15,
    paddingBottom: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDivider: {
    height: 1,
    marginTop: 8,
  },
  eventCard: {
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 8,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 5,
  },
  eventDescription: {
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
});