import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { supabase } from '@/src/api/supabase';
import Button from '@/src/components/common/Button';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';

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

interface MeditationEvent {
  duration: number;
}

interface CompletedSession {
  joined_at: string;
  left_at: string;
  meditation_events: MeditationEvent;
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
    global_minutes: 0,
  });
  const [traditions, setTraditions] = useState<CommunityTradition[]>([]);
  const [globalActivity, setGlobalActivity] = useState<GlobalActivity[]>([]);
  const { colors } = useTheme();

  const fetchCommunityData = async () => {
    try {
      setLoading(true);

      // Get total users count from user_profiles
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id');

      if (usersError) {
        console.error('Error fetching total users:', usersError);
      }

      // Get active users (users in ongoing meditation sessions)
      const { data: activeUsers, error: activeError } = await supabase
        .from('meditation_participants')
        .select('id')
        .eq('active', true)
        .is('left_at', null);

      if (activeError) {
        console.error('Error fetching active users:', activeError);
      }

      // Get completed meditation sessions and their durations
      const { data: completedSessions, error: completedError } = await supabase
        .from('meditation_participants')
        .select(`
          id,
          joined_at,
          left_at,
          meditation_events!inner (
            duration
          )
        `)
        .not('left_at', 'is', null); // Sessions that have been completed

      if (completedError) {
        console.error('Error fetching completed sessions:', completedError);
      }

      // Calculate total sessions and minutes
      const totalSessions = completedSessions?.length || 0;
      const globalMinutes = (completedSessions as CompletedSession[] | null)?.reduce((acc, session) => {
        if (session.joined_at && session.left_at && session.meditation_events?.duration) {
          const joinedAt = new Date(session.joined_at);
          const leftAt = new Date(session.left_at);
          const actualDuration = Math.floor((leftAt.getTime() - joinedAt.getTime()) / 60000); // Convert to minutes
          return acc + Math.min(actualDuration, session.meditation_events.duration);
        }
        return acc;
      }, 0) || 0;

      // Get tradition distribution from user_profiles
      const { data: traditionsData, error: traditionsError } = await supabase
        .from('user_profiles')
        .select('preferred_tradition')
        .not('preferred_tradition', 'is', null);

      if (traditionsError) {
        console.error('Error fetching traditions:', traditionsError);
      }

      // Count traditions
      const traditionCounts: { [key: string]: number } = {};
      traditionsData?.forEach(profile => {
        if (profile.preferred_tradition) {
          traditionCounts[profile.preferred_tradition] = (traditionCounts[profile.preferred_tradition] || 0) + 1;
        }
      });

      // Convert to array and sort by count
      const traditionArray = Object.entries(traditionCounts)
        .map(([tradition, count]) => ({ tradition, count }))
        .sort((a, b) => b.count - a.count);

      // Get hourly activity data for the last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data: activityData, error: activityError } = await supabase
        .from('meditation_participants')
        .select('joined_at')
        .gte('joined_at', twentyFourHoursAgo.toISOString())
        .eq('active', true)
        .is('left_at', null);

      if (activityError) {
        console.error('Error fetching activity data:', activityError);
      }

      // Process activity data into hourly buckets
      const activityByHour: { [hour: string]: number } = {};
      const now = new Date();
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now);
        hour.setHours(now.getHours() - i);
        const hourKey = hour.toLocaleTimeString([], { hour: '2-digit' });
        activityByHour[hourKey] = 0;
      }

      activityData?.forEach(activity => {
        const activityHour = new Date(activity.joined_at)
          .toLocaleTimeString([], { hour: '2-digit' });
        activityByHour[activityHour] = (activityByHour[activityHour] || 0) + 1;
      });

      const hourlyActivity = Object.entries(activityByHour)
        .map(([time, count]) => ({ time, count }));

      setStats({
        total_users: users?.length || 0,
        active_now: activeUsers?.length || 0,
        total_sessions: totalSessions,
        global_minutes: globalMinutes,
      });
      setTraditions(traditionArray);
      setGlobalActivity(hourlyActivity);

      console.log('Community Stats:', {
        users: users?.length,
        activeUsers: activeUsers?.length,
        totalSessions,
        globalMinutes,
        traditions: traditionArray,
      });
    } catch (error) {
      console.error('Error in fetchCommunityData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockActivityData = (): GlobalActivity[] => {
    const hours = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now);
      hour.setHours(now.getHours() - i);
      hours.push({
        time: hour.toLocaleTimeString([], { hour: '2-digit' }),
        count: Math.floor(Math.random() * 50) + 10,
      });
    }
    return hours;
  };

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommunityData();
  };

  const handleJoinGlobal = () => {
    router.push('/meditation/sync?id=global&duration=20');
  };

  const renderTraditionCard = (tradition: CommunityTradition) => {
    const traditionObj =
      FAITH_TRADITIONS.find(t => t.id === tradition.tradition) || FAITH_TRADITIONS[0];
    return (
      <View key={tradition.tradition} style={styles.traditionCard}>
        <View style={[COMMON_STYLES.iconContainer, { backgroundColor: traditionObj.color }]}>
          <Ionicons name={traditionObj.icon as any} size={24} color={COLORS.white} />
        </View>
        <View style={styles.traditionContent}>
          <Text style={styles.traditionName}>{traditionObj.name}</Text>
          <Text style={styles.traditionCount}>{tradition.count} meditators</Text>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.gray }]}>Loading community data...</Text>
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.headerText }]}>Global Meditation Community</Text>
        <Text style={[styles.subtitle, { color: colors.subtitleText }]}>
          Connect with meditators around the world
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.active_now.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.gray }]}>Meditating Now</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total_users.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.gray }]}>Community Size</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total_sessions.toLocaleString()}</Text>
          <Text style={[styles.statLabel, { color: colors.gray }]}>Sessions</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {Math.floor(stats.global_minutes / 60).toLocaleString()}h
          </Text>
          <Text style={[styles.statLabel, { color: colors.gray }]}>Total Hours</Text>
        </View>
      </View>

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
                      backgroundColor:
                        index % 3 === 0
                          ? COLORS.primary
                          : index % 3 === 1
                          ? COLORS.secondary
                          : COLORS.accent,
                    },
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

      <View style={styles.joinGlobalContainer}>
        <Button onPress={handleJoinGlobal} variant="primary">
          Join Global Meditation Now
        </Button>
        <Text style={styles.joinGlobalSubtext}>
          {stats.active_now} people are meditating right now
        </Text>
      </View>

      <View style={COMMON_STYLES.section}>
        <Text style={COMMON_STYLES.sectionTitle}>Faith Traditions</Text>
        <View style={styles.traditionsContainer}>
          {traditions.map(tradition => renderTraditionCard(tradition))}
        </View>
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
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
    width: '47%',
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
    backgroundColor: 'rgba(212,163,115,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
  },
  contentContainer: {
    padding: 20,
  },
});
