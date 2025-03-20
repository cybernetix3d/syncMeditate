import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  RefreshControl,
  ActivityIndicator 
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { useMeditation } from '@/src/context/MeditationProvider';
import { supabase } from '@/src/api/supabase';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import Button from '@/src/components/common/Button';

interface MeditationCardProps {
  title: string;
  subtitle: string;
  duration: number;
  tradition: string;
  participants?: number;
  isGlobal?: boolean;
  eventId: string;
}

const MeditationCard: React.FC<MeditationCardProps> = ({ 
  title, 
  subtitle, 
  duration, 
  tradition,
  participants = 0, 
  isGlobal = false,
  eventId
}) => {
  const router = useRouter();
  const traditionObj = FAITH_TRADITIONS.find(t => t.id === tradition) || FAITH_TRADITIONS[0];

  const navigateToMeditation = () => {
    router.push(`/meditation/sync?id=${eventId}&duration=${duration}`);
  };

  return (
    <TouchableOpacity
      style={styles.meditationCard}
      onPress={navigateToMeditation}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.traditionIcon, { backgroundColor: traditionObj.color }]}>
          <Ionicons name={traditionObj.icon as any} size={20} color="white" />
        </View>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
      </View>
      
      <View style={styles.cardFooter}>
        <View style={styles.cardDetailItem}>
          <Ionicons name="time-outline" size={16} color="#666666" />
          <Text style={styles.cardDetailText}>{duration} min</Text>
        </View>
        
        {isGlobal && (
          <View style={styles.cardDetailItem}>
            <Ionicons name="people-outline" size={16} color="#666666" />
            <Text style={styles.cardDetailText}>{participants} active</Text>
          </View>
        )}
        
        <View style={styles.joinNowButton}>
          <Text style={styles.joinNowText}>Join</Text>
          <Ionicons name="arrow-forward" size={14} color="#1A2151" />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { currentEvent } = useMeditation();
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
  }
  
  interface MeditationCompletion {
    id: string;
    user_id: string;
    event_id: string | null;
    completed_at: string;
    duration: number;
    completed: boolean;
    meditation_events: MeditationEvent | null;
  }
  
  const [globalEvents, setGlobalEvents] = useState<MeditationEvent[]>([]);
  const [recentEvents, setRecentEvents] = useState<MeditationCompletion[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch global meditation events and recent meditation history
  const fetchMeditationData = async () => {
    try {
      setLoading(true);
      
      // Fetch global meditation events
      const { data: eventsData, error: eventsError } = await supabase
        .from('meditation_events')
        .select('*')
        .eq('is_global', true)
        .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('start_time', { ascending: true })
        .limit(5);
        
      if (eventsError) {
        console.error('Error fetching global events:', eventsError);
      } else {
        setGlobalEvents(eventsData || []);
      }

      // Fetch user's recent meditation completions if logged in
      if (user) {
        const { data: completionsData, error: completionsError } = await supabase
          .from('meditation_completions')
          .select(`
            *,
            meditation_events(*)
          `)
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false })
          .limit(5);
          
        if (completionsError) {
          console.error('Error fetching recent completions:', completionsError);
        } else {
          setRecentEvents(completionsData || []);
        }
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
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMeditationData();
  };

  const renderQuickStartSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Start</Text>
      
      <View style={styles.quickStartContainer}>
        <Link 
          href="/meditation/sync?id=quick&duration=5" 
          asChild
        >
          <TouchableOpacity style={styles.quickStartItem} activeOpacity={0.7}>
            <View style={styles.quickStartIconContainer}>
              <Ionicons name="flash" size={24} color="#1A2151" />
            </View>
            <Text style={styles.quickStartText}>5 min</Text>
          </TouchableOpacity>
        </Link>
        
        <Link 
          href="/meditation/sync?id=quick&duration=10" 
          asChild
        >
          <TouchableOpacity style={styles.quickStartItem} activeOpacity={0.7}>
            <View style={styles.quickStartIconContainer}>
              <Ionicons name="leaf" size={24} color="#1A2151" />
            </View>
            <Text style={styles.quickStartText}>10 min</Text>
          </TouchableOpacity>
        </Link>
        
        <Link 
          href="/meditation/sync?id=quick&duration=20" 
          asChild
        >
          <TouchableOpacity style={styles.quickStartItem} activeOpacity={0.7}>
            <View style={styles.quickStartIconContainer}>
              <Ionicons name="moon" size={24} color="#1A2151" />
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
            participants={Math.floor(Math.random() * 100) + 10} // Mock data for now
            isGlobal={true}
            eventId={event.id}
          />
        ))
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="globe" size={40} color="#CCCCCC" />
          <Text style={styles.emptyStateText}>No global meditations scheduled</Text>
          <Text style={styles.emptyStateSubtext}>Check back later for upcoming sessions</Text>
        </View>
      )}
    </View>
  );

  const renderRecentMeditationsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Recent Meditations</Text>
      
      {user && recentEvents.length > 0 ? (
        recentEvents.map((completion) => {
          const event = completion.meditation_events;
          return event ? (
            <MeditationCard
              key={completion.id}
              title={event.title || 'Quick Meditation'}
              subtitle={`Completed on ${new Date(completion.completed_at).toLocaleDateString()}`}
              duration={Math.floor(completion.duration / 60)}
              tradition={event.tradition || 'secular'}
              eventId={event.id || 'quick'}
            />
          ) : null;
        })
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="time" size={40} color="#CCCCCC" />
          <Text style={styles.emptyStateText}>
            {user ? "You haven't meditated yet" : "Sign in to track your meditations"}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {user ? "Start with a quick session above" : "Join the community to save your progress"}
          </Text>
          
          {!user && (
            <Link href="/auth/sign-in" asChild>
              <Button 
                style={styles.signInButton} 
                size="small"
                onPress={() => {}} // Empty function to satisfy TypeScript
              >
                Sign In
              </Button>
            </Link>
          )}
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A2151" />
        <Text style={styles.loadingText}>Loading meditations...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#1A2151']}
          tintColor="#1A2151"
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          {user?.display_name ? `Welcome, ${user.display_name}` : 'Welcome to SyncMeditate'}
        </Text>
        <Text style={styles.subtitleText}>Find peace in synchronized meditation</Text>
      </View>
      
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
    backgroundColor: '#F8F8F8',
  },
  contentContainer: {
    paddingBottom: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    padding: 20,
    paddingTop: 15,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A2151',
  },
  subtitleText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A2151',
    marginBottom: 15,
  },
  quickStartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStartItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickStartIconContainer: {
    backgroundColor: 'rgba(74, 111, 255, 0.1)',
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
    color: '#1A2151',
  },
  meditationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
    color: '#1A2151',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666666',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 12,
  },
  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  cardDetailText: {
    fontSize: 14,
    color: '#666666',
    marginLeft: 4,
  },
  joinNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: 'rgba(74, 111, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  joinNowText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2151',
    marginRight: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 30,
    marginBottom: 15,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2151',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666',
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
    backgroundColor: 'rgba(74, 111, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4A6FFF',
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#1A2151',
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'right',
  },
});