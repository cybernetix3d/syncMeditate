import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncMeditation } from '../../src/hooks/useSyncMeditation';
import { useRealTimeParticipants } from '../../src/hooks/useRealTimeParticipants';
import { usePrivacySettings } from '../../src/context/PrivacyProvider';
import { useAuth } from '../../src/context/AuthProvider';
import { supabase } from '../../src/api/supabase';
import Timer from '../../src/components/meditation/Timer';
import LiveCounter from '../../src/components/meditation/LiveCounter';
import PulseVisualizer from '../../src/components/meditation/PulseVisualizer';
import Button from '../../src/components/common/Button';
import { LocationPrecision } from '../../src/services/geolocation';
import { Ionicons } from '@expo/vector-icons';

// We'll implement a simplified version first and import ParticipantMap after creating it
// This removes the error: Cannot find module '../../src/components/meditation/ParticipantMap'

export default function SyncMeditationScreen() {
  // Get parameters from route
  const { id: eventId, duration: durationParam = '10' } = useLocalSearchParams();
  
  // Convert duration to number (in minutes)
  const durationMinutes = Number(durationParam);
  
  // Convert minutes to seconds for timer
  const durationSeconds = durationMinutes * 60;
  
  // State
  const [remainingTime, setRemainingTime] = useState(durationSeconds);
  const [meditationState, setMeditationState] = useState<'PREPARING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED'>('PREPARING');
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Hooks
  const { privacySettings } = usePrivacySettings();
  const { user } = useAuth();
  
  // Sync meditation hook
  const { 
    joinSession, 
    leaveSession, 
    isJoined,
    participantCount: directCount,
    error: syncError
  } = useSyncMeditation(eventId as string || 'quick');
  
  // Real-time participants hook
  const {
    participantCount,
    participantLocations,
    loading: participantsLoading
  } = useRealTimeParticipants(eventId as string || 'quick');
  
  // Load event details if an ID is provided
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!eventId || eventId === 'quick') {
        // Create a title for quick meditation
        setEventDetails({
          title: 'Quick Meditation',
          description: 'A personal meditation session',
          duration: durationMinutes,
          is_global: false
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
  }, [eventId, durationMinutes]);
  
  // Join session on component mount
  useEffect(() => {
    if (isLoading) return;
    
    const startSession = async () => {
      await joinSession({
        locationPrecision: privacySettings.locationSharingLevel,
        anonymous: privacySettings.useAnonymousId,
        shareTradition: privacySettings.shareTradition
      });
    };
    
    startSession();
    
    // Clean up on unmount - leave session
    return () => {
      leaveSession();
    };
  }, [isLoading, privacySettings]);
  
  // Handle sync errors
  useEffect(() => {
    if (syncError) {
      Alert.alert('Connection Error', syncError);
    }
  }, [syncError]);
  
  // Start meditation
  const handleStart = () => {
    setMeditationState('IN_PROGRESS');
  };
  
  // Complete meditation
  const handleComplete = () => {
    setMeditationState('COMPLETED');
    
    // Record completion in Supabase
    if (user) {
      const saveCompletion = async () => {
        try {
          await supabase
            .from('meditation_completions')
            .insert([
              {
                user_id: user.id,
                event_id: eventId as string || null,
                duration: durationSeconds - remainingTime,
                completed: true
              }
            ]);
            
          // Navigate to completion screen after a short delay
          setTimeout(() => {
            router.push({
              pathname: '/meditation/complete',
              params: { duration: (durationSeconds - remainingTime).toString() }
            });
          }, 2000);
        } catch (error: any) {
          console.error('Error recording meditation completion:', error);
          
          // Still navigate to completion screen even if there's an error
          router.push({
            pathname: '/meditation/complete',
            params: { duration: (durationSeconds - remainingTime).toString() }
          });
        }
      };
      
      saveCompletion();
    } else {
      // Navigate to completion screen for non-authenticated users
      setTimeout(() => {
        router.push({
          pathname: '/meditation/complete',
          params: { duration: (durationSeconds - remainingTime).toString() }
        });
      }, 2000);
    }
  };
  
  // Close the meditation screen
  const handleClose = () => {
    // Confirm before leaving if meditation is in progress
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
              leaveSession();
              router.back();
            }
          }
        ]
      );
    } else {
      leaveSession();
      router.back();
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Preparing your meditation...</Text>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Button 
          variant="text" 
          size="small" 
          onPress={handleClose}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Button>
        <Text style={styles.title}>{eventDetails?.title || 'Meditation'}</Text>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Live counter */}
        <LiveCounter count={participantCount || directCount} />
        
        {/* Meditation timer */}
        <Timer 
          duration={durationSeconds}
          remainingTime={remainingTime}
          setRemainingTime={setRemainingTime}
          state={meditationState}
          onComplete={handleComplete}
        />
        
        {/* Pulse visualizer - show when meditation is in progress */}
        <PulseVisualizer 
          isActive={meditationState === 'IN_PROGRESS'} 
          size={60}
          color="#1A2151"
        />
        
        {/* For now, we'll comment out the ParticipantMap until we create it */}
        {/*
        {privacySettings.locationSharingLevel !== 'none' && (
          <View style={styles.mapSection}>
            <Text style={styles.sectionTitle}>Meditating Together</Text>
            <ParticipantMap 
              locations={participantLocations} 
              userLocation={
                privacySettings.locationSharingLevel === 'precise' 
                  ? participantLocations.find(loc => 
                      user && loc.id.includes(user.id)
                    )?.location 
                  : null
              }
            />
            <Text style={styles.privacyNote}>
              <Ionicons name="shield-checkmark" size={12} color="#666666" /> 
              {' '}Location sharing level: {privacySettings.locationSharingLevel}
            </Text>
          </View>
        )}
        */}
        
        {/* Description */}
        {eventDetails?.description && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>About this meditation</Text>
            <Text style={styles.descriptionText}>{eventDetails.description}</Text>
          </View>
        )}
        
        {/* Start button - only show if in PREPARING state */}
        {meditationState === 'PREPARING' && (
          <View style={styles.buttonContainer}>
            <Button 
              onPress={handleStart}
              size="large"
              fullWidth
            >
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
    backgroundColor: '#1A2151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A2151',
  },
  loadingText: {
    color: 'white',
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
    color: 'white',
    textAlign: 'center',
  },
  placeholder: {
    width: 24, // Same as close icon
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mapSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A2151',
    marginBottom: 12,
  },
  privacyNote: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
  descriptionContainer: {
    padding: 16,
    backgroundColor: '#F8F8F8',
    margin: 16,
    borderRadius: 10,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A2151',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
    marginTop: 20,
  },
});