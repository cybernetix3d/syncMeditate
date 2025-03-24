import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';
import { COLORS } from '@/src/constants/Styles';
import { supabase } from '@/src/api/supabase';
import type { UserProfile } from '@/src/context/AuthProvider';
import { scheduleNotification } from '@/src/services/NotificationService';
import * as Notifications from 'expo-notifications';

// Type guard function
const isUserProfile = (user: null | boolean | UserProfile): user is UserProfile => {
  return user !== null && typeof user !== 'boolean' && 'id' in user;
};

interface NotificationSettings {
  event_reminders: boolean;
  reminder_time: number; // minutes before event
  daily_meditation_reminder: boolean;
  daily_reminder_time: string; // time of day for daily reminder (HH:MM format)
  community_notifications: boolean;
  system_notifications: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  event_reminders: true,
  reminder_time: 15, // 15 minutes before event by default
  daily_meditation_reminder: false,
  daily_reminder_time: '08:00', // 8:00 AM by default
  community_notifications: true,
  system_notifications: true
};

export default function NotificationsScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch user's notification settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!user || !isUserProfile(user)) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching notification settings:', error);
          Alert.alert('Error', 'Failed to load notification settings');
          return;
        }
        
        if (data) {
          setSettings({
            event_reminders: data.event_reminders ?? DEFAULT_SETTINGS.event_reminders,
            reminder_time: data.reminder_time ?? DEFAULT_SETTINGS.reminder_time,
            daily_meditation_reminder: data.daily_meditation_reminder ?? DEFAULT_SETTINGS.daily_meditation_reminder,
            daily_reminder_time: data.daily_reminder_time ?? DEFAULT_SETTINGS.daily_reminder_time,
            community_notifications: data.community_notifications ?? DEFAULT_SETTINGS.community_notifications,
            system_notifications: data.system_notifications ?? DEFAULT_SETTINGS.system_notifications
          });
        }
      } catch (error) {
        console.error('Error in fetchSettings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [user]);

  // Save settings to database
  const saveSettings = async () => {
    if (!user || !isUserProfile(user)) {
      Alert.alert('Error', 'You must be signed in to save settings');
      return;
    }
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Error saving notification settings:', error);
        Alert.alert('Error', 'Failed to save notification settings');
        return;
      }
      
      Alert.alert('Success', 'Notification settings saved successfully');
    } catch (error) {
      console.error('Error in saveSettings:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Toggle a boolean setting
  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Change reminder time
  const setReminderTime = (minutes: number) => {
    setSettings(prev => ({
      ...prev,
      reminder_time: minutes
    }));
  };

  // Render reminder time options
  const renderReminderTimeOptions = () => {
    const options = [5, 10, 15, 30, 60];
    
    return (
      <View style={styles.reminderTimeOptions}>
        {options.map(minutes => (
          <TouchableOpacity
            key={minutes}
            style={[
              styles.timeOption,
              settings.reminder_time === minutes && { 
                backgroundColor: colors.primary,
                borderColor: colors.primary 
              }
            ]}
            onPress={() => setReminderTime(minutes)}
          >
            <Text 
              style={[
                styles.timeOptionText, 
                settings.reminder_time === minutes && { color: colors.white }
              ]}
            >
              {minutes} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Test notification function
  const sendTestNotification = async () => {
    try {
      const notificationId = await scheduleNotification({
        type: 'system_notification',
        title: 'Test Notification',
        body: 'This is a test notification from Synkr',
        trigger: null // immediate notification
      });
      
      if (notificationId) {
        Alert.alert('Success', 'Test notification sent');
      } else {
        Alert.alert('Error', 'Failed to schedule test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.gray }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.headerText }]}>Notification Settings</Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>
            Manage how and when you receive notifications
          </Text>
        </View>

        {/* Event Reminders Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Event Reminders</Text>
          
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.bodyText, fontWeight: '500' }]}>
                  Event Reminders
                </Text>
                <Text style={[styles.settingDescription, { color: colors.gray }]}>
                  Get notified before events you've signed up for
                </Text>
              </View>
              <Switch
                value={settings.event_reminders}
                onValueChange={() => toggleSetting('event_reminders')}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={settings.event_reminders ? colors.accent : colors.white}
                ios_backgroundColor={colors.lightGray}
              />
            </View>
            
            {settings.event_reminders && (
              <>
                <View style={[styles.separator, { backgroundColor: colors.lightGray }]} />
                
                <View style={styles.settingsRow}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingLabel, { color: colors.bodyText }]}>
                      Reminder Time
                    </Text>
                    <Text style={[styles.settingDescription, { color: colors.gray }]}>
                      How long before events to send reminders
                    </Text>
                  </View>
                </View>
                
                {renderReminderTimeOptions()}
              </>
            )}
          </View>
        </View>

        {/* Daily Meditation Reminder */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Daily Reminders</Text>
          
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.bodyText, fontWeight: '500' }]}>
                  Daily Meditation Reminder
                </Text>
                <Text style={[styles.settingDescription, { color: colors.gray }]}>
                  Get a daily reminder to meditate
                </Text>
              </View>
              <Switch
                value={settings.daily_meditation_reminder}
                onValueChange={() => toggleSetting('daily_meditation_reminder')}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={settings.daily_meditation_reminder ? colors.accent : colors.white}
                ios_backgroundColor={colors.lightGray}
              />
            </View>
            
            {/* Time picker would go here */}
          </View>
        </View>

        {/* Other Notification Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Other Notifications</Text>
          
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.bodyText }]}>
                  Community Notifications
                </Text>
                <Text style={[styles.settingDescription, { color: colors.gray }]}>
                  Updates about community activity
                </Text>
              </View>
              <Switch
                value={settings.community_notifications}
                onValueChange={() => toggleSetting('community_notifications')}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
            
            <View style={[styles.separator, { backgroundColor: colors.lightGray }]} />
            
            <View style={styles.settingsRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.bodyText }]}>
                  System Notifications
                </Text>
                <Text style={[styles.settingDescription, { color: colors.gray }]}>
                  Important app updates and information
                </Text>
              </View>
              <Switch
                value={settings.system_notifications}
                onValueChange={() => toggleSetting('system_notifications')}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              { backgroundColor: colors.primary },
              saving && { opacity: 0.7 }
            ]}
            onPress={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color={colors.white} style={{ marginRight: 8 }} />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.testButton, 
              { backgroundColor: colors.surface, borderColor: colors.primary, borderWidth: 1, marginTop: 12 }
            ]}
            onPress={sendTestNotification}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.testButtonText, { color: colors.primary }]}>Test Notification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  settingsCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
  },
  separator: {
    height: 1,
    width: '100%',
  },
  reminderTimeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingTop: 0,
  },
  timeOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  testButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 