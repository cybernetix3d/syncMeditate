import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthProvider';
import { FAITH_TRADITIONS } from '../faith/TraditionSelector';

interface MeditationRequest {
  id: string;
  request_type: 'prayer' | 'healing' | 'vibe' | 'meditation';
  tradition: string | null;
  focus_area: string;
  created_at: string;
  is_active: boolean;
}

export default function UserRequests() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [requests, setRequests] = useState<MeditationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    if (!user || typeof user === 'boolean') return;

    try {
      const { data, error } = await supabase
        .from('meditation_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
      Alert.alert('Error', 'Failed to load your requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || typeof user === 'boolean') return;
    
    loadRequests();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('user_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meditation_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Request updated:', payload);
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCancelRequest = async (requestId: string) => {
    if (!user || typeof user === 'boolean') return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Attempting to cancel request:', requestId);
              console.log('Current user ID:', user.id);

              // First, verify the request exists and belongs to the user
              const { data: requestData, error: fetchError } = await supabase
                .from('meditation_requests')
                .select('*')
                .eq('id', requestId)
                .eq('user_id', user.id)
                .single();

              if (fetchError) {
                console.error('Error fetching request:', fetchError);
                throw fetchError;
              }

              if (!requestData) {
                console.error('Request not found or does not belong to user');
                throw new Error('Request not found or does not belong to user');
              }

              console.log('Found request:', requestData);

              // Now attempt to update the request
              const { data: updateData, error: updateError } = await supabase
                .from('meditation_requests')
                .update({ is_active: false })
                .eq('id', requestId)
                .eq('user_id', user.id)
                .select('*');

              if (updateError) {
                console.error('Error updating request:', updateError);
                console.error('Request ID:', requestId);
                console.error('User ID:', user.id);
                throw updateError;
              }

              console.log('Successfully updated request:', updateData);
              
              // Manually update the local state
              setRequests(prevRequests => 
                prevRequests.filter(request => request.id !== requestId)
              );
              
              Alert.alert('Success', 'Request cancelled successfully');
            } catch (error) {
              console.error('Error cancelling request:', error);
              Alert.alert('Error', 'Failed to cancel request. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getRequestTypeLabel = (type: string) => {
    if (!user || typeof user === 'boolean') return 'Request';
    
    const tradition = FAITH_TRADITIONS.find(t => t.id === user.faith_preferences?.primaryTradition);
    switch (type) {
      case 'prayer':
        return tradition?.prayerLabel || 'Prayer';
      case 'healing':
        return tradition?.healingLabel || 'Healing';
      case 'vibe':
        return 'Good Vibes';
      case 'meditation':
        return 'Meditation Focus';
      default:
        return 'Request';
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'prayer':
        return 'heart';
      case 'healing':
        return 'medical';
      case 'vibe':
        return 'happy';
      case 'meditation':
        return 'leaf';
      default:
        return 'help-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.gray }]}>
          You haven't created any requests yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {requests.map((request) => (
        <View
          key={request.id}
          style={[styles.requestCard, { backgroundColor: colors.surface }]}
        >
          <View style={styles.requestHeader}>
            <View style={styles.requestTypeContainer}>
              <Ionicons
                name={getRequestTypeIcon(request.request_type)}
                size={20}
                color={colors.primary}
              />
              <Text style={[styles.requestType, { color: colors.primary }]}>
                {getRequestTypeLabel(request.request_type)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleCancelRequest(request.id)}
              style={[styles.cancelButton, { backgroundColor: colors.secondary }]}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color={colors.white} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.focusArea, { color: colors.bodyText }]}>
            {request.focus_area}
          </Text>
          <Text style={[styles.date, { color: colors.gray }]}>
            Created {new Date(request.created_at).toLocaleDateString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  requestCard: {
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  requestTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestType: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0,
  },
  focusArea: {
    fontSize: 14,
    marginBottom: 4,
  },
  date: {
    fontSize: 12,
  },
}); 