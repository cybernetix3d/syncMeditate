import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform
} from 'react-native';
import { decode as base64Decode } from 'base-64';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthProvider';
import { supabase, fixDatabaseSchema } from '../../api/supabase';
import Button from '../common/Button';
import { FAITH_TRADITIONS } from '../faith/TraditionSelector';
import { usePrivacySettings, PrivacySettings } from '../../context/PrivacyContext';
import { UserProfile } from '../../context/AuthProvider';

interface RequestFormProps {
  onSubmit?: () => void;
  onCancel?: () => void;
}

export default function RequestForm({ onSubmit, onCancel }: RequestFormProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { privacySettings } = usePrivacySettings();
  
  // Default privacy settings if none are loaded
  const defaultPrivacySettings: PrivacySettings = {
    locationSharingLevel: 'none',
    useAnonymousId: false,
    shareTradition: true,
  };

  // Use loaded settings or defaults
  const currentSettings = privacySettings || defaultPrivacySettings;
  
  const [requestType, setRequestType] = useState<'prayer' | 'healing' | 'vibe' | 'meditation'>('prayer');
  const [fullName, setFullName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web code remains the same
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        const fileSelected = new Promise<File>((resolve) => {
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              resolve(file);
            }
          };
        });
        
        input.click();
        
        const file = await fileSelected;
        await uploadImage(file);
      } else {
        // For mobile, we just need a valid URI
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera roll permissions to upload an image.');
          return;
        }
  
        // Don't request base64, it's not needed
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
  
        console.log('Image picker result:', {
          canceled: result.canceled,
          assets: result.assets ? result.assets.length : 0
        });
  
        if (!result.canceled && result.assets && result.assets[0]) {
          console.log('Selected asset URI:', result.assets[0].uri);
          await uploadImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (source: string | File) => {
    try {
      if (!user || typeof user === 'boolean') {
        throw new Error('No valid user profile');
      }
  
      // Generate file name with timestamp and random string for uniqueness
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `${user.id}/${timestamp}-${random}.jpeg`;
      
      console.log('Uploading as:', fileName);
  
      if (source instanceof File) {
        // For web, use File directly (known to work)
        const { error } = await supabase.storage
          .from('meditation-requests')
          .upload(fileName, source, {
            contentType: 'image/jpeg',
            upsert: false
          });
  
        if (error) throw error;
      } else {
        // For mobile platforms, use React Native's native image picker approach
        // First, let's try a more direct approach with the Supabase client
        
        // Create a simple file object that matches what the storage API expects
        const fileObject = {
          uri: source,
          name: fileName,
          type: 'image/jpeg'
        };
        
        console.log('Uploading with fileObject:', { uri: source.substring(0, 50) + '...' });
        
        // Try to upload directly with the file object
        const { error } = await supabase.storage
          .from('meditation-requests')
          .upload(fileName, fileObject as any, {
            contentType: 'image/jpeg',
            upsert: false
          });
  
        if (error) throw error;
      }
  
      console.log('Upload successful, getting URL...');
  
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('meditation-requests')
        .getPublicUrl(fileName);
  
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
  
      // Set the image URL with a cache-busting query parameter
      const formattedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      console.log('Generated public URL:', formattedUrl);
      setImage(formattedUrl);
  
    } catch (error: any) {
      console.error('Full error details:', error);
      Alert.alert(
        'Upload Error',
        `Failed to upload image: ${error?.message || 'Unknown error'}. Please try again.`
      );
    }
  };

  const handleSubmit = async () => {
    if (!user || typeof user === 'boolean') {
      Alert.alert('Error', 'Please sign in to submit a request.');
      return;
    }

    if (!focusArea) {
      Alert.alert('Required Field', 'Please specify what area you would like people to focus on.');
      return;
    }

    try {
      console.log('Submitting request:', {
        requestType,
        focusArea,
        image,
        location,
        locationPrecision: currentSettings.locationSharingLevel,
        userId: user.id,
        tradition: user.faith_preferences?.primaryTradition
      });

      // First ensure the table exists
      await fixDatabaseSchema();

      // Submit the request
      const { data, error } = await supabase
        .from('meditation_requests')
        .insert([
          {
            user_id: user.id,
            request_type: requestType,
            tradition: user.faith_preferences?.primaryTradition,
            full_name: isAnonymous ? null : fullName,
            image_url: image,
            location: location || null,
            location_precision: currentSettings.locationSharingLevel,
            focus_area: focusArea.trim(),
            desired_outcome: desiredOutcome.trim() || null,
            is_anonymous: isAnonymous,
            is_active: true
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error submitting request:', error);
        if (error.code === 'PGRST204') {
          Alert.alert('Error', 'The meditation_requests table does not exist. Please try again in a moment.');
        } else if (error.code === '42501') {
          Alert.alert('Error', 'You do not have permission to create meditation requests.');
        } else if (error.code === '23503') {
          Alert.alert('Error', 'Invalid tradition selected. Please update your faith preferences.');
        } else {
          Alert.alert('Error', `Failed to submit request: ${error.message}`);
        }
        return;
      }

      console.log('Request submitted successfully:', data);
      onSubmit?.();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred while submitting your request. Please try again.'
      );
    }
  };

  const getRequestTypeLabel = () => {
    if (!user || typeof user === 'boolean') return 'Request';
    
    const tradition = FAITH_TRADITIONS.find(t => t.id === user.faith_preferences?.primaryTradition);
    switch (requestType) {
      case 'prayer':
        return tradition?.prayerLabel || 'Prayer';
      case 'healing':
        return tradition?.healingLabel || 'Healing';
      case 'vibe':
        return 'Good Vibes';
      case 'meditation':
        return 'Meditation Focus';
      default:
        return 'Request';
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.typeSelector}>
        {['prayer', 'healing', 'vibe', 'meditation'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              { backgroundColor: requestType === type ? colors.primary : colors.surface },
            ]}
            onPress={() => setRequestType(type as any)}
          >
            <Text
              style={[
                styles.typeButtonText,
                { color: requestType === type ? colors.white : colors.gray },
              ]}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.form}>
        {!isAnonymous && (
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.primary }]}
            placeholder="Your Name (optional)"
            placeholderTextColor={colors.gray}
            value={fullName}
            onChangeText={setFullName}
          />
        )}

        <View style={styles.imageSection}>
          <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
          {image ? (
            <Image 
              source={{ 
                uri: image,
                cache: 'reload'
              }} 
              style={styles.selectedImage} 
              onError={(e) => console.error('Image loading error:', e.nativeEvent.error)}
            />
          ) : (
            <View style={[styles.imagePickerPlaceholder, { backgroundColor: colors.surface }]}>
              <Ionicons name="image-outline" size={24} color={colors.gray} />
              <Text style={[styles.imagePickerText, { color: colors.gray }]}>Add Photo</Text>
            </View>
          )}
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.primary }]}
          placeholder="Location (optional)"
          placeholderTextColor={colors.gray}
          value={location}
          onChangeText={setLocation}
        />

        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, color: colors.primary }]}
          placeholder={`What would you like the community to focus on during their ${getRequestTypeLabel().toLowerCase()}?`}
          placeholderTextColor={colors.gray}
          value={focusArea}
          onChangeText={setFocusArea}
          multiline
          numberOfLines={4}
        />

        <TextInput
          style={[styles.textArea, { backgroundColor: colors.surface, color: colors.primary }]}
          placeholder="How would you like to feel? (optional)"
          placeholderTextColor={colors.gray}
          value={desiredOutcome}
          onChangeText={setDesiredOutcome}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={styles.anonymousToggle}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <Ionicons
            name={isAnonymous ? 'checkbox' : 'square-outline'}
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.anonymousText, { color: colors.primary }]}>
            Keep my request anonymous
          </Text>
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleSubmit}
            disabled={isSubmitting}
            loading={isSubmitting}
            fullWidth
          >
            Submit Request
          </Button>
          {onCancel && (
            <Button
              variant="text"
              onPress={onCancel}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  typeButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    padding: 16,
    gap: 16,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  imageSection: {
    alignItems: 'center',
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 60,
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  anonymousText: {
    fontSize: 16,
  },
  buttonContainer: {
    gap: 8,
  },
  cancelButton: {
    marginTop: 8,
  },
}); 