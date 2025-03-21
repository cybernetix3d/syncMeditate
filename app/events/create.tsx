import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { supabase, checkSupabaseConnection } from '@/src/api/supabase';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import Button from '@/src/components/common/Button';
import { COLORS } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';
import { UserProfile } from '@/src/context/AuthProvider';
import SimpleDatePicker from '@/src/components/common/SimpleDatePicker';

// Function to ensure proper permissions for guest users
const ensureGuestPermissions = async () => {
  try {
    console.log('Checking and creating guest permissions...');
    // Execute an RPC function to add the necessary policy
    await supabase.rpc('add_guest_event_permissions', {
      sql_command: `
        -- Create policy to allow anonymous (non-authenticated) users to create meditation events
        CREATE POLICY IF NOT EXISTS "Allow anonymous users to create events"
        ON meditation_events FOR INSERT
        WITH CHECK (true);
        
        -- Create policy to allow any user to view all meditation events
        CREATE POLICY IF NOT EXISTS "Anyone can view meditation events"
        ON meditation_events FOR SELECT
        USING (true);
      `
    });
    console.log('Guest permissions set successfully');
    return true;
  } catch (error) {
    console.error('Error setting guest permissions:', error);
    // If RPC function doesn't exist, this will fail silently
    // We'll still try to create the event anyway
    return false;
  }
};

