import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '../api/supabase';

// Define privacy settings type
export type LocationSharingLevel = 'none' | 'country' | 'city' | 'precise';

export interface PrivacySettings {
  locationSharingLevel: LocationSharingLevel;
  useAnonymousId: boolean;
  shareTradition: boolean;
}

// Default privacy settings - most restrictive
const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  locationSharingLevel: 'none',
  useAnonymousId: true,
  shareTradition: false
};

// Define context type
interface PrivacyContextType {
  privacySettings: PrivacySettings;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  hasLocationPermission: boolean;
  requestLocationPermission: () => Promise<boolean>;
}

// Create the privacy context
const PrivacyContext = createContext<PrivacyContextType>({
  privacySettings: DEFAULT_PRIVACY_SETTINGS,
  updatePrivacySettings: async () => {},
  hasLocationPermission: false,
  requestLocationPermission: async () => false
});

// Create provider component
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // Load privacy settings from user profile
  useEffect(() => {
    if (user?.privacy_settings) {
      setPrivacySettings(user.privacy_settings as PrivacySettings);
    }
  }, [user]);

  // Update privacy settings
  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (!user) return;

    try {
      // Update local state
      const updatedSettings = { ...privacySettings, ...settings };
      setPrivacySettings(updatedSettings);

      // Update in database
      await supabase
        .from('users')
        .update({
          privacy_settings: updatedSettings
        })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating privacy settings:', error);
    }
  };

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      // Note: In a real implementation, you would use expo-location here
      // For now, we'll simulate this with a simple response
      
      // const { status } = await Location.requestForegroundPermissionsAsync();
      // const permissionGranted = status === 'granted';
      
      // Simulated permission grant for this example
      const permissionGranted = true;
      
      setHasLocationPermission(permissionGranted);
      return permissionGranted;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  };

  // Provide privacy context
  return (
    <PrivacyContext.Provider value={{
      privacySettings,
      updatePrivacySettings,
      hasLocationPermission,
      requestLocationPermission
    }}>
      {children}
    </PrivacyContext.Provider>
  );
}

// Create hook for using privacy context
export const usePrivacySettings = () => {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacySettings must be used within a PrivacyProvider');
  }
  return context;
};