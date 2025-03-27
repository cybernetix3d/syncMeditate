// src/components/meditation/RequestList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import { FAITH_TRADITIONS } from '../faith/TraditionSelector';
import { useAuth } from '../../context/AuthProvider';
import { formatDistanceToNow } from 'date-fns'; // Now this should work

// Define the structure of a meditation request
interface MeditationRequest {
  id: string;
  user_id: string;
  request_type: 'prayer' | 'healing' | 'vibe' | 'meditation';
  tradition: string | null;
  full_name: string | null;
  image_url: string | null;
  location: string | null;
  focus_area: string;
  desired_outcome: string | null;
  is_anonymous: boolean;
  created_at: string;
  is_active: boolean; // <-- ADDED is_active
}

// Define Props for RequestList
interface RequestListProps {
    refreshKey?: number;
    limit?: number;
}

// Main Component
export default function RequestList({ refreshKey, limit = 15 }: RequestListProps) {
  const { colors } = useTheme(); // Get colors from theme
  const { user } = useAuth();
  const [requests, setRequests] = useState<MeditationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const loadRequests = useCallback(async (isRefreshing = false) => {
    if (!isRefreshing) setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('meditation_requests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;
      setRequests(data || []);
    } catch (err: any) {
      console.error('Error loading requests:', err);
      setError('Failed to load requests.');
      setRequests([]);
    } finally {
      setLoading(false);
      if (isRefreshing) setRefreshing(false);
    }
  }, [limit]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, refreshKey]); // Use refreshKey

  useEffect(() => {
    const channel = supabase
      .channel('public:meditation_requests')
      .on<MeditationRequest>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meditation_requests' },
        (payload) => {
          console.log('Realtime Request Change:', payload.eventType, payload.new || payload.old);
          switch (payload.eventType) {
             case 'INSERT':
                if (payload.new.is_active) { // Check new object
                   setRequests(prev => [payload.new, ...prev].slice(0, limit));
                }
                break;
             case 'UPDATE':
                setRequests(prev => prev.map(req =>
                   req.id === payload.old.id
                      ? (payload.new.is_active ? payload.new : null) // Check new object
                      : req
                ).filter(req => req !== null) as MeditationRequest[]);
                break;
             case 'DELETE':
                setRequests(prev => prev.filter(req => req.id !== payload.old.id));
                break;
             default: loadRequests();
          }
        }
      )
      .subscribe((status, err) => {
         if (status === 'SUBSCRIBED') console.log('Realtime RequestList subscribed!');
         if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error('Realtime RequestList subscription error:', err || status);
      });

    return () => {
      console.log('Removing Realtime RequestList subscription');
      supabase.removeChannel(channel);
    };
  }, [loadRequests, limit]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests(true);
  };

  const getRequestTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'prayer': return 'heart-outline';
      case 'healing': return 'leaf-outline';
      case 'vibe': return 'flash-outline';
      case 'meditation': return 'sync-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const getRequestTypeLabel = (type: string, tradition: string | null) => {
    const faithTradition = FAITH_TRADITIONS.find(t => t.id === tradition);
    switch (type) {
      case 'prayer': return faithTradition?.prayerLabel || 'Prayer';
      case 'healing': return faithTradition?.healingLabel || 'Healing';
      case 'vibe': return 'Good Vibes';
      case 'meditation': return 'Meditation Focus';
      default: return 'Request';
    }
  };

  const renderItem = ({ item }: { item: MeditationRequest }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.darkGray }]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.userImage} />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: colors.mediumGray }]}>
              <Ionicons name="person-outline" size={22} color={colors.gray} />
            </View>
          )}
          <View style={styles.nameLocationContainer}>
            <Text style={[styles.userName, { color: colors.bodyText }]} numberOfLines={1}>
              {item.is_anonymous ? 'Anonymous' : item.full_name || 'Someone'}
            </Text>
            {item.location && !item.is_anonymous && (
              <Text style={[styles.location, { color: colors.subtitleText }]} numberOfLines={1}>
                <Ionicons name="location-outline" size={13} color={colors.subtitleText} /> {item.location}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.requestType, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={getRequestTypeIcon(item.request_type)} size={16} color={colors.primary} />
          <Text style={[styles.requestTypeText, { color: colors.primary }]}>
            {getRequestTypeLabel(item.request_type, item.tradition)}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.focusArea, { color: colors.bodyText }]}>
          {item.focus_area}
        </Text>
        {item.desired_outcome && (
          <Text style={[styles.desiredOutcome, { color: colors.subtitleText }]}>
            Desired feeling: {item.desired_outcome}
          </Text>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.timestamp, { color: colors.subtitleText }]}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: 'transparent' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

    if (error && requests.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.secondary} />
        <Text style={[styles.emptyStateText, { color: colors.secondary }]}>{error}</Text>
         <TouchableOpacity onPress={() => loadRequests()} style={[styles.retryButton, {borderColor: colors.primary}]}> {/* Use theme color */}
            <Text style={{color: colors.primary}}>Try Again</Text>
         </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={[styles.container, { backgroundColor: 'transparent' }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        !loading && !error ? (
          <View style={styles.emptyState}>
            <Ionicons name="moon-outline" size={48} color={colors.gray} />
            <Text style={[styles.emptyStateText, { color: colors.subtitleText }]}>No active requests yet.</Text>
          </View>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
    />
  );
}

// Styles (ensure colors.border, colors.mediumGray etc. exist in your theme)
const styles = StyleSheet.create({
  container: { paddingVertical: 16, paddingHorizontal: 5 },
  loadingContainer: { flex: 1, minHeight: 150, justifyContent: 'center', alignItems: 'center' },
  card: { borderRadius: 12, padding: 16, borderWidth: 1, elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, paddingRight: 5 },
  nameLocationContainer: { flexShrink: 1 },
  userImage: { width: 40, height: 40, borderRadius: 20 },
  placeholderImage: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  userName: { fontSize: 15, fontWeight: '600' },
  location: { fontSize: 13, marginTop: 2, flexDirection: 'row', alignItems: 'center' },
  requestType: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, gap: 5 },
  requestTypeText: { fontSize: 12, fontWeight: '500' },
  cardContent: { gap: 6, marginBottom: 12 },
  focusArea: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  desiredOutcome: { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, borderColor: '#eee' }, // Added default borderColor
  timestamp: { fontSize: 12 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 32, minHeight: 150, gap: 16 },
  emptyStateText: { fontSize: 16, textAlign: 'center' },
  retryButton: { marginTop: 10, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 5, borderWidth: 1 /* borderColor set dynamically */ }
});