import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Image,
  ActivityIndicator,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import Button from '@/src/components/common/Button';
import type { UserProfile } from '@/src/context/AuthProvider';
import { supabase } from '@/src/api/supabase';

// Improved type guard function
const isUserProfile = (user: null | boolean | UserProfile): user is UserProfile => {
  return user !== null && typeof user !== 'boolean' && 'id' in user;
};

interface UserStats {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lastSessionDate: string | null;
  badges: Badge[];
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  achieved: boolean;
  progress?: number;
  maxProgress?: number;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isDark, colors } = useTheme();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate streak from session dates
  const calculateStreak = (sessionDates: string[]): { currentStreak: number, longestStreak: number } => {
    if (!sessionDates.length) return { currentStreak: 0, longestStreak: 0 };
    
    // Sort dates in descending order (newest first)
    const sortedDates = [...sessionDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    // Check if there's a session today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const latestSessionDate = new Date(sortedDates[0]);
    latestSessionDate.setHours(0, 0, 0, 0);
    
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const daysSinceLastSession = Math.floor((today.getTime() - latestSessionDate.getTime()) / millisecondsPerDay);
    
    // If the latest session is more than 1 day ago, current streak is broken
    if (daysSinceLastSession > 1) {
      // Find the longest streak from history
      let longestStreak = 0;
      let currentRun = 1;
      
      for (let i = 0; i < sortedDates.length - 1; i++) {
        const current = new Date(sortedDates[i]);
        const next = new Date(sortedDates[i + 1]);
        current.setHours(0, 0, 0, 0);
        next.setHours(0, 0, 0, 0);
        
        const daysBetween = Math.floor((current.getTime() - next.getTime()) / millisecondsPerDay);
        
        if (daysBetween === 1) {
          // Consecutive days
          currentRun++;
        } else if (daysBetween === 0) {
          // Same day, don't increment streak
          continue;
        } else {
          // Streak broken
          longestStreak = Math.max(longestStreak, currentRun);
          currentRun = 1;
        }
      }
      
      longestStreak = Math.max(longestStreak, currentRun);
      return { currentStreak: 0, longestStreak };
    }
    
    // Calculate current streak (which is also potentially the longest streak)
    let currentStreak = 1;
    let longestStreak = 1;
    let previousDate = latestSessionDate;
    
    // Skip same-day entries
    let i = 1;
    while (i < sortedDates.length) {
      const currentDate = new Date(sortedDates[i]);
      currentDate.setHours(0, 0, 0, 0);
      
      // If it's the same day as the previous entry, skip it
      if (currentDate.getTime() === previousDate.getTime()) {
        i++;
        continue;
      }
      
      const daysBetween = Math.floor((previousDate.getTime() - currentDate.getTime()) / millisecondsPerDay);
      
      if (daysBetween === 1) {
        // Consecutive day
        currentStreak++;
        previousDate = currentDate;
      } else {
        // Streak broken
        break;
      }
      
      i++;
    }
    
    longestStreak = Math.max(currentStreak, longestStreak);
    return { currentStreak, longestStreak };
  };

  // Determine badges based on user activity
  const calculateBadges = (
    sessionCount: number, 
    currentStreak: number,
    hasGlobalEvent: boolean
  ): Badge[] => {
    const badges: Badge[] = [
      {
        id: '1',
        name: 'First Timer',
        description: 'Completed your first meditation session',
        icon: 'star-outline',
        achieved: sessionCount >= 1
      },
      {
        id: '2',
        name: 'Week Warrior',
        description: 'Meditated for 7 consecutive days',
        icon: 'flame-outline',
        achieved: currentStreak >= 7
      },
      {
        id: '3',
        name: 'Zen Master',
        description: 'Meditated for 30 consecutive days',
        icon: 'flower-outline',
        achieved: currentStreak >= 30,
        progress: Math.min(currentStreak, 30),
        maxProgress: 30
      },
      {
        id: '4',
        name: 'Global Connection',
        description: 'Joined a global meditation event',
        icon: 'globe-outline',
        achieved: hasGlobalEvent
      },
      {
        id: '5',
        name: 'Discipline',
        description: 'Completed 50 meditation sessions',
        icon: 'medal-outline',
        achieved: sessionCount >= 50,
        progress: Math.min(sessionCount, 50),
        maxProgress: 50
      }
    ];
    
    return badges;
  };

  // Fetch user stats
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!isUserProfile(user)) return;
      
      try {
        setLoading(true);
        
        // Fetch all user meditation sessions from both tables
        const [completionsResult, historyResult] = await Promise.all([
          // Fetch from meditation_completions (newer system)
          supabase
            .from('meditation_completions')
            .select('user_id, duration, completed_at, event_id, meditation_type')
            .eq('user_id', user.id),
          
          // Fetch from user_meditation_history (older system)
          supabase
            .from('user_meditation_history')
            .select('user_id, duration, date, event_id')
            .eq('user_id', user.id)
        ]);
        
        if (completionsResult.error) {
          console.error('Error fetching meditation_completions:', completionsResult.error);
        }
        
        if (historyResult.error) {
          console.error('Error fetching user_meditation_history:', historyResult.error);
        }
        
        // Process completions data
        const completions = completionsResult.data || [];
        const history = historyResult.data || [];
        
        // Combine both sources for total counts
        const totalSessions = completions.length + history.length;
        
        // Total minutes - Note: Completions duration is in minutes, history is in seconds
        const completionsMinutes = completions.reduce((total, item) => total + (item.duration || 0), 0);
        const historyMinutes = history.reduce((total, item) => total + ((item.duration || 0) / 60), 0);
        const totalMinutes = Math.round(completionsMinutes + historyMinutes);
        
        // Get all session dates for streak calculation
        const completionDates = completions.map(item => item.completed_at || new Date().toISOString());
        const historyDates = history.map(item => item.date || new Date().toISOString());
        const allSessionDates = [...completionDates, ...historyDates];
        
        // Calculate streak
        const { currentStreak, longestStreak } = calculateStreak(allSessionDates);
        
        // Check if user has joined a global event
        const hasGlobalEvent = await checkGlobalEventParticipation(user.id);
        
        // Calculate badges
        const badges = calculateBadges(totalSessions, currentStreak, hasGlobalEvent);
        
        // Get last session date
        const lastSessionDate = allSessionDates.length > 0 
          ? allSessionDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
          : null;
        
        // Set user stats
        setStats({
          totalSessions,
          totalMinutes,
          currentStreak,
          longestStreak,
          lastSessionDate,
          badges
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
        Alert.alert('Error', 'Failed to load meditation statistics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserStats();
  }, [user]);

  // Check if user has participated in global events
  const checkGlobalEventParticipation = async (userId: string): Promise<boolean> => {
    try {
      // Check meditation_participants for global events
      const { data, error } = await supabase
        .from('meditation_participants')
        .select('event_id')
        .eq('user_id', userId)
        .limit(1);
      
      if (error) {
        console.error('Error checking global event participation:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Error in checkGlobalEventParticipation:', error);
      return false;
    }
  };

  const navigateToSettings = () => {
    try {
      router.push('/settings');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Could not navigate to settings: ' + String(error));
    }
  };

  // Add navigation to edit profile
  const navigateToEditProfile = () => {
    try {
      router.push('/settings/profile');
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Error', 'Could not navigate to profile settings: ' + String(error));
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Add sign out handler
  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/sign-in');
            } catch (error: any) {
              console.error('Sign out error:', error);
              Alert.alert('Error', error.message || 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.gray }]}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.headerText }]}>Profile</Text>
        <TouchableOpacity 
          onPress={navigateToSettings} 
          style={[styles.settingsButton, { 
            backgroundColor: colors.primary,
            borderRadius: 20,
            paddingVertical: 8,
            paddingHorizontal: 16,
          }]}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={22} color={colors.white} />
          <Text style={[styles.settingsButtonText, { color: colors.white, fontWeight: 'bold' }]}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
            {isUserProfile(user) && user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.profileInitial}>
                {isUserProfile(user) && user.display_name ? user.display_name[0].toUpperCase() : '?'}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={[styles.profileName, { color: colors.headerText }]}>
                {isUserProfile(user) && user.display_name ? user.display_name : 'Anonymous User'}
              </Text>
              <TouchableOpacity 
                onPress={navigateToEditProfile}
                style={[styles.editProfileButton, { backgroundColor: colors.lightGray }]}
              >
                <Ionicons name="pencil" size={14} color={colors.gray} />
                <Text style={[styles.editProfileText, { color: colors.gray, marginLeft: 4 }]}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.profileEmail, { color: colors.gray }]}>
              {isUserProfile(user) && user.email ? user.email : 'No email associated'}
            </Text>
            
            {stats && (
              <View style={styles.badgesRow}>
                {stats.badges
                  .filter(badge => badge.achieved)
                  .slice(0, 3)
                  .map((badge) => (
                    <View key={badge.id} style={[styles.badgeIcon, { backgroundColor: colors.accent }]}>
                      <Ionicons name={badge.icon as any} size={14} color={colors.white} />
                    </View>
                  ))}
                {stats.badges.filter(badge => badge.achieved).length > 3 && (
                  <View style={[styles.badgeMore, { backgroundColor: colors.lightGray }]}>
                    <Text style={[styles.badgeMoreText, { color: colors.gray }]}>
                      +{stats.badges.filter(badge => badge.achieved).length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Stats Section */}
        {stats && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Meditation Stats</Text>
            
            <View style={[styles.statsGrid, { backgroundColor: colors.surface }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.headerText }]}>{stats.totalSessions}</Text>
                <Text style={[styles.statLabel, { color: colors.gray }]}>Sessions</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.headerText }]}>{formatDuration(stats.totalMinutes)}</Text>
                <Text style={[styles.statLabel, { color: colors.gray }]}>Total Time</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.headerText }]}>{stats.currentStreak}</Text>
                <Text style={[styles.statLabel, { color: colors.gray }]}>Day Streak</Text>
              </View>
            </View>
          </View>
        )}

        {/* Badges Section */}
        {stats && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Achievements</Text>
            
            <View style={[styles.badgesCard, { backgroundColor: colors.surface }]}>
              {stats.badges.map((badge) => (
                <View key={badge.id} style={styles.badgeItem}>
                  <View 
                    style={[
                      styles.badgeIconLarge, 
                      { 
                        backgroundColor: badge.achieved ? colors.accent : colors.lightGray,
                        opacity: badge.achieved ? 1 : 0.6
                      }
                    ]}
                  >
                    <Ionicons name={badge.icon as any} size={22} color={badge.achieved ? colors.white : colors.gray} />
                  </View>
                  <View style={styles.badgeInfo}>
                    <Text style={[styles.badgeName, { color: colors.headerText }]}>
                      {badge.name}
                    </Text>
                    <Text style={[styles.badgeDescription, { color: colors.gray }]}>
                      {badge.description}
                    </Text>
                    {!badge.achieved && badge.progress !== undefined && (
                      <View style={[styles.progressBar, { backgroundColor: colors.lightGray }]}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              backgroundColor: colors.accent,
                              width: `${(badge.progress / (badge.maxProgress || 1)) * 100}%`
                            }
                          ]} 
                        />
                      </View>
                    )}
                  </View>
                  {badge.achieved && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Activity Calendar - Placeholder */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Recent Activity</Text>
          
          <View style={[styles.calendarCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.comingSoonText, { color: colors.gray }]}>
              Activity calendar coming soon!
            </Text>
          </View>
        </View>

        {(!isUserProfile(user) || !user.email) && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.upgradeCard, { backgroundColor: colors.secondary }]}
              onPress={() => router.push('/auth/sign-up')}
            >
              <Ionicons name="rocket-outline" size={24} color={colors.white} style={styles.upgradeIcon} />
              <View style={styles.upgradeTextContainer}>
                <Text style={styles.upgradeTitle}>Upgrade to Full Account</Text>
                <Text style={styles.upgradeDescription}>
                  Save your progress, earn more badges, and access premium features
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={[styles.signOutButton, { 
              backgroundColor: colors.surface,
              borderColor: colors.primary,
              borderWidth: 2,
            }]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.signOutText, { color: colors.primary, fontWeight: 'bold' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  badgeMore: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeMoreText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: COLORS.lightGray,
  },
  badgesCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  badgeIconLarge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  badgeDescription: {
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  calendarCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    minHeight: 120,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  comingSoonText: {
    fontSize: 16,
  },
  upgradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  upgradeIcon: {
    marginRight: 12,
  },
  upgradeTextContainer: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 2,
  },
  upgradeDescription: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.9,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  buttonSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    marginTop: 10,
  },
  signOutButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '500',
  },
}); 