import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { supabase } from '@/src/api/supabase';
import Button from '@/src/components/common/Button';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';

// Define interfaces
interface CommunityStats {
  total_users: number;
  active_now: number;
  total_sessions: number;
  global_minutes: number;
}

interface CommunityTradition {
  tradition: string;
  count: number;
}

interface GlobalActivity {
  time: string;
  count: number;
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<CommunityStats>({
    total_users: 0,
    active_now: 0,
    total_sessions: 0,
    global_minutes: 0
  });
  const [traditions, setTraditions] = useState<CommunityTradition[]>([]);
  const [globalActivity, setGlobalActivity] = useState<GlobalActivity[]>([]);

  // Fetch community data (in a real app, this would call actual Supabase functions)
  const fetchCommunityData = async () => {
    try {
      setLoading(true);

      // For now, we'll use mock data since the RPC functions may not exist yet
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock stats data
      setStats({
        total_users: 1248,
        active_now: 37,
        total_sessions: 8542,
        global_minutes: 428760 // About 7,146 hours
      });

      // Mock tradition distribution
      setTraditions([
        { tradition: 'secular', count: 523 },
        { tradition: 'buddhist', count: 312 },
        { tradition: 'christian', count: 205 },
        { tradition: 'hindu', count: 98 },
        { tradition: 'islamic', count: 58 }
      ]);

      // Generate mock activity data
      setGlobalActivity(generateMockActivityData());

    } catch (error) {
      console.error('Error in fetchCommunityData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Generate mock activity data
  const generateMockActivityData = (): GlobalActivity[] => {
    const hours = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now);
      hour.setHours(now.getHours() - i);
      
      hours.push({
        time: hour.toLocaleTimeString([], { hour: '2-digit' }),
        count: Math.floor(Math.random() * 50) + 10
      });
    }
    
    return hours;
  };

  // Load data on mount
  useEffect(() => {
    fetchCommunityData();
  }, []);

  // Handle refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchCommunityData();
  };

  // Handle join global session
  const handleJoinGlobal = () => {
    router.push('/meditation/sync?id=global&duration=20');
  };

  // Render tradition card
  const renderTraditionCard = (tradition: CommunityTradition) => {
    const traditionObj = FAITH_TRADITIONS.find(t => t.id === tradition.tradition) || FAITH_TRADITIONS[0];
    
    return (
      <View key={tradition.tradition} style={styles.traditionCard}>
        <View style={[COMMON_STYLES.iconContainer, { backgroundColor: traditionObj.color }]}>
          <Ionicons name={traditionObj.icon as any} size={24} color="white" />
        </View>
        <View style={styles.traditionContent}>
          <Text style={styles.traditionName}>{traditionObj.name}</Text>
          <Text style={styles.traditionCount}>{tradition.count} meditators</Text>
        </View>
      </View>
    );
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={COMMON_STYLES.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={COMMON_STYLES.loadingText}>Loading community data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={COMMON_STYLES.container}
      contentContainerStyle={COMMON_STYLES.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[COLORS.primary]}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Community Header */}
      <View style={styles.header}>
        <Text style={COMMON_STYLES.title}>Global Meditation Community</Text>
        <Text style={COMMON_STYLES.subtitle}>
          Connect with meditators around the world
        </Text>
      </View>

      {/* Community Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.active_now.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Meditating Now</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total_users.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Community Size</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total_sessions.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {Math.floor(stats.global_minutes / 60).toLocaleString()}h
          </Text>
          <Text style={styles.statLabel}>Total Hours</Text>
        </View>
      </View>

      {/* Global Activity */}
      <View style={COMMON_STYLES.section}>
        <Text style={COMMON_STYLES.sectionTitle}>Global Activity</Text>
        <View style={styles.activityContainer}>
          <View style={styles.activityChart}>
            {globalActivity.map((activity, index) => (
              <View key={index} style={styles.activityBarContainer}>
                <View 
                  style={[
                    styles.activityBar, 
                    { 
                      height: Math.max((activity.count / 50) * 100, 10),
                      backgroundColor: index % 3 === 0 ? COLORS.primary : 
                                      index % 3 === 1 ? COLORS.secondary : 
                                      COLORS.accent
                    }
                  ]} 
                />
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            ))}
          </View>
          <View style={styles.activityLegend}>
            <Text style={styles.activityLegendText}>
              Active meditators over the past 24 hours
            </Text>
          </View>
        </View>
      </View>

      {/* Join Global Session Button */}
      <View style={styles.joinGlobalContainer}>
        <Button
          onPress={handleJoinGlobal}
          variant="primary"
        >
          Join Global Meditation Now
        </Button>
        <Text style={styles.joinGlobalSubtext}>
          {stats.active_now} people are meditating right now
        </Text>
      </View>

      {/* Faith Traditions */}
      <View style={COMMON_STYLES.section}>
        <Text style={COMMON_STYLES.sectionTitle}>Faith Traditions</Text>
        <View style={styles.traditionsContainer}>
          {traditions.map(tradition => renderTraditionCard(tradition))}
        </View>
      </View>

      {/* Community Resources */}
      <View style={COMMON_STYLES.section}>
        <Text style={COMMON_STYLES.sectionTitle}>Resources</Text>
        <View style={COMMON_STYLES.card}>
          <TouchableOpacity style={styles.resourceItem}>
            <Ionicons name="book-outline" size={24} color={COLORS.primary} />
            <Text style={styles.resourceText}>Meditation Guides</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>
          
          <View style={styles.resourceDivider} />
          
          <TouchableOpacity style={styles.resourceItem}>
            <Ionicons name="people-outline" size={24} color={COLORS.primary} />
            <Text style={styles.resourceText}>Discussion Forums</Text>
            <Text style={styles.comingSoonBadge}>Coming Soon</Text>
          </TouchableOpacity>
          
          <View style={styles.resourceDivider} />
          
          <TouchableOpacity style={styles.resourceItem}>
            <Ionicons name="calendar-outline" size={24} color={COLORS.primary} />
            <Text style={styles.resourceText}>Upcoming Events</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// Component-specific styles that aren't shared
const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    margin: 5,
    width: '47%', // Just under half to account for margin
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  activityContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityChart: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    paddingBottom: 20,
  },
  activityBarContainer: {
    flex: 1,
    alignItems: 'center',
  },
  activityBar: {
    width: 8,
    borderRadius: 4,
  },
  activityTime: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 5,
  },
  activityLegend: {
    marginTop: 10,
    alignItems: 'center',
  },
  activityLegendText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
  },
  joinGlobalContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
  joinGlobalSubtext: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
  },
  traditionsContainer: {
    marginBottom: 10,
  },
  traditionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  traditionContent: {
    flex: 1,
  },
  traditionName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  traditionCount: {
    fontSize: 14,
    color: COLORS.gray,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  resourceText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.darkGray,
    marginLeft: 15,
  },
  resourceDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 15,
  },
  comingSoonBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  }
});