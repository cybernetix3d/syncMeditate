import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/src/api/supabase';
import { router } from 'expo-router';
import Constants from 'expo-constants';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationType =
  | 'event_reminder'
  | 'daily_meditation'
  | 'community_activity'
  | 'system_notification';

interface NotificationData {
  type: NotificationType;
  eventId?: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

// Register for push notifications
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    let token;
    
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token: permission not granted');
      return null;
    }
    
    if (!Constants.expoConfig?.extra?.eas?.projectId) {
      console.log('No Expo project ID found in configuration');
      return null;
    }
    
    try {
      token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig.extra.eas.projectId,
      });
      
      if (!token || !token.data || typeof token.data !== 'string' || token.data.length < 10) {
        console.log('Received invalid token format:', token);
        return null;
      }
      
      return token.data;
    } catch (tokenError) {
      console.error('Error getting Expo push token:', tokenError);
      return null;
    }
  } catch (error) {
    console.error('Error in registerForPushNotificationsAsync:', error);
    return null;
  }
}

// Listen for notifications
export function setupNotificationListeners(onNotificationReceived: (notification: Notifications.Notification) => void) {
  const receivedSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { data } = response.notification.request.content;
    
    if (data.type === 'event_reminder' && data.eventId) {
      router.push(`/meditation/${data.eventId}`);
    }
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

// Schedule a local notification
export async function scheduleNotification({ 
  type, 
  title, 
  body, 
  data = {},
  trigger = null 
}: NotificationData & { trigger?: Notifications.NotificationTriggerInput }) {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type, ...data },
      },
      trigger,
    });
    
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

// Schedule an event reminder based on user preferences
export async function scheduleEventReminder(
  eventId: string,
  eventTitle: string,
  startTime: string
): Promise<string | null> {
  try {
    console.log(`Scheduling reminder for event: ${eventId}, "${eventTitle}", time: ${startTime}`);
    
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    
    if (!userId) {
      console.log('No user signed in, skipping reminder scheduling');
      return null;
    }
    
    const { data: settings } = await supabase
      .from('user_notification_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    const reminderMinutes = (settings && settings.event_reminders)
      ? settings.reminder_time
      : 15;
    
    if (!settings || !settings.event_reminders) {
      console.log('Event reminders disabled or no settings found - using default 15 minutes');
    }
    
    const eventDate = new Date(startTime);
    const reminderDate = new Date(eventDate.getTime() - reminderMinutes * 60000);
    
    const now = new Date();
    const delayMs = reminderDate.getTime() - now.getTime();
    const delayMinutes = Math.round(delayMs / 60000);
    
    console.log("startTime (raw):", startTime);
    console.log("Parsed eventDate (local):", eventDate.toString());
    console.log("Parsed eventDate (UTC):", eventDate.toISOString());
    console.log("Calculated reminderDate (local):", reminderDate.toString());
    console.log("Calculated reminderDate (UTC):", reminderDate.toISOString());
    console.log("NOW (local):", now.toString());
    console.log("NOW (UTC):", now.toISOString());
    console.log(`User setting: ${reminderMinutes} minutes. Actual delay from now: ${delayMinutes} minutes.`);
    
    if (delayMs <= 0) {
      console.log(`Reminder time is in the past (delay: ${delayMinutes} minutes), not scheduling`);
      return null;
    }
    
    console.log(`Scheduling reminder for "${eventTitle}" at ${reminderDate.toISOString()}`);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Meditation Reminder',
        body: `Your meditation event "${eventTitle}" starts in approximately ${delayMinutes} minutes.`,
        data: { eventId, type: 'event_reminder' },
      },
      trigger: {
        channelId: 'default',
        date: reminderDate,
      },
    });
    
    console.log(`Successfully scheduled notification ${notificationId} for ${reminderDate.toISOString()}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling event reminder:', error);
    return null;
  }
}

// Cancel a scheduled notification
export async function cancelNotification(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    return true;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
}

// Update database schema to support notification IDs
export async function updateRSVPSchemaForNotifications() {
  try {
    const sql = `
      ALTER TABLE public.event_rsvps
      ADD COLUMN IF NOT EXISTS notification_id TEXT;
    `;
    
    await supabase.rpc('execute_sql', { sql });
    console.log('RSVP schema updated for notifications');
    return true;
  } catch (error) {
    console.error('Error updating RSVP schema:', error);
    return false;
  }
}
