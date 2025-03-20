import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { ParticipantLocation } from '../../hooks/useRealTimeParticipants';

interface ParticipantMapProps {
  locations: ParticipantLocation[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
}

/**
 * Map component showing meditation participants globally
 * with privacy-focused implementation
 */
const ParticipantMap: React.FC<ParticipantMapProps> = ({
  locations,
  initialRegion = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 100,
    longitudeDelta: 100,
  },
  userLocation = null,
}) => {
  const [region, setRegion] = useState(initialRegion);
  
  // Group nearby participants for city-level precision
  const groupParticipants = () => {
    const groups: { [key: string]: ParticipantLocation[] } = {};
    
    locations.forEach(location => {
      // For city-level precision, round to first decimal place
      // For country-level precision, round to whole number
      const latPrecision = location.precision === 'city' ? 1 : 0;
      const lngPrecision = location.precision === 'city' ? 1 : 0;
      
      const lat = location.location.latitude.toFixed(latPrecision);
      const lng = location.location.longitude.toFixed(lngPrecision);
      const key = `${lat},${lng}`;
      
      if (!groups[key]) {
        groups[key] = [];
      }
      
      groups[key].push(location);
    });
    
    return Object.entries(groups).map(([key, participants]) => {
      const [lat, lng] = key.split(',').map(Number);
      
      return {
        key,
        count: participants.length,
        coordinate: {
          latitude: lat,
          longitude: lng,
        },
        // Get the most specific precision level in the group
        precision: participants.some(p => p.precision === 'precise') 
          ? 'precise' 
          : participants.some(p => p.precision === 'city') 
            ? 'city' 
            : 'country',
        // Collect unique traditions
        traditions: [...new Set(participants.map(p => p.tradition).filter(Boolean))]
      };
    });
  };
  
  const groupedLocations = groupParticipants();
  
  // Get marker size based on participant count and precision
  const getMarkerSize = (count: number, precision: string) => {
    const baseSize = precision === 'precise' ? 20 : precision === 'city' ? 30 : 40;
    const scaleFactor = Math.min(count / 5, 3); // Cap at 3x size
    
    return baseSize * (1 + scaleFactor * 0.5);
  };
  
  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={initialRegion}
        region={region}
        onRegionChangeComplete={setRegion}
        maxZoomLevel={10} // Limit zoom to protect privacy
      >
        {/* Show participant clusters */}
        {groupedLocations.map(group => (
          <Marker
            key={group.key}
            coordinate={group.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View 
              style={[
                styles.markerContainer,
                { 
                  width: getMarkerSize(group.count, group.precision),
                  height: getMarkerSize(group.count, group.precision),
                  backgroundColor: group.precision === 'precise' 
                    ? '#1A2151' 
                    : group.precision === 'city' 
                      ? 'rgba(26, 33, 81, 0.8)' 
                      : 'rgba(26, 33, 81, 0.6)',
                }
              ]}
            >
              <Text style={styles.markerText}>{group.count}</Text>
            </View>
            
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>
                  {group.count} {group.count === 1 ? 'Meditator' : 'Meditators'}
                </Text>
                
                <Text style={styles.calloutSubtitle}>
                  Location Precision: {
                    group.precision === 'precise' 
                      ? 'Exact' 
                      : group.precision === 'city' 
                        ? 'City' 
                        : 'Country'
                  }
                </Text>
                
                {group.traditions.length > 0 && (
                  <View style={styles.traditionsContainer}>
                    <Text style={styles.traditionsTitle}>Traditions:</Text>
                    {group.traditions.map((tradition, index) => (
                      <Text key={index} style={styles.traditionText}>
                        • {tradition}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
        
        {/* Show user's location if available */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarkerContainer}>
              <Ionicons name="person" size={14} color="#FFFFFF" />
            </View>
          </Marker>
        )}
      </MapView>
      
      {/* Privacy badge */}
      <View style={styles.privacyBadge}>
        <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
        <Text style={styles.privacyText}>Privacy-Focused Map</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  markerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  userMarkerContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4A6FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  calloutContainer: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  calloutSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  traditionsContainer: {
    marginTop: 5,
  },
  traditionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  traditionText: {
    fontSize: 12,
    color: '#666',
  },
  privacyBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(26, 33, 81, 0.7)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  privacyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
});

export default ParticipantMap;