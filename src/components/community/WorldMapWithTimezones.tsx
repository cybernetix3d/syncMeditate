import React, { useState, useEffect } from 'react';
import { View, Image, Dimensions, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { COLORS } from '@/src/constants/Styles';
import { supabase } from '@/src/api/supabase';
import { useAuth } from '@/src/context/AuthProvider';

// Define the participant interface
interface Participant {
  id: string;
  name: string;
  timezone: string;
  x: number | string;
  y: number | string;
  isCurrentUser?: boolean;
}

interface WorldMapWithTimezonesProps {
  participants?: Participant[];
}

// Timezone to approximate map coordinates mapping
const timezonePositions: Record<string, { x: string, y: string }> = {
  'America/Los_Angeles': { x: '20%', y: '45%' },
  'America/Denver': { x: '23%', y: '45%' },
  'America/Chicago': { x: '25%', y: '45%' },
  'America/New_York': { x: '29%', y: '45%' },
  'America/Sao_Paulo': { x: '35%', y: '65%' },
  'Europe/London': { x: '47%', y: '40%' },
  'Europe/Paris': { x: '50%', y: '40%' },
  'Europe/Berlin': { x: '52%', y: '38%' },
  'Europe/Rome': { x: '52%', y: '42%' },
  'Africa/Johannesburg': { x: '55%', y: '70%' },
  'Asia/Dubai': { x: '62%', y: '48%' },
  'Asia/Kolkata': { x: '68%', y: '50%' },
  'Asia/Bangkok': { x: '74%', y: '55%' },
  'Asia/Shanghai': { x: '80%', y: '45%' },
  'Asia/Tokyo': { x: '85%', y: '45%' },
  'Australia/Sydney': { x: '87%', y: '70%' },
  'Pacific/Auckland': { x: '95%', y: '75%' },
  // Add more as needed
};

// Default fallback if we can't get timezone to a known position
const defaultPosition = { x: '50%', y: '50%' };

// Sample data for demonstration
const sampleParticipants: Participant[] = [
  { id: '2', name: 'Elsa', timezone: 'Europe/London', x: '50%', y: '40%' },
  { id: '3', name: 'Sam', timezone: 'America/New_York', x: '29%', y: '45%' },
  { id: '4', name: 'Priya', timezone: 'Asia/Kolkata', x: '70%', y: '50%' },
  { id: '5', name: 'Li', timezone: 'Asia/Shanghai', x: '80%', y: '45%' },
  { id: '6', name: 'Carlos', timezone: 'America/Sao_Paulo', x: '35%', y: '65%' },
  { id: '7', name: 'Yuki', timezone: 'Asia/Tokyo', x: '85%', y: '45%' },
];

const WorldMapWithTimezones: React.FC<WorldMapWithTimezonesProps> = ({ 
  participants: providedParticipants
}) => {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const mapWidth = Dimensions.get('window').width - 40; // 20px padding on each side
  const mapHeight = 250;

  useEffect(() => {
    // If participants are provided via props, use those
    if (providedParticipants) {
      setParticipants(providedParticipants);
      setLoading(false);
      return;
    }

    // Get the current user's timezone
    const currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    console.log('Current user timezone:', currentTimezone);
    
    // Get the position for this timezone
    const position = timezonePositions[currentTimezone] || defaultPosition;
    
    // Create a current user participant
    const currentUser: Participant = {
      id: 'current-user',
      name: typeof user === 'object' && user?.display_name ? user.display_name : 'Guest',
      timezone: currentTimezone,
      ...position,
      isCurrentUser: true
    };

    // Add current user to sample participants
    const allParticipants = [currentUser, ...sampleParticipants];

    // Set after a small delay to show loading state
    setTimeout(() => {
      setParticipants(allParticipants);
      setLoading(false);
    }, 500);
  }, [providedParticipants, user]);

  // Helper function to get UTC offset for a timezone
  const getUTCOffset = (timezone: string): string => {
    try {
      // Create a date object for the current time
      const now = new Date();
      
      // Format the date with the timezone and extract the GMT part
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        timeZoneName: 'short'
      });
      
      const parts = formatter.formatToParts(now);
      const timeZonePart = parts.find(part => part.type === 'timeZoneName');
      
      if (timeZonePart && timeZonePart.value) {
        // For formats like "GMT+2" extract and convert to "UTC+2"
        if (timeZonePart.value.startsWith('GMT')) {
          return timeZonePart.value.replace('GMT', 'UTC');
        }
      }
      
      // Calculate minutes offset from UTC
      const offsetMinutes = -now.getTimezoneOffset();
      const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      
      // Format as UTC±X:XX
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const formatted = `UTC${sign}${offsetHours}${offsetMins > 0 ? `:${offsetMins.toString().padStart(2, '0')}` : ''}`;
      
      return formatted;
    } catch (error) {
      console.error('Error calculating UTC offset:', error);
      return 'UTC';
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/world-map.png')}
        style={[styles.map, { width: mapWidth, height: mapHeight }]}
        resizeMode="contain"
      />

      {/* Place precise location dots for each participant */}
      {participants.map((participant) => (
        <View
          key={`dot-${participant.id}`}
          style={[
            styles.locationDot,
            participant.isCurrentUser && styles.currentUserDot,
            {
              position: 'absolute',
              left: participant.x,
              top: participant.y,
              transform: [{ translateX: -4 }, { translateY: -4 }], // Center the dot
            } as any,
          ]}
        />
      ))}

      {/* Place labels for each participant */}
      {participants.map((participant) => {
        const utcOffset = getUTCOffset(participant.timezone);
        // Calculate label position (slightly offset from dot)
        const labelPosition = participant.isCurrentUser 
          ? { marginTop: 8, marginLeft: -20 }  // Current user label positioned below the dot
          : { marginTop: -30, marginLeft: 10 }; // Other user labels positioned above and to the right
        
        return (
          <View
            key={participant.id}
            style={[
              styles.userMarker,
              participant.isCurrentUser && styles.currentUserMarker,
              {
                position: 'absolute',
                left: participant.x,
                top: participant.y,
                ...labelPosition,
              } as any,
            ]}
          >
            <Text style={[
              styles.label, 
              participant.isCurrentUser && styles.currentUserLabel
            ]}>
              {participant.name}
            </Text>
            <Text style={[
              styles.utcLabel,
              participant.isCurrentUser && styles.currentUserUtcLabel
            ]}>
              {utcOffset}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
    padding: 0,
    marginVertical: 10,
  },
  loadingContainer: {
    height: 250,
  },
  map: {
    borderRadius: 12,
  },
  locationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(13, 59, 102, 0.9)',
    borderWidth: 1,
    borderColor: 'white',
  },
  currentUserDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(238, 150, 75, 1)',
    borderWidth: 1.5,
    borderColor: 'white',
    // Add a subtle shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  userMarker: {
    backgroundColor: 'rgba(13, 59, 102, 0.85)', // Using app primary color with transparency
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  currentUserMarker: {
    backgroundColor: 'rgba(238, 150, 75, 0.9)', // Use accent color from COLORS
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  label: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '500',
  },
  utcLabel: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  currentUserLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  currentUserUtcLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default WorldMapWithTimezones; 