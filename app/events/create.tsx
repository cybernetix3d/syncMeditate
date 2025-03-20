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
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { supabase, checkSupabaseConnection } from '@/src/api/supabase';
import { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import Button from '@/src/components/common/Button';
import { COLORS } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';
import { UserProfile } from '@/src/context/AuthProvider';

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      newDate.setHours(date.getHours(), date.getMinutes());
      setDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDate(newDate);
    }
  };

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

    // Check if user exists and is a UserProfile object
    if (!user) {
      console.log('Validation failed: No user');
      Alert.alert('Error', 'You must be signed in to create an event');
      return false;
    }

    if (typeof user === 'boolean') {
      console.log('Validation failed: User is boolean type');
      Alert.alert('Error', 'Invalid user state. Please try signing out and back in.');
      return false;
    }

    // Check if user has an ID
    if (!('id' in user)) {
      console.log('Validation failed: User object missing ID');
      Alert.alert('Error', 'Invalid user profile. Please try signing out and back in.');
      return false;
    }

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
      
      // Ensure the user is properly typed and has an ID
      if (!user || typeof user === 'boolean') {
        throw new Error('User not properly authenticated');
      }

      const userId = (user as UserProfile).id;
      console.log('User ID:', userId);

      // Get the current session to verify the actual auth.uid()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error('Failed to verify authentication. Please try signing in again.');
      }

      if (!session?.user?.id) {
        throw new Error('No authenticated user found. Please sign in again.');
      }

      console.log('Auth user ID:', session.user.id);

      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        start_time: date.toISOString(),
        duration: Number(duration),
        tradition,
        created_by: session.user.id, // Use the auth user ID instead of profile ID
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

          <Text style={[styles.label, { color: colors.bodyText }]}>Date & Time</Text>
          <View style={styles.dateTimeContainer}>
            {Platform.OS === 'web' ? (
              <input
                type="datetime-local"
                value={date.toISOString().slice(0, 16)}
                onChange={(e) => {
                  if (e.target.value) {
                    setDate(new Date(e.target.value));
                  }
                }}
                style={{
                  height: 48,
                  borderRadius: 8,
                  padding: '0 16px',
                  fontSize: 16,
                  backgroundColor: colors.surface,
                  color: colors.bodyText,
                  border: 'none',
                  width: '100%'
                }}
              />
            ) : (
              <>
                <TouchableOpacity 
                  style={[styles.dateTimePicker, { backgroundColor: colors.surface }]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={colors.gray} />
                  <Text style={[styles.dateTimeText, { color: colors.bodyText }]}>
                    {date.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.dateTimePicker, { backgroundColor: colors.surface }]}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Ionicons name="time-outline" size={20} color={colors.gray} />
                  <Text style={[styles.dateTimeText, { color: colors.bodyText }]}>
                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                {(showDatePicker || showTimePicker) && (
                  <DateTimePicker
                    value={date}
                    mode={showDatePicker ? 'date' : 'time'}
                    onChange={showDatePicker ? handleDateChange : handleTimeChange}
                  />
                )}
              </>
            )}
          </View>

          <Text style={[styles.label, { color: colors.bodyText }]}>Duration (minutes)</Text>
          <View style={styles.durationContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.durationPresets}
            >
              {[5, 10, 20].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.durationButton,
                    { 
                      backgroundColor: !isCustomDuration && Number(duration) === preset 
                        ? colors.primary 
                        : colors.surface 
                    }
                  ]}
                  onPress={() => {
                    setDuration(preset.toString());
                    setIsCustomDuration(false);
                  }}
                >
                  <Text 
                    style={[
                      styles.durationButtonText,
                      { 
                        color: !isCustomDuration && Number(duration) === preset 
                          ? COLORS.white 
                          : colors.bodyText 
                      }
                    ]}
                  >
                    {preset} min
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.durationButton,
                  { 
                    backgroundColor: isCustomDuration 
                      ? colors.primary 
                      : colors.surface 
                  }
                ]}
                onPress={() => setIsCustomDuration(true)}
              >
                <Text 
                  style={[
                    styles.durationButtonText,
                    { 
                      color: isCustomDuration 
                        ? COLORS.white 
                        : colors.bodyText 
                    }
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </ScrollView>
            
            {isCustomDuration && (
              <View style={styles.customDurationContainer}>
                <TextInput
                  style={[
                    styles.input, 
                    styles.customDurationInput,
                    { 
                      backgroundColor: colors.surface, 
                      color: colors.bodyText 
                    }
                  ]}
                  value={duration}
                  onChangeText={setDuration}
                  placeholder="Enter minutes"
                  placeholderTextColor={colors.gray}
                  keyboardType="number-pad"
                />
                <Text style={[styles.customDurationLabel, { color: colors.bodyText }]}>
                  minutes
                </Text>
              </View>
            )}
          </View>

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
            <TouchableOpacity
              style={[
                styles.toggle,
                { backgroundColor: isGlobal ? colors.primary : colors.surface }
              ]}
              onPress={() => setIsGlobal(!isGlobal)}
            >
              <View style={[
                styles.toggleHandle,
                { 
                  backgroundColor: COLORS.white,
                  transform: [{ translateX: isGlobal ? 20 : 0 }]
                }
              ]} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {Platform.OS === 'web' ? (
          <>
            <style>
              {`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
                .spinner {
                  width: 20px;
                  height: 20px;
                  border-radius: 50%;
                  border: 2px solid white;
                  border-top-color: transparent;
                  animation: spin 1s linear infinite;
                }
              `}
            </style>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => router.back()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  backgroundColor: colors.secondary,
                  color: COLORS.white,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 8,
                  backgroundColor: colors.primary,
                  color: COLORS.white,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  'Create Event'
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              onPress={() => router.back()}
              style={styles.footerButton}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSubmit}
              loading={loading}
              style={styles.footerButton}
              disabled={loading}
            >
              Create Event
            </Button>
          </>
        )}
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
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 20,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  dateTimePicker: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginRight: 10,
  },
  dateTimeText: {
    fontSize: 16,
    marginLeft: 8,
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
  customDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
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