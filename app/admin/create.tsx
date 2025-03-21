// app/admin/create.tsx
import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthProvider';
import { supabase } from '../../src/api/supabase';
import { FAITH_TRADITIONS } from '../../src/components/faith/TraditionSelector';
import Button from '../../src/components/common/Button';
import { COLORS } from '../../src/constants/Styles';
import { useTheme } from '../../src/context/ThemeContext';
import type { UserProfile } from '../../src/context/AuthProvider';
import SimpleDatePicker from '../../src/components/common/SimpleDatePicker';

// Type guard function for UserProfile
const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile => {
  return user !== null && typeof user !== 'boolean' && 'id' in user;
};

export default function AdminCreateEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [duration, setDuration] = useState('20');
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [tradition, setTradition] = useState(FAITH_TRADITIONS[0].id);
  const [isGlobal, setIsGlobal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Recurring event state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('daily');
  
  // Admin specific options
  const [isSystemEvent, setIsSystemEvent] = useState(true);
  const [debug, setDebug] = useState<string[]>([]);
  
  // Check if user is admin
  const isAdmin = isUserProfile(user) && (user.email === 'timhart.sound@gmail.com' || user.is_admin === true);
  
  useEffect(() => {
    // Set mounted to true to indicate component is mounted
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only attempt navigation after component is mounted
    if (mounted && !isAdmin) {
      Alert.alert('Unauthorized', 'You do not have permission to access the admin panel.');
      // Use setTimeout to delay navigation slightly
      setTimeout(() => {
        router.replace('/');
      }, 100);
    }
  }, [isAdmin, mounted]);
  
  const addDebug = (message: string) => {
    setDebug(prev => [...prev, message]);
  };

  const validateForm = () => {
    addDebug('Validating form...');
    
    if (!title.trim()) {
      addDebug('Validation failed: Empty title');
      Alert.alert('Error', 'Please enter an event title');
      return false;
    }

    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum < 5 || durationNum > 180) {
      addDebug('Validation failed: Invalid duration');
      Alert.alert('Error', 'Duration must be between 5 and 180 minutes');
      return false;
    }

    addDebug('Form validation passed');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      addDebug('Creating admin event...');
      
      // Get current user ID
      let creatorId = null;
      if (isUserProfile(user)) {
        creatorId = user.id;
        addDebug(`Using admin user ID: ${creatorId}`);
      } else {
        addDebug('No user ID available, using null');
      }
      
      // Prepare event data
      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        start_time: date.toISOString(),
        duration: Number(duration),
        tradition,
        created_by: creatorId,
        is_global: isGlobal
      };
      
      // Try to add advanced fields if appropriate
      try {
        const fullEventData = {
          ...eventData,
          is_recurring: isRecurring,
          recurrence_type: isRecurring ? recurrenceType : null,
          is_system: isSystemEvent
        };
        
        addDebug(`Attempting to create event with full data: ${JSON.stringify(fullEventData)}`);
        
        const { data, error } = await supabase
          .from('meditation_events')
          .insert([fullEventData])
          .select('*')
          .single();
          
        if (error) {
          // If we get a schema error, try again with basic fields
          if (error.code === 'PGRST204' || error.message.includes('column') || error.message.includes('does not exist')) {
            throw new Error('Schema mismatch: ' + error.message);
          }
          
          addDebug(`Error: ${error.message}`);
          throw error;
        }
        
        addDebug(`Event created successfully with ID: ${data.id}`);
        
        Alert.alert(
          'Success',
          `Event "${data.title}" created successfully!`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } catch (schemaError) {
        // Try again with just the basic fields
        addDebug(`Schema error, trying with basic fields: ${schemaError instanceof Error ? schemaError.message : String(schemaError)}`);
        
        const { data, error } = await supabase
          .from('meditation_events')
          .insert([eventData])
          .select('*')
          .single();
          
        if (error) {
          addDebug(`Error with basic event creation: ${error.message}`);
          throw error;
        }
        
        addDebug(`Event created successfully with ID: ${data.id} (basic fields only)`);
        
        Alert.alert(
          'Success',
          `Event "${data.title}" created successfully! (Note: Advanced fields like recurring settings may not have been applied due to schema limitations)`,
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      addDebug(`Error: ${error instanceof Error ? error.message : String(error)}`);
      Alert.alert(
        'Error Creating Event',
        error instanceof Error ? error.message : 'Failed to create event. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderDateTimePicker = () => (
    <>
      <Text style={[styles.label, { color: colors.bodyText }]}>Date & Time</Text>
      <View style={styles.datePickerContainer}>
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
    </>
  );

  const renderDurationOptions = () => (
    <>
      <Text style={[styles.label, { color: colors.bodyText }]}>Duration (minutes)</Text>
      <View style={styles.optionsContainer}>
        {[5, 10, 15, 20, 30].map((mins) => (
          <TouchableOpacity
            key={mins}
            style={[
              styles.optionButton,
              { backgroundColor: !isCustomDuration && Number(duration) === mins ? colors.primary : colors.surface }
            ]}
            onPress={() => {
              setDuration(mins.toString());
              setIsCustomDuration(false);
            }}
          >
            <Text 
              style={{ 
                color: !isCustomDuration && Number(duration) === mins ? COLORS.white : colors.bodyText 
              }}
            >
              {mins} min
            </Text>
          </TouchableOpacity>
        ))}
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            { backgroundColor: isCustomDuration ? colors.primary : colors.surface }
          ]}
          onPress={() => setIsCustomDuration(true)}
        >
          <Text style={{ color: isCustomDuration ? COLORS.white : colors.bodyText }}>Custom</Text>
        </TouchableOpacity>
      </View>
      
      {isCustomDuration && (
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText }]}
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
          placeholder="Enter duration (5-180 minutes)"
          placeholderTextColor={colors.gray}
        />
      )}
    </>
  );

  const renderRecurringOptions = () => (
    <>
      <Text style={[styles.label, { color: colors.bodyText }]}>Recurring Event</Text>
      <View style={styles.toggleRow}>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.gray, true: colors.primary }}
          thumbColor={COLORS.white}
        />
        <Text style={{ color: colors.bodyText, marginLeft: 10 }}>
          {isRecurring ? 'Recurring event' : 'One-time event'}
        </Text>
      </View>
      
      {isRecurring && (
        <>
          <Text style={[styles.label, { color: colors.bodyText, marginTop: 10 }]}>Recurrence Pattern</Text>
          <View style={styles.optionsContainer}>
            {['daily', 'weekly', 'monthly'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.optionButton,
                  { backgroundColor: recurrenceType === type ? colors.primary : colors.surface }
                ]}
                onPress={() => setRecurrenceType(type)}
              >
                <Text style={{ color: recurrenceType === type ? COLORS.white : colors.bodyText }}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </>
  );

  const renderTraditionSelector = () => (
    <>
      <Text style={[styles.label, { color: colors.bodyText }]}>Faith Tradition</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.traditionsScroll}
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
              style={{
                color: tradition === t.id ? COLORS.white : colors.bodyText,
                marginLeft: 8,
                fontWeight: '600',
              }}
            >
              {t.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </>
  );

  const renderAdminOptions = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.primary }]}>Admin Options</Text>
      
      <Text style={[styles.label, { color: colors.bodyText }]}>Event Visibility</Text>
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            { backgroundColor: isGlobal ? colors.primary : colors.surface }
          ]}
          onPress={() => setIsGlobal(true)}
        >
          <Text style={{ color: isGlobal ? COLORS.white : colors.bodyText }}>Public (Global)</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.optionButton,
            { backgroundColor: !isGlobal ? colors.primary : colors.surface }
          ]}
          onPress={() => setIsGlobal(false)}
        >
          <Text style={{ color: !isGlobal ? COLORS.white : colors.bodyText }}>Private</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.label, { color: colors.bodyText }]}>Event Type</Text>
      <View style={styles.toggleRow}>
        <Switch
          value={isSystemEvent}
          onValueChange={setIsSystemEvent}
          trackColor={{ false: colors.gray, true: colors.primary }}
          thumbColor={COLORS.white}
        />
        <Text style={{ color: colors.bodyText, marginLeft: 10 }}>
          {isSystemEvent ? 'System Event' : 'Regular Event'}
        </Text>
      </View>
      {isSystemEvent && (
        <Text style={styles.helperText}>
          System events appear in the admin dashboard and can be managed separately from user events.
        </Text>
      )}
    </>
  );

  const renderDebugLog = () => (
    <View style={styles.debugContainer}>
      <Text style={styles.debugTitle}>Debug Log:</Text>
      <ScrollView style={styles.debugScroll}>
        {debug.map((message, index) => (
          <Text key={index} style={styles.debugText}>{message}</Text>
        ))}
      </ScrollView>
    </View>
  );

  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.bodyText }}>Unauthorized access. Redirecting...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView style={styles.scrollView}>
        <Text style={[styles.screenTitle, { color: colors.primary }]}>Create Admin Event</Text>
        
        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Event Details</Text>
          
          <Text style={[styles.label, { color: colors.bodyText }]}>Title</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter event title"
            placeholderTextColor={colors.gray}
          />
          
          <Text style={[styles.label, { color: colors.bodyText }]}>Description</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, color: colors.bodyText }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Enter event description"
            placeholderTextColor={colors.gray}
            multiline
            numberOfLines={4}
          />
          
          {renderDateTimePicker()}
          {renderDurationOptions()}
          {renderRecurringOptions()}
          {renderTraditionSelector()}
          {renderAdminOptions()}
          {renderDebugLog()}
        </View>
      </ScrollView>
      
      <View style={[styles.buttonContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={{ color: colors.bodyText }}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button, 
            { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={{ color: COLORS.white }}>Create Event</Text>
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
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  formSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
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
  datePickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  traditionsScroll: {
    marginBottom: 16,
  },
  traditionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  helperText: {
    fontSize: 12,
    color: '#777',
    marginTop: -10,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  debugContainer: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    maxHeight: 150,
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  debugScroll: {
    maxHeight: 100,
  },
  debugText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
    gap: 10,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});