export default function CreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState('20');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [tradition, setTradition] = useState(FAITH_TRADITIONS[0].id);
  const [isGlobal, setIsGlobal] = useState(true);
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    console.log('Starting form validation with:', { 
      title: title.trim(),
      duration: Number(duration),
      date: date.toISOString(),
      dateTime: date.getTime(),
      currentTime: new Date().getTime(),
      timeDiff: date.getTime() - new Date().getTime(),
      userType: typeof user,
      userValue: user
    });

    if (!title.trim()) {
      console.log('Validation failed: Empty title');
      Alert.alert('Error', 'Please enter an event title');
      return false;
    }

    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum < 5 || durationNum > 180) {
      console.log('Validation failed: Invalid duration', { duration: durationNum });
      Alert.alert('Error', 'Duration must be between 5 and 180 minutes');
      return false;
    }

    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();
    console.log('Time validation:', {
      eventTime: date.toISOString(),
      currentTime: now.toISOString(),
      differenceMs: timeDiff,
      differenceMins: Math.floor(timeDiff / (1000 * 60))
    });

    // Allow events that start within the next minute to account for form submission delay
    const ONE_MINUTE = 60 * 1000; // 1 minute in milliseconds
    if (timeDiff < -ONE_MINUTE) {
      console.log('Validation failed: Event time is in the past');
      Alert.alert('Error', 'Event time must be in the future');
      return false;
    }

    // We'll allow any user (including guests) to create events
    console.log('Form validation passed successfully with user:', user);
    return true;
  };

  const handleSubmit = async () => {
    console.log('Submit button pressed');
    if (!validateForm()) {
      console.log('Form validation failed');
      return;
    }
    
    try {
      setLoading(true);

      // Check Supabase connection
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to the database. Please check your internet connection and try again.');
      }
      
      // Get the current auth session (may be null for guest users)
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session (guest user), ensure proper permissions
      if (!session) {
        await ensureGuestPermissions();
      }
      
      // Use the authenticated user ID if available, otherwise use 'guest-user'
      const createdBy = session?.user?.id || 'guest-user';
      console.log('Creating event as:', createdBy);

      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        start_time: date.toISOString(),
        duration: Number(duration),
        tradition,
        created_by: createdBy,
        is_global: isGlobal,
      };

      console.log('Attempting to create event with data:', eventData);

      // First check if we can query the table
      const { count, error: countError } = await supabase
        .from('meditation_events')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.error('Error checking meditation_events table:', countError);
        throw new Error('Unable to access events table. Please try again.');
      }

      console.log('Current event count:', count);

      // Now try to insert the event
      const { data, error } = await supabase
        .from('meditation_events')
        .insert([eventData])
        .select('*')
        .single();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from event creation');
      }

      console.log('Event created successfully:', data);
      
      const formattedTime = new Date(date).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      // Show success message
      Alert.alert(
        'Success',
        `Event created successfully! Your meditation event is scheduled for ${formattedTime}`,
        [{ text: 'OK' }]
      );

      // Navigate back to events screen
      router.back();
      
    } catch (error: any) {
      console.error('Error creating event:', {
        error,
        message: error.message,
        details: error?.details,
        code: error?.code
      });
      Alert.alert(
        'Error Creating Event',
        error.message || 'Failed to create event. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderDateTimePickers = () => {
    return (
      <>
        <Text style={[styles.label, { color: colors.bodyText }]}>Date & Time</Text>
        <View style={styles.dateTimeContainer}>
          <View style={styles.dateTimeRow}>
            <SimpleDatePicker
              value={date}
              onChange={(newDate) => setDate(newDate)}
              mode="date"
            />
            
            <SimpleDatePicker
              value={date}
              onChange={(newDate) => setDate(newDate)}
              mode="time"
            />
          </View>
        </View>
      </>
    );
  };

  const renderDurationOptions = () => {
    return (
      <>
        <Text style={[styles.label, { color: colors.bodyText }]}>Duration (minutes)</Text>
        <View style={styles.durationOptionsContainer}>
          {[5, 10, 20].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.durationOption,
                { 
                  backgroundColor: 
                    !isCustomDuration && Number(duration) === mins 
                      ? COLORS.primary 
                      : colors.surface 
                }
              ]}
              onPress={() => {
                setDuration(mins.toString());
                setIsCustomDuration(false);
              }}
            >
              <Text 
                style={[
                  styles.durationText, 
                  { 
                    color: 
                      !isCustomDuration && Number(duration) === mins 
                        ? COLORS.white 
                        : colors.bodyText 
                  }
                ]}
              >
                {mins} min
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[
              styles.durationOption,
              { 
                backgroundColor: 
                  isCustomDuration 
                    ? COLORS.primary 
                    : colors.surface 
              }
            ]}
            onPress={() => setIsCustomDuration(true)}
          >
            <Text 
              style={[
                styles.durationText, 
                { 
                  color: 
                    isCustomDuration 
                      ? COLORS.white 
                      : colors.bodyText 
                }
              ]}
            >
              Custom
            </Text>
          </TouchableOpacity>
        </View>
        
        {isCustomDuration && (
          <View style={styles.customDurationContainer}>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: colors.surface, color: colors.bodyText }
              ]}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="Enter duration (5-180 minutes)"
              placeholderTextColor={colors.subtitleText}
            />
          </View>
        )}
      </>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.bodyText }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter event title"
            placeholderTextColor={colors.gray}
          />

          <Text style={[styles.label, { color: colors.bodyText }]}>Description (Optional)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, color: colors.bodyText }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter event description"
            placeholderTextColor={colors.gray}
            multiline
            numberOfLines={4}
          />

          {renderDateTimePickers()}

          {renderDurationOptions()}

          <Text style={[styles.label, { color: colors.bodyText }]}>Faith Tradition</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.traditionsContainer}
          >
            {FAITH_TRADITIONS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.traditionButton,
                  { backgroundColor: tradition === t.id ? t.color : colors.surface }
                ]}
                onPress={() => setTradition(t.id)}
              >
                <Ionicons 
                  name={t.icon as any} 
                  size={20} 
                  color={tradition === t.id ? COLORS.white : colors.gray} 
                />
                <Text 
                  style={[
                    styles.traditionText,
                    { color: tradition === t.id ? COLORS.white : colors.bodyText }
                  ]}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.toggleContainer}>
            <Text style={[styles.label, { color: colors.bodyText }]}>Make Event Global</Text>
            <View style={styles.cardButtonContainer}>
              <TouchableOpacity
                style={[styles.cardButton, { backgroundColor: isGlobal ? colors.primary : colors.surface }]}
                onPress={() => setIsGlobal(true)}
              >
                <Ionicons name="globe-outline" size={24} color={isGlobal ? COLORS.white : colors.primary} />
                <Text style={[styles.buttonText, { color: isGlobal ? COLORS.white : colors.bodyText }]}>
                  Public Event
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cardButton, { backgroundColor: !isGlobal ? colors.primary : colors.surface }]}
                onPress={() => setIsGlobal(false)}
              >
                <Ionicons name="person-outline" size={24} color={!isGlobal ? COLORS.white : colors.primary} />
                <Text style={[styles.buttonText, { color: !isGlobal ? COLORS.white : colors.bodyText }]}>
                  Private Event
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.buttonStyle, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={[styles.buttonTextStyle, { color: colors.bodyText }]}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.buttonStyle, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={[styles.buttonTextStyle, { color: COLORS.white }]}>Create Event</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  form: {
    marginBottom: 60,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    borderRadius: 8,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    padding: 10,
  },
  dateTimeContainer: {
    marginBottom: 24,
    width: '100%',
  },
  dateTimeRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationOptionsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  durationOption: {
    flex: 1,
    padding: 12,
    borderRadius: 24,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  durationText: {
    fontWeight: '500',
  },
  customDurationContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  cardButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginRight: 16,
    borderRadius: 8,
  },
  buttonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0, 
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 16,
  },
  buttonStyle: {
    flex: 1,
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextStyle: {
    fontSize: 16,
    fontWeight: '500',
  },
  traditionsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  traditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  traditionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 5,
  },
  toggleHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  durationContainer: {
    marginBottom: 20,
  },
  durationPresets: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customDurationInput: {
    flex: 1,
    marginBottom: 0,
    marginRight: 10,
  },
  customDurationLabel: {
    fontSize: 16,
    fontWeight: '400',
  },
}); 