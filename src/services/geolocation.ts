import * as Location from 'expo-location';

export enum LocationPrecision {
  PRECISE = 'precise',
  CITY = 'city',
  COUNTRY = 'country',
  NONE = 'none'
}

/**
 * Request location permissions from the user
 * @returns Boolean indicating if permission was granted
 */
export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting location permission:', error);
    return false;
  }
};

/**
 * Check current location permission status
 * @returns Boolean indicating if permission is granted
 */
export const checkLocationPermission = async (): Promise<boolean> => {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking location permission:', error);
    return false;
  }
};

/**
 * Get user location with privacy controls
 * @param precision Level of location precision to return
 * @returns Location object with appropriate precision or null
 */
export const getLocationWithPrivacy = async (
  precision: LocationPrecision = LocationPrecision.CITY
): Promise<{ latitude: number, longitude: number } | null> => {
  // Return null if no location sharing requested
  if (precision === LocationPrecision.NONE) {
    return null;
  }
  
  // Check if we have permission
  const hasPermission = await checkLocationPermission();
  if (!hasPermission) {
    const permissionGranted = await requestLocationPermission();
    if (!permissionGranted) {
      return null;
    }
  }
  
  try {
    // Get precise location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    
    // Apply privacy transformation based on precision level
    switch (precision) {
      case LocationPrecision.PRECISE:
        return {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
      case LocationPrecision.CITY:
        // Round to ~10km precision
        return {
          latitude: Math.round(location.coords.latitude * 10) / 10,
          longitude: Math.round(location.coords.longitude * 10) / 10
        };
      case LocationPrecision.COUNTRY:
        // Round to ~100km precision
        return {
          latitude: Math.round(location.coords.latitude),
          longitude: Math.round(location.coords.longitude)
        };
      default:
        return null;
    }
  } catch (error) {
    console.error('Error getting location:', error);
    return null;
  }
};

/**
 * Convert location to a Supabase POINT type
 * @param location Location object
 * @returns POINT string for Supabase
 */
export const locationToPoint = (
  location: { latitude: number, longitude: number } | null
): string | null => {
  if (!location) return null;
  
  return `POINT(${location.longitude} ${location.latitude})`;
};

/**
 * Parse POINT string from Supabase to a location object
 * @param point POINT string from Supabase
 * @returns Location object
 */
export const pointToLocation = (
  point: string | null
): { latitude: number, longitude: number } | null => {
  if (!point) return null;
  
  // Extract coordinates from POINT string
  // Format: "POINT(longitude latitude)"
  const match = point.match(/POINT\(([^ ]+) ([^)]+)\)/);
  if (!match) return null;
  
  const longitude = parseFloat(match[1]);
  const latitude = parseFloat(match[2]);
  
  return {
    latitude,
    longitude
  };
};