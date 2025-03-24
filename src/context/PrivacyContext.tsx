import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import { useAuth } from './AuthProvider';
import { UserProfile } from './AuthProvider';

export interface PrivacySettings {
  locationSharingLevel: 'none' | 'country' | 'state' | 'city' | 'precise';
  useAnonymousId: boolean;
  shareTradition: boolean;
}

interface PrivacyContextType {
  privacySettings: PrivacySettings | null;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
}

const defaultSettings: PrivacySettings = {
  locationSharingLevel: 'none',
  useAnonymousId: false,
  shareTradition: true,
};

const PrivacyContext = createContext<PrivacyContextType>({
  privacySettings: null,
  updatePrivacySettings: async () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);

  useEffect(() => {
    if (user && typeof user !== 'boolean') {
      loadPrivacySettings();
    } else {
      setPrivacySettings(null);
    }
  }, [user]);

  const loadPrivacySettings = async () => {
    if (user && typeof user !== 'boolean') {
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        // Create default settings if none exist
        const { data: newData, error: createError } = await supabase
          .from('user_privacy_settings')
          .insert([{ user_id: user.id, ...defaultSettings }])
          .select()
          .single();

        if (!createError && newData) {
          setPrivacySettings(newData);
        }
      } else {
        setPrivacySettings(data);
      }
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (user && typeof user !== 'boolean' && privacySettings) {
      const updatedSettings = { ...privacySettings, ...settings };
      const { error } = await supabase
        .from('user_privacy_settings')
        .update(settings)
        .eq('user_id', user.id);

      if (!error) {
        setPrivacySettings(updatedSettings);
      }
    }
  };

  return (
    <PrivacyContext.Provider value={{ privacySettings, updatePrivacySettings }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacySettings() {
  return useContext(PrivacyContext);
} 