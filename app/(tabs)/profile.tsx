import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList, // Use FlatList
  RefreshControl
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';
// Use named exports from Styles
import { COMMON_STYLES } from '@/src/constants/Styles';
import Button from '@/src/components/common/Button';
import type { UserProfile } from '@/src/context/AuthProvider';
import { supabase } from '@/src/api/supabase';
import UserRequests from '@/src/components/meditation/UserRequests';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';

// --- Interfaces ---
interface MeditationHistory {
  id: string;
  user_id: string;
  event_id: string | null;
  date: string; // completed_at timestamp
  duration: number; // duration IN SECONDS
  tradition: string | null;
  notes: string | null;
  meditation_events: {
      title: string;
      is_global: boolean;
      tradition?: string | null;
  } | null;
}
interface Badge {
  id: string; name: string; description: string; icon: keyof typeof Ionicons.glyphMap; achieved: boolean; progress?: number; maxProgress?: number;
}
interface UserStats {
  totalSessions: number; totalMinutes: number; currentStreak: number; longestStreak: number; lastSessionDate: string | null; badges: Badge[];
}

// Type guard
const isUserProfile = (user: null | boolean | UserProfile): user is UserProfile => {
    return user !== null && typeof user !== 'boolean' && 'id' in user;
};


export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isDark, colors } = useTheme(); // Use theme hook
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentHistory, setRecentHistory] = useState<MeditationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Calculation Functions ---
  const calculateStreak = (sessionDates: string[]): { currentStreak: number, longestStreak: number } => {
      if (!sessionDates || sessionDates.length === 0) return { currentStreak: 0, longestStreak: 0 };
      const sortedDates = [...sessionDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const latestSessionDate = new Date(sortedDates[0]); latestSessionDate.setHours(0, 0, 0, 0);
      const msPerDay = 86400000;
      const daysSinceLast = Math.round((today.getTime() - latestSessionDate.getTime()) / msPerDay);

      let currentStreak = 0; let longestStreak = 0; let currentRun = 0; let lastDate: Date | null = null;

      if (daysSinceLast <= 1) {
          currentStreak = 1; lastDate = latestSessionDate;
          for (let i = 1; i < sortedDates.length; i++) {
              const currentDate = new Date(sortedDates[i]); currentDate.setHours(0, 0, 0, 0);
              if (!lastDate || lastDate.getTime() === currentDate.getTime()) continue;
              const daysBetween = Math.round((lastDate.getTime() - currentDate.getTime()) / msPerDay);
              if (daysBetween === 1) { currentStreak++; lastDate = currentDate; } else { break; }
          }
      }

      lastDate = null; currentRun = 0;
      // Use reverse on a copy for calculating longest streak
      for (const dateStr of [...sortedDates].reverse()) {
         const currentDate = new Date(dateStr); currentDate.setHours(0, 0, 0, 0);
         if (!lastDate) { currentRun = 1; }
         else {
             const daysBetween = Math.round((currentDate.getTime() - lastDate.getTime()) / msPerDay);
             if (daysBetween === 1) currentRun++;
             else if (daysBetween > 1) currentRun = 1;
         }
         lastDate = currentDate;
         longestStreak = Math.max(longestStreak, currentRun);
      }
      return { currentStreak, longestStreak };
  };
  const calculateBadges = (sessionCount: number, currentStreak: number, hasGlobalEvent: boolean): Badge[] => { 
    return [
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
        achieved: currentStreak >= 7,
        progress: Math.min(currentStreak, 7),
        maxProgress: 7
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
  };
  const checkGlobalEventParticipation = async (userId: string): Promise<boolean> => { 
    try {
      const { data, error } = await supabase
        .from('meditation_participants')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
        
      if (error) {
        console.error('Error checking global event participation:', error);
        return false;
      }
      
      return (data && data.length > 0);
    } catch (e) {
      console.error('Error in checkGlobalEventParticipation:', e);
      return false;
    }
  };

  // --- Fetch User Stats ---
  const fetchUserStats = useCallback(async () => {
    if (!isUserProfile(user)) { setLoadingStats(false); return; }
    if (!refreshing) setLoadingStats(true);
    try {
        const { data: historyForStats, error: historyError } = await supabase
            .from('user_meditation_history').select('duration, date, event_id').eq('user_id', user.id).order('date', { ascending: false });
        if (historyError) throw historyError;
        // ... (rest of calculation logic) ...
        const totalSessions = historyForStats?.length || 0;
        const totalMinutes = Math.round(historyForStats?.reduce((total, item) => total + ((item.duration || 0) / 60), 0) || 0);
        const allSessionDates = historyForStats?.map(item => item.date || '').filter(Boolean) || [];
        const { currentStreak, longestStreak } = calculateStreak(allSessionDates);
        const hasGlobalEvent = await checkGlobalEventParticipation(user.id);
        const badges = calculateBadges(totalSessions, currentStreak, hasGlobalEvent);
        const lastSessionDate = allSessionDates.length > 0 ? allSessionDates[0] : null;
        setStats({ totalSessions, totalMinutes, currentStreak, longestStreak, lastSessionDate, badges });
    } catch (error) { console.error('Error fetching user stats:', error); }
    finally { setLoadingStats(false); }
  }, [user, refreshing]);

  // --- Fetch Recent History ---
  const fetchRecentHistory = useCallback(async (limit = 15) => {
      if (!isUserProfile(user)) { setLoadingHistory(false); return; }
      if (!refreshing) setLoadingHistory(true);
      try {
          const { data: history, error: historyError } = await supabase
              .from('user_meditation_history')
              .select(`id, user_id, event_id, date, duration, tradition, notes, meditation_events ( title, is_global, tradition )`)
              .eq('user_id', user.id).order('date', { ascending: false }).limit(limit);
          if (historyError) throw historyError;
          const processedHistory = (history || []).map(item => ({ ...item, meditation_events: Array.isArray(item.meditation_events) ? item.meditation_events[0] || null : item.meditation_events }));
          setRecentHistory(processedHistory);
      } catch (error) { console.error('Error fetching recent history:', error); }
      finally { setLoadingHistory(false); }
  }, [user, refreshing]);

  // --- useEffect & Refresh ---
  useEffect(() => { fetchUserStats(); fetchRecentHistory(); }, [user, fetchUserStats, fetchRecentHistory]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await Promise.all([ fetchUserStats(), fetchRecentHistory() ]); setRefreshing(false); }, [fetchUserStats, fetchRecentHistory]); // Removed user from here

  // --- Navigation & Formatters ---
  const navigateToSettings = () => router.push('/settings');
  const navigateToEditProfile = () => router.push('/settings/profile');
  const handleSignOut = async () => { 
    try {
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
                router.replace('/');
              } catch (error) {
                console.error('Sign out error:', error);
                Alert.alert('Error', 'Failed to sign out');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error initiating sign out:', error);
    }
  };
  const formatDuration = (minutes: number): string => {
      if (minutes === undefined || minutes === null || isNaN(minutes)) return '0m';
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
  };

  // --- Render History Item ---
  const renderHistoryItem = ({ item }: { item: MeditationHistory }) => {
    const event = item.meditation_events;
    const isQuick = !item.event_id && !event;
    const meditationType = event?.is_global ? 'global' : (event ? 'scheduled' : 'quick');
    const completedDate = new Date(item.date);
    const durationSeconds = item.duration || 0;
    const durationMinutes = Math.floor(durationSeconds / 60);
    const remainingSeconds = durationSeconds % 60;
    const formattedDuration = remainingSeconds > 0 ? `${durationMinutes}:${remainingSeconds.toString().padStart(2, '0')}` : `${durationMinutes} min`;
    const displayTraditionId = item.tradition || event?.tradition || 'secular';
    const traditionObj = FAITH_TRADITIONS.find(t => t.id === displayTraditionId) || FAITH_TRADITIONS.find(t => t.id === 'secular')!;
    let iconName: keyof typeof Ionicons.glyphMap = 'checkmark-circle-outline';
    let iconBgColor = colors.secondary;
    if (isQuick) { iconName = 'flash-outline'; iconBgColor = colors.accent; }
    else if (meditationType === 'global') { iconName = 'globe-outline'; iconBgColor = colors.primary; }
    else if (traditionObj) { iconName = traditionObj.ionicon as any; iconBgColor = traditionObj.color || colors.secondary; }

    return (
      <View style={[styles.historyCard, { backgroundColor: colors.surface }]}>
        <View style={[COMMON_STYLES.iconContainer, styles.historyIconContainer, { backgroundColor: iconBgColor }]}>
           <Ionicons name={iconName} size={20} color={colors.white} />
        </View>
        <View style={styles.historyDetails}>
          <Text style={[COMMON_STYLES.title, styles.historyTitle, { color: colors.headerText }]}>
            {event?.title || `${formattedDuration} Session`}
          </Text>
          <Text style={[COMMON_STYLES.subtitle, styles.historySubtitle, { color: colors.gray }]}>
            {completedDate.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </Text>
          <View style={styles.historyTags}>
             <View style={COMMON_STYLES.detailItem}><Ionicons name="time-outline" size={14} color={colors.gray} /><Text style={[COMMON_STYLES.detailText, styles.historyTagText, { color: colors.gray }]}>{formattedDuration}</Text></View>
             <View style={COMMON_STYLES.detailItem}><Ionicons name={traditionObj.ionicon as any} size={14} color={colors.gray} /><Text style={[COMMON_STYLES.detailText, styles.historyTagText, { color: colors.gray }]}>{traditionObj.name}</Text></View>
          </View>
          {item.notes && (<Text style={[styles.historyNotes, { color: colors.bodyText }]} numberOfLines={2}>Notes: {item.notes}</Text>)}
        </View>
      </View>
    );
  };

  // --- Header & Footer Components for FlatList ---
   const ListHeader = () => (
     <>
        {/* Profile Card */}
        <View style={[COMMON_STYLES.card, styles.profileCard, { backgroundColor: colors.surface }]}>
            <View style={[COMMON_STYLES.iconContainer, styles.profileAvatar, { backgroundColor: colors.primary }]}>
                {isUserProfile(user) && user.avatar_url ? ( <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} /> ) : ( <Text style={styles.profileInitial}>{isUserProfile(user) && user.display_name ? user.display_name[0].toUpperCase() : '?'}</Text> )}
            </View>
            <View style={styles.profileInfo}>
                 <View style={styles.profileNameRow}>
                     <Text style={[COMMON_STYLES.title, styles.profileName, { color: colors.headerText }]}>{isUserProfile(user) && user.display_name ? user.display_name : 'Guest'}</Text>
                     <TouchableOpacity onPress={navigateToEditProfile} style={[styles.editProfileButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                         <Ionicons name="pencil-outline" size={14} color={colors.primary} />
                     </TouchableOpacity>
                 </View>
                 <Text style={[COMMON_STYLES.subtitle, styles.profileEmail, { color: colors.gray }]}>{isUserProfile(user) && user.email ? user.email : 'Anonymous User'}</Text>
                 {loadingStats ? <ActivityIndicator size="small" color={colors.gray}/> : stats?.badges && (
                    <View style={styles.badgesRow}>
                        {stats.badges.filter(b => b.achieved).slice(0, 3).map(badge => (<View key={badge.id} style={[styles.badgeIcon, { backgroundColor: colors.accent }]}><Ionicons name={badge.icon} size={14} color={colors.white} /></View>))}
                        {stats.badges.filter(b => b.achieved).length > 3 && (<View style={[styles.badgeMore, { backgroundColor: colors.lightGray }]}><Text style={[styles.badgeMoreText, { color: colors.gray }]}>+{stats.badges.filter(b => b.achieved).length - 3}</Text></View>)}
                    </View>
                 )}
            </View>
        </View>

        {/* Stats Section */}
        <View style={COMMON_STYLES.section}>
            <Text style={[COMMON_STYLES.sectionTitle, { color: colors.headerText }]}>Meditation Stats</Text>
            {loadingStats ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }}/> : stats ? (
                <View style={[styles.statsGrid, { backgroundColor: colors.surface, borderTopColor: colors.border, borderBottomColor: colors.border }]}>
                   <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.headerText }]}>{stats.totalSessions}</Text><Text style={[styles.statLabel, { color: colors.gray }]}>Sessions</Text></View><View style={[styles.statDivider, {backgroundColor: colors.border}]}/>
                   <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.headerText }]}>{formatDuration(stats.totalMinutes)}</Text><Text style={[styles.statLabel, { color: colors.gray }]}>Total Time</Text></View><View style={[styles.statDivider, {backgroundColor: colors.border}]}/>
                   <View style={styles.statItem}><Text style={[styles.statValue, { color: colors.headerText }]}>{stats.currentStreak}</Text><Text style={[styles.statLabel, { color: colors.gray }]}>Day Streak</Text></View>
                </View>
            ) : <Text style={{ color: colors.gray, paddingHorizontal: 20 }}>No stats recorded.</Text>}
        </View>

        {/* Badges Section */}
{loadingStats ? null : stats && (
   <View style={COMMON_STYLES.section}>
       <Text style={[COMMON_STYLES.sectionTitle, { color: colors.headerText }]}>Achievements</Text>
       <View style={[styles.badgesCard, { backgroundColor: colors.surface }]}>
           {stats.badges.map((badge) => (
              <View key={badge.id} style={[styles.badgeItem, { borderBottomColor: colors.border }]}>
                   <View style={[COMMON_STYLES.iconContainer, styles.badgeIconLarge, { backgroundColor: badge.achieved ? colors.accent : colors.lightGray, opacity: badge.achieved ? 1 : 0.6 } ]}>
                       <Ionicons name={badge.icon} size={22} color={badge.achieved ? colors.white : colors.gray} />
                   </View>
                   <View style={styles.badgeInfo}>
                       <Text style={[styles.badgeName, { color: colors.headerText }]}>{badge.name}</Text>
                       <Text style={[styles.badgeDescription, { color: colors.gray }]}>{badge.description}</Text>
                       {!badge.achieved && badge.progress !== undefined && badge.maxProgress && (
                           <View style={[styles.progressBar, { backgroundColor: colors.lightGray }]}>
                               <View style={[ styles.progressFill, { backgroundColor: colors.accent, width: `${Math.min(100,(badge.progress / badge.maxProgress) * 100)}%`} ]} />
                           </View>
                       )}
                   </View>
                   {badge.achieved && ( <Ionicons name="checkmark-circle" size={22} color={colors.accent} /> )}
              </View>
            ))}
       </View>
   </View>
)}

{/* Your Requests Section */}
<View style={COMMON_STYLES.section}>
  <Text style={[COMMON_STYLES.sectionTitle, { color: colors.headerText }]}>Your Prayer Requests</Text>
  {isUserProfile(user) ? <UserRequests userId={user.id} /> : <Text style={{color: colors.gray, paddingHorizontal: 20}}>Sign in to see your requests.</Text>}
</View>

{/* Recent Activity Title */}
<View style={COMMON_STYLES.section}>
  <Text style={[COMMON_STYLES.sectionTitle, { color: colors.headerText }]}>Recent Activity</Text>
</View>
</>
);

const ListFooter = () => (
<>
{/* Upgrade Card */}
{(!isUserProfile(user) || !user.email) && (
     <View style={styles.section}>
         <TouchableOpacity style={[styles.upgradeCard, { backgroundColor: colors.secondary }]} onPress={() => router.push('/auth/sign-up')}>
             <Ionicons name="rocket-outline" size={24} color={colors.white} style={styles.upgradeIcon} />
             <View style={styles.upgradeTextContainer}><Text style={[styles.upgradeTitle,{color: colors.white}]}>Upgrade Account</Text><Text style={[styles.upgradeDescription,{color: colors.white+'CC'}]}>Save progress & access more features</Text></View>
             <Ionicons name="chevron-forward" size={22} color={colors.white} />
         </TouchableOpacity>
      </View>
  )}
 {/* Sign Out Button */}
 <View style={COMMON_STYLES.buttonContainer}>
     <Button variant="outline" onPress={handleSignOut} fullWidth>Sign Out</Button>
 </View>
</>
);

// --- Main Render ---
return (
<View style={[COMMON_STYLES.container, { backgroundColor: colors.background }]}>
  {/* Use COMMON_STYLES for header */}
  <View style={[COMMON_STYLES.screenHeader, styles.header]}>
      <View style={COMMON_STYLES.headerRow}>
         <Text style={[COMMON_STYLES.title, styles.title, { color: colors.headerText }]}>Profile</Text>
         <TouchableOpacity onPress={navigateToSettings} style={[styles.settingsButton, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
             <Ionicons name="settings-outline" size={22} color={colors.white} />
             <Text style={[styles.settingsButtonText, { color: colors.white }]}>Settings</Text>
         </TouchableOpacity>
      </View>
  </View>

  <FlatList
      ListHeaderComponent={ListHeader}
      data={recentHistory}
      renderItem={renderHistoryItem}
      keyExtractor={(item) => item.id}
      ListFooterComponent={ListFooter}
      ListEmptyComponent={() => (
        <View style={[COMMON_STYLES.emptyStateContainer, styles.historyEmptyCard, { backgroundColor: colors.surface, marginHorizontal: 20 }]}>
            {loadingHistory ? <ActivityIndicator color={colors.primary} /> : <Text style={{ color: colors.gray }}>No recent meditation history.</Text>}
        </View>
      )}
      refreshControl={ <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> }
      contentContainerStyle={{ paddingBottom: 40 }} // Padding at the absolute bottom of the list
  />
</View>
);
}

// --- Styles ---
const styles = StyleSheet.create({
container: { flex: 1 },
header: { paddingTop: 10, paddingBottom: 5 }, // Reduced padding for FlatList header
title: { fontSize: 28 }, // Use COMMON_STYLES.title base
settingsButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
settingsButtonText: { fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
profileCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 20, marginBottom: 20, borderRadius: 12, elevation: 2 }, // Inherits COMMON_STYLES.card
profileAvatar: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 15 }, // Inherits COMMON_STYLES.iconContainer
profileInitial: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
avatarImage: { width: '100%', height: '100%', borderRadius: 30 },
profileInfo: { flex: 1 },
profileNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap'},
profileName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, marginRight: 5 },
editProfileButton: { flexDirection: 'row', alignItems: 'center', padding: 5, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1 }, // Added border
editProfileText: { fontSize: 12, fontWeight: '500' },
profileEmail: { fontSize: 14, marginBottom: 6 }, // Use COMMON_STYLES.subtitle base
badgesRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
badgeIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
badgeMore: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
badgeMoreText: { fontSize: 10, fontWeight: 'bold' },
section: { ...COMMON_STYLES.section }, // Use common style
sectionTitle: { ...COMMON_STYLES.sectionTitle }, // Use common style
statsGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginHorizontal: 20, paddingVertical: 16, borderRadius: 12, elevation: 2, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
statItem: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
statValue: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
statLabel: { fontSize: 12, textAlign: 'center' },
statDivider: { width: StyleSheet.hairlineWidth, height: '70%' },
badgesCard: { marginHorizontal: 20, borderRadius: 12, elevation: 2, overflow: 'hidden' },
badgeItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
badgeIconLarge: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 14 }, // Use COMMON_STYLES.iconContainer base
badgeInfo: { flex: 1 },
badgeName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
badgeDescription: { fontSize: 12 },
progressBar: { height: 4, borderRadius: 2, marginTop: 6, width: '80%', overflow: 'hidden' },
progressFill: { height: '100%' },
// History Styles
historyCard: { flexDirection: 'row', padding: 12, marginHorizontal: 20, marginBottom: 12, borderRadius: 10, elevation: 1 },
historyIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
historyDetails: { flex: 1 },
historyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 3 },
historySubtitle: { fontSize: 12, marginBottom: 6 },
historyTags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 4 },
historyTag: { ...COMMON_STYLES.detailItem, marginRight: 12, marginBottom: 4 }, // Use common style base
historyTagText: { ...COMMON_STYLES.detailText, fontSize: 12 }, // Use common style base
historyNotes: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
historyEmptyCard: { borderRadius: 12, padding: 20, minHeight: 80, justifyContent: 'center', alignItems: 'center', elevation: 1 },
// Other Styles
upgradeCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginHorizontal: 20, borderRadius: 12, marginBottom: 20},
upgradeIcon: { marginRight: 12 },
upgradeTextContainer: { flex: 1 },
upgradeTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
upgradeDescription: { fontSize: 12, opacity: 0.9 },
loadingContainer: { ...COMMON_STYLES.loadingContainer },
loadingText: { ...COMMON_STYLES.loadingText },
buttonSection: { ...COMMON_STYLES.buttonContainer, paddingBottom: 40, marginTop: 10 }, // Inherit and add padding
signOutButton: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 },
signOutText: { fontSize: 16 },
});