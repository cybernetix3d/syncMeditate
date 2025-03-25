import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncMeditation } from '../../src/hooks/useSyncMeditation';
import { useRealTimeParticipants } from '../../src/hooks/useRealTimeParticipants';
import { usePrivacySettings } from '../../src/context/PrivacyProvider';
import { useAuth } from '../../src/context/AuthProvider';
import { UserProfile } from '../../src/context/AuthProvider';
import { supabase, fixDatabaseSchema, fixMeditationPermissions } from '../../src/api/supabase';
import Timer from '../../src/components/meditation/Timer';
import LiveCounter from '../../src/components/meditation/LiveCounter';
import PulseVisualizer from '../../src/components/meditation/PulseVisualizer';
import Button from '../../src/components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';
import RequestForm from '../../src/components/meditation/RequestForm';
import RequestList from '../../src/components/meditation/RequestList';

const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile => {
  return typeof user !== 'boolean' && user !== null && 'id' in user;
};

export default function SyncMeditationScreen() {
  const { id: eventId, duration: durationParam = '10' } = useLocalSearchParams();
  const durationMinutes = Number(durationParam);
  const durationSeconds = durationMinutes * 60;
  const [remainingTime, setRemainingTime] = useState(durationSeconds);
  const [meditationState, setMeditationState] = useState<
    'PREPARING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'
  >('PREPARING');
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { colors } = useTheme();

  const { privacySettings } = usePrivacySettings();
  const { user } = useAuth();

  // Handle different meditation types
  const isQuickMeditation = !eventId || eventId === 'quick';
  const isGlobalMeditation = eventId === 'global';

  // Only use sync hooks for non-quick meditations
  const {
    joinSession,
    leaveSession,
    isJoined,
    participantCount: directCount,
    error: syncError,
  } = useSyncMeditation(isQuickMeditation ? null : isGlobalMeditation ? null : eventId as string);

  const { participantCount, participantLocations, loading: participantsLoading } =
    useRealTimeParticipants(isQuickMeditation ? null : isGlobalMeditation ? null : eventId as string);

  const [showRequestForm, setShowRequestForm] = useState(false);

  // Fix database schema on mount
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const result = await fixDatabaseSchema();
        if (!result.success) {
          console.error('Failed to fix database schema:', result.error);
        }
      } catch (error) {
        console.error('Error initializing database:', error);
      }
    };
    initializeDatabase();
  }, []);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (isQuickMeditation || isGlobalMeditation) {
        setEventDetails({
          title: isQuickMeditation ? 'Quick Meditation' : 'Global Meditation',
          description: isQuickMeditation 
            ? 'A personal meditation session' 
            : 'Join others in a global meditation session',
          duration: durationMinutes,
          is_global: isGlobalMeditation,
        });
        setIsLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('meditation_events')
          .select('*')
          .eq('id', eventId)
          .single();
        if (error) {
          throw error;
        }
        setEventDetails(data);
      } catch (error) {
        console.error('Error fetching event details:', error);
        Alert.alert(
          'Error',
          'Could not load meditation event details. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventDetails();
  }, [eventId, durationMinutes, isQuickMeditation, isGlobalMeditation]);

  useEffect(() => {
    if (isLoading || isQuickMeditation || isGlobalMeditation) return;
    const startSession = async () => {
      await joinSession({
        locationPrecision: privacySettings.locationSharingLevel,
        anonymous: privacySettings.useAnonymousId,
        shareTradition: privacySettings.shareTradition,
      });
    };
    startSession();
    return () => {
      if (!isQuickMeditation && !isGlobalMeditation) {
        leaveSession();
      }
    };
  }, [isLoading, privacySettings, isQuickMeditation, isGlobalMeditation]);

  useEffect(() => {
    if (syncError) {
      Alert.alert('Connection Error', syncError);
    }
  }, [syncError]);

  const handleStart = () => {
    setMeditationState('IN_PROGRESS');
  };

  const handleComplete = () => {
    setMeditationState('COMPLETED');
    
    const actualDuration = durationSeconds - remainingTime;
    
    // Record completion for any authenticated user, including quick meditations
    if (isUserProfile(user)) {
      const saveCompletion = async () => {
        try {
          console.log('Saving meditation completion');
          
          // For scheduled events, update participant record
          if (!isQuickMeditation && !isGlobalMeditation) {
            try {
              const { data: participantData } = await supabase
                .from('meditation_participants')
                .select('id')
                .eq('event_id', eventId)
                .eq('user_id', user.id)
                .eq('active', true)
                .is('left_at', null)
                .single();

              if (participantData) {
                await supabase
                  .from('meditation_participants')
                  .update({
                    active: false,
                    left_at: new Date().toISOString()
                  })
                  .eq('id', participantData.id);
              }
            } catch (error) {
              console.log('No active participant record found or could not update', error);
            }
          }

          // Save directly to user_meditation_history table only
          try {
            const historyRecord = {
              user_id: user.id,
              duration: Math.round(actualDuration / 60), // Convert to minutes
              date: new Date().toISOString(),
              notes: isQuickMeditation ? 'Quick meditation' : 
                     isGlobalMeditation ? 'Global meditation' : 
                     `Scheduled meditation: ${eventDetails?.title || ''}`
            };
            
            console.log('Inserting into user_meditation_history:', historyRecord);
            
            await supabase
              .from('user_meditation_history')
              .insert([historyRecord]);
              
            console.log('Successfully saved to user_meditation_history');
          } catch (historyError) {
            console.error('Error saving to user_meditation_history:', historyError);
          }

          setTimeout(() => {
            router.push({
              pathname: '/meditation/complete',
              params: { 
                duration: actualDuration.toString(),
                type: isQuickMeditation ? 'quick' : isGlobalMeditation ? 'global' : 'scheduled' 
              },
            });
          }, 2000);
        } catch (error: any) {
          console.error('Error recording meditation completion:', error);
          router.push({
            pathname: '/meditation/complete',
            params: { 
              duration: actualDuration.toString(),
              type: isQuickMeditation ? 'quick' : isGlobalMeditation ? 'global' : 'scheduled' 
            },
          });
        }
      };
      saveCompletion();
    } else {
      setTimeout(() => {
        router.push({
          pathname: '/meditation/complete',
          params: { duration: actualDuration.toString() },
        });
      }, 2000);
    }
  };

  const handleClose = () => {
    if (meditationState === 'IN_PROGRESS') {
      Alert.alert(
        'End Meditation?',
        'Are you sure you want to end your meditation session?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'End',
            style: 'destructive',
            onPress: () => {
              if (!isQuickMeditation && !isGlobalMeditation) {
                leaveSession();
              }
              router.back();
            },
          },
        ]
      );
    } else {
      if (!isQuickMeditation && !isGlobalMeditation) {
        leaveSession();
      }
      router.back();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.primary }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={colors.white} />
        <Text style={[styles.loadingText, { color: colors.white }]}>Preparing your meditation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.primary }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Button variant="text" size="small" onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={colors.white} />
        </Button>
        <Text style={[styles.title, { color: colors.white }]}>{eventDetails?.title || 'Meditation'}</Text>
        <View style={styles.placeholder} />
      </View>
      <ScrollView 
        style={[styles.scrollView, { backgroundColor: colors.background }]} 
        contentContainerStyle={styles.scrollContent}
      >
        {!isQuickMeditation && !isGlobalMeditation && <LiveCounter count={participantCount || directCount} />}
        <Timer
          duration={durationSeconds}
          remainingTime={remainingTime}
          setRemainingTime={setRemainingTime}
          state={meditationState}
          onComplete={handleComplete}
        />
        <PulseVisualizer isActive={meditationState === 'IN_PROGRESS'} size={60} color={colors.primary} />
        
        {meditationState === 'PREPARING' && (
          <>
            {showRequestForm ? (
              <RequestForm
                onSubmit={() => setShowRequestForm(false)}
                onCancel={() => setShowRequestForm(false)}
              />
            ) : (
              <>
                <View style={styles.buttonContainer}>
                  <Button onPress={handleStart} size="large" fullWidth>
                    Begin Meditation
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => setShowRequestForm(true)}
                    size="large"
                    fullWidth
                    style={{ marginTop: 8 }}
                  >
                    Submit Prayer/Healing Request
                  </Button>
                </View>

                <View style={[styles.requestsContainer, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.requestsTitle, { color: colors.primary }]}>
                    Community Requests
                  </Text>
                  <RequestList />
                </View>
              </>
            )}
          </>
        )}

        {eventDetails?.description && (
          <View style={[styles.descriptionContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.descriptionTitle, { color: colors.primary }]}>About this meditation</Text>
            <Text style={[styles.descriptionText, { color: colors.gray }]}>{eventDetails.description}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeButton: {
    padding: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  descriptionContainer: {
    padding: 16,
    margin: 16,
    borderRadius: 10,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
  },
  buttonContainer: {
    padding: 16,
    marginTop: 20,
  },
  requestsContainer: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
  requestsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
});
