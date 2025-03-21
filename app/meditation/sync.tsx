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
          // First try to fix both schema and permissions
          try {
            await fixDatabaseSchema();
            await fixMeditationPermissions();
            console.log('Database schema and permissions fixed');
          } catch (fixError) {
            console.error('Error fixing database:', fixError);
            // Continue anyway, we'll try the insert below
          }
          
          // For scheduled events, update participant record
          if (!isQuickMeditation && !isGlobalMeditation) {
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
          }

          // Save to meditation_completions for ALL meditation types
          const completionData = {
            user_id: user.id,
            event_id: isQuickMeditation ? null : isGlobalMeditation ? 'global' : eventId,
            duration: actualDuration,
            completed: true,
            // Add a type field to distinguish quick meditations
            meditation_type: isQuickMeditation ? 'quick' : isGlobalMeditation ? 'global' : 'scheduled'
          };
          
          console.log('Saving meditation completion:', completionData);
          
          // Try first with the meditation_completions table including meditation_type
          try {
            const { data, error: insertError } = await supabase.from('meditation_completions').insert([
              completionData
            ]).select();
            
            if (insertError) {
              console.error('Error inserting meditation completion with type:', insertError);
              
              // If error mentions meditation_type column, try without it
              if (insertError.message && insertError.message.includes('meditation_type')) {
                console.log('Trying without meditation_type field');
                
                // Create a version without the meditation_type field
                const { meditation_type, ...completionDataWithoutType } = completionData;
                
                const { data: dataWithoutType, error: insertErrorWithoutType } = await supabase
                  .from('meditation_completions')
                  .insert([completionDataWithoutType])
                  .select();
                
                if (insertErrorWithoutType) {
                  console.error('Error inserting without meditation_type:', insertErrorWithoutType);
                  throw insertErrorWithoutType;
                } else {
                  console.log('Meditation completion saved successfully without type field:', dataWithoutType);
                }
              } else {
                throw insertError;
              }
            } else {
              console.log('Meditation completion saved successfully with type field:', data);
            }
            
            // Additionally save to user_meditation_history for compatibility
            try {
              await supabase.from('user_meditation_history').insert([{
                user_id: user.id,
                event_id: isQuickMeditation ? null : isGlobalMeditation ? null : eventId,
                duration: actualDuration,
                tradition: null, // Could get this from user preferences if needed
                date: new Date().toISOString()
              }]);
              console.log('Also saved to user_meditation_history for compatibility');
            } catch (historyError) {
              console.error('Error saving to user_meditation_history:', historyError);
            }
          } catch (error) {
            console.error('Failed to save meditation completion:', error);
            Alert.alert(
              'Error Saving Meditation',
              'There was an error saving your meditation. Please try again.',
              [{ text: 'OK' }]
            );
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
        {eventDetails?.description && (
          <View style={[styles.descriptionContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.descriptionTitle, { color: colors.primary }]}>About this meditation</Text>
            <Text style={[styles.descriptionText, { color: colors.gray }]}>{eventDetails.description}</Text>
          </View>
        )}
        {meditationState === 'PREPARING' && (
          <View style={styles.buttonContainer}>
            <Button onPress={handleStart} size="large" fullWidth>
              Begin Meditation
            </Button>
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
});
