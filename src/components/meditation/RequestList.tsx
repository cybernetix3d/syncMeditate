import React, { useState, useEffect } from 'react';
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
}

export default function RequestList() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [requests, setRequests] = useState<MeditationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('meditation_requests')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('meditation_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meditation_requests',
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'prayer':
        return 'heart';
      case 'healing':
        return 'medical';
      case 'vibe':
        return 'sunny';
      case 'meditation':
        return 'leaf';
      default:
        return 'help-circle';
    }
  };

  const getRequestTypeLabel = (type: string, tradition: string | null) => {
    const faithTradition = FAITH_TRADITIONS.find(t => t.id === tradition);
    switch (type) {
      case 'prayer':
        return faithTradition?.prayerLabel || 'Prayer';
      case 'healing':
        return faithTradition?.healingLabel || 'Healing';
      case 'vibe':
        return 'Good Vibes';
      case 'meditation':
        return 'Meditation Focus';
      default:
        return 'Request';
    }
  };

  const renderItem = ({ item }: { item: MeditationRequest }) => (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.userImage} />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: colors.primary }]}>
              <Ionicons name="person" size={24} color={colors.white} />
            </View>
          )}
          <View>
            <Text style={[styles.userName, { color: colors.primary }]}>
              {item.is_anonymous ? 'Anonymous' : item.full_name || 'Someone'}
            </Text>
            {item.location && (
              <Text style={[styles.location, { color: colors.gray }]}>
                {item.location}
              </Text>
            )}
          </View>
        </View>
        <View style={[styles.requestType, { backgroundColor: colors.primary }]}>
          <Ionicons name={getRequestTypeIcon(item.request_type)} size={16} color={colors.white} />
          <Text style={[styles.requestTypeText, { color: colors.white }]}>
            {getRequestTypeLabel(item.request_type, item.tradition)}
          </Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={[styles.focusArea, { color: colors.primary }]}>
          {item.focus_area}
        </Text>
        {item.desired_outcome && (
          <Text style={[styles.desiredOutcome, { color: colors.gray }]}>
            Desired outcome: {item.desired_outcome}
          </Text>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.timestamp, { color: colors.gray }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        <TouchableOpacity
          style={[styles.focusButton, { backgroundColor: colors.primary }]}
          onPress={() => {
            // Navigate to meditation with this focus
          }}
        >
          <Text style={[styles.focusButtonText, { color: colors.white }]}>
            Focus on This
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={48} color={colors.gray} />
          <Text style={[styles.emptyStateText, { color: colors.gray }]}>
            No requests at the moment
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  placeholderImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  location: {
    fontSize: 14,
  },
  requestType: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    gap: 4,
  },
  requestTypeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    gap: 8,
  },
  focusArea: {
    fontSize: 16,
    lineHeight: 24,
  },
  desiredOutcome: {
    fontSize: 14,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  timestamp: {
    fontSize: 12,
  },
  focusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  focusButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 