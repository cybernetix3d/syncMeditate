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
import WorldMapWithTimezones from '@/src/components/community/WorldMapWithTimezones';

/** Data interfaces */
interface CommunityStats {
  total_users: number;
  active_now: number;
  total_sessions: number;
  global_minutes: number;
}

interface CommunityTradition {
  tradition: string; // stored in meditation_events
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
    global_minutes: 0,
  });

  // List of traditions found in meditation_events
  const [traditions, setTraditions] = useState<CommunityTradition[]>([]);

  // Hourly "activity" data for the last 24 hours
  const [globalActivity, setGlobalActivity] = useState<GlobalActivity[]>([]);

  const { colors } = useTheme();

  /** Pull all needed data for community page */
  const fetchCommunityData = async () => {
    try {
      setLoading(true);

      /** 1) Count total registered users (optional) */
      let totalUsers = 0;
      
      // Get ALL users with a single query
      const { count: userCount, error: countError } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });

      if (countError) {
        console.error('Error counting users:', countError);
      } else {
        // Show actual count if above 10, otherwise show minimum of 10
        totalUsers = Math.max(userCount || 0, 10);
        console.log('Total community size (with minimum):', totalUsers);
      }

      // Log the full data for debugging
      const { data: allUsers, error: debugError } = await supabase
        .from('users')
        .select('id, email, display_name');
      
      if (!debugError) {
        console.log('Debug - All users:', allUsers?.length);
      }

      /** 2) Count how many are currently active (optional) */
      // If you track live participants in a table "meditation_participants"
      let activeNow = 0;
      const { data: activeUsers, error: activeError } = await supabase
        .from('meditation_participants')
        .select('id')
        .eq('active', true)
        .is('left_at', null);
      if (activeError) {
        console.error('Error fetching active participants:', activeError);
      } else {
        activeNow = activeUsers?.length || 0;
      }

      /** 3) Count total sessions:
       *    - Scheduled sessions from meditation_events
       *    - Personal/quick sessions from user_meditation_history
       */
      let totalSessions = 0;

      // 3a) Count from meditation_events
      const { count: eventsCount, error: eventsError } = await supabase
        .from('meditation_events')
        .select('id', { count: 'exact', head: true });
      if (eventsError) {
        console.error('Error counting meditation_events:', eventsError);
      } else {
        totalSessions += eventsCount || 0;
      }

      // 3b) Count from user_meditation_history
      const { data: historyData, count: historyCount, error: historyError } = await supabase
        .from('user_meditation_history')
        .select('id, duration', { count: 'exact', head: false });
      if (historyError) {
        console.error('Error fetching user_meditation_history:', historyError);
      } else {
        totalSessions += historyCount || 0;
      }

      /** 4) Compute total global minutes
       *    from user_meditation_history (which stores duration in SECONDS).
       */
      let globalMinutes = 0;
      if (historyData && Array.isArray(historyData)) {
        // Sum all durations (in seconds), then convert to minutes
        const totalSeconds = historyData.reduce((acc, row) => {
          return acc + (row.duration || 0);
        }, 0);
        globalMinutes = Math.round(totalSeconds / 60);
        console.log('Debug - Total meditation time:', {
          seconds: totalSeconds,
          minutes: globalMinutes,
          hours: Math.round(globalMinutes / 60)
        });
      }

      // Optionally, if you also track minutes from participants or events, add them.
      // For example, if you want to track real-time usage from "meditation_participants":
      //   globalMinutes += someOtherCalculation;

      /** 5) Gather tradition distribution from meditation_events.tradition */
      const { data: eventsTraditions, error: eventsTraditionsError } = await supabase
        .from('meditation_events')
        .select('tradition')
        .not('tradition', 'is', null);
      if (eventsTraditionsError) {
        console.error('Error fetching traditions from meditation_events:', eventsTraditionsError);
      }

      // Count how many events are associated with each tradition
      const traditionCounts: { [key: string]: number } = {};
      eventsTraditions?.forEach((ev) => {
        const t = ev.tradition;
        if (t) {
          traditionCounts[t] = (traditionCounts[t] || 0) + 1;
        }
      });
      // Convert to an array and sort
      const traditionArray = Object.entries(traditionCounts)
        .map(([tradition, count]) => ({ tradition, count }))
        .sort((a, b) => b.count - a.count);

      /** 6) Hourly "activity" for last 24 hours
       *    - If you want to show how many participants joined each hour,
       *      you can query meditation_participants or user_meditation_history, etc.
       *    - Example: Count participants from meditation_participants in last 24h
       */
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const { data: activityData, error: activityError } = await supabase
        .from('meditation_participants')
        .select('joined_at')
        .gte('joined_at', twentyFourHoursAgo.toISOString());
      if (activityError) {
        console.error('Error fetching activity data:', activityError);
      }

      // Bucket by hour
      const activityByHour: { [hour: string]: number } = {};
      // Initialize hours from 24h ago to now
      for (let i = 0; i < 24; i++) {
        const hour = new Date(twentyFourHoursAgo.getTime() + i * 3600000);
        const hourLabel = hour.toLocaleTimeString([], { hour: '2-digit' });
        activityByHour[hourLabel] = 0;
      }
      activityData?.forEach((row) => {
        const hourLabel = new Date(row.joined_at).toLocaleTimeString([], { hour: '2-digit' });
        if (activityByHour[hourLabel] !== undefined) {
          activityByHour[hourLabel] += 1;
        }
      });
      const hourlyActivity = Object.entries(activityByHour).map(([time, count]) => ({
        time,
        count,
      }));

      /** 7) Update state with everything */
      setStats({
        total_users: totalUsers,
        active_now: activeNow,
        total_sessions: totalSessions,
        global_minutes: globalMinutes,
      });
      setTraditions(traditionArray);
      setGlobalActivity(hourlyActivity);
    } catch (error) {
      console.error('Error fetching community data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCommunityData();
  };

  /** Example button to join a "global" session for 20 minutes */
  const handleJoinGlobal = () => {
    router.push('/meditation/sync?id=global&duration=20');
  };

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
      {loading && !refreshing ? (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.gray }]}>Loading community data...</Text>
        </View>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.headerText }]}>
              Global Meditation Community
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtitleText }]}>
              Connect with meditators around the world
            </Text>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.active_now.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.gray }]}>Meditating Now</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.total_users.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.gray }]}>Community Size</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.total_sessions.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: colors.gray }]}>Sessions</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {Math.round(stats.global_minutes / 60).toLocaleString()}h
              </Text>
              <Text style={[styles.statLabel, { color: colors.gray }]}>Total Hours</Text>
            </View>
          </View>

          {/* Global Activity */}
          <View style={COMMON_STYLES.section}>
            <Text style={COMMON_STYLES.sectionTitle}>Global Activity</Text>
            <View style={[styles.activityContainer, { backgroundColor: colors.surface }]}>
              <View style={styles.activityChart}>
                {globalActivity.map((activity, index) => {
                  // Find the maximum count to scale relative to
                  const maxCount = Math.max(...globalActivity.map(a => a.count), 1);
                  // Calculate height as percentage of max (minimum 10% for visibility)
                  const heightPercentage = Math.max((activity.count / maxCount) * 100, 10);
                  
                  return (
                    <View key={index} style={styles.activityBarContainer}>
                      <View
                        style={[
                          styles.activityBar,
                          {
                            height: `${heightPercentage}%`,
                            backgroundColor: activity.count > 0 ? colors.primary : colors.lightGray,
                            opacity: activity.count > 0 ? 1 : 0.5,
                          },
                        ]}
                      />
                      <Text style={[styles.activityTime, { color: colors.gray }]}>
                        {activity.time}
                      </Text>
                      {activity.count > 0 && (
                        <Text style={[styles.activityCount, { color: colors.primary }]}>
                          {activity.count}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <View style={styles.activityLegend}>
                <Text style={[styles.activityLegendText, { color: colors.gray }]}>
                  Meditation activity over the last 24 hours
                </Text>
              </View>
            </View>
          </View>

          {/* World Time Map Section - using real timezone data from Supabase */}
          <View style={COMMON_STYLES.section}>
            <Text style={COMMON_STYLES.sectionTitle}>Global Meditation Map</Text>
            <View style={styles.mapCardContainer}>
              <WorldMapWithTimezones />
            </View>
            <Text style={styles.mapHelper}>
              See participants' local times around the world
            </Text>
          </View>

          {/* Join Global Button */}
          <View style={styles.joinGlobalContainer}>
            <Button onPress={handleJoinGlobal} variant="primary">
              Join Global Meditation Now
            </Button>
            <Text style={styles.joinGlobalSubtext}>
              {stats.active_now} people are meditating right now
            </Text>
          </View>

          {/* Traditions from meditation_events */}
          <View style={COMMON_STYLES.section}>
            <Text style={COMMON_STYLES.sectionTitle}>Faith Traditions</Text>
            <View style={styles.traditionsContainer}>
              {traditions.map((t) => {
                // Try to match the tradition ID to one of the FAITH_TRADITIONS
                const found = FAITH_TRADITIONS.find((x) => x.id === t.tradition) || FAITH_TRADITIONS[0];
                return (
                  <View key={t.tradition} style={styles.traditionCard}>
                    <View style={[COMMON_STYLES.iconContainer, { backgroundColor: found.color }]}>
                      <Ionicons name={found.ionicon} size={24} color={COLORS.white} />
                    </View>
                    <View style={styles.traditionContent}>
                      <Text style={styles.traditionName}>{found.name}</Text>
                      <Text style={styles.traditionCount}>{t.count} events</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Additional Resources (example) */}
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
        </>
      )}
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
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
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
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
  },
  activityContainer: {
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activityChart: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    paddingBottom: 20,
    paddingTop: 20,
  },
  activityBarContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  activityBar: {
    width: 6,
    borderRadius: 3,
    minHeight: 4,
  },
  activityTime: {
    fontSize: 10,
    marginTop: 5,
    transform: [{ rotate: '-45deg' }],
  },
  activityCount: {
    fontSize: 10,
    fontWeight: 'bold',
    position: 'absolute',
    top: -15,
  },
  activityLegend: {
    marginTop: 15,
    alignItems: 'center',
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  activityLegendText: {
    fontSize: 12,
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
    padding: 12,
  },
  resourceText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.primary,
  },
  resourceDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 12,
  },
  comingSoonBadge: {
    fontSize: 12,
    color: COLORS.accent,
    marginLeft: 5,
  },
  mapCardContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    height: 270,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapHelper: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 5,
  },
});
