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
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../api/supabase';
import Button from '../common/Button';
import { FAITH_TRADITIONS } from '../faith/TraditionSelector';
import { usePrivacySettings } from '../../context/PrivacyContext';
import { UserProfile } from '../../context/AuthProvider';

interface RequestFormProps {
  onSubmit?: () => void;
  onCancel?: () => void;
}

export default function RequestForm({ onSubmit, onCancel }: RequestFormProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { privacySettings } = usePrivacySettings();
  
  const [requestType, setRequestType] = useState<'prayer' | 'healing' | 'vibe' | 'meditation'>('prayer');
  const [fullName, setFullName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && user && typeof user !== 'boolean') {
      // Upload image to Supabase Storage
      try {
        const ext = result.assets[0].uri.substring(result.assets[0].uri.lastIndexOf('.') + 1);
        const fileName = `${Date.now()}.${ext}`;
        const filePath = `${user.id}/${fileName}`;
        
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        
        const { data, error } = await supabase.storage
          .from('request-images')
          .upload(filePath, blob);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('request-images')
          .getPublicUrl(filePath);

        setImage(publicUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!focusArea) {
      Alert.alert('Required Field', 'Please specify what area you would like people to focus on.');
      return;
    }

    if (!user || typeof user === 'boolean') {
      Alert.alert('Error', 'You must be logged in to submit a request.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase
        .from('meditation_requests')
        .insert({
          user_id: user.id,
          request_type: requestType,
          tradition: user.faith_preferences?.primaryTradition,
          full_name: isAnonymous ? null : fullName,
          image_url: image,
          location: location || privacySettings.locationSharingLevel,
          location_precision: privacySettings.locationSharingLevel,
          focus_area: focusArea,
          desired_outcome: desiredOutcome,
          is_anonymous: isAnonymous
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Request Submitted',
        'Your request has been shared with the community.',
        [{ text: 'OK', onPress: onSubmit }]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
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
              <Image source={{ uri: image }} style={styles.selectedImage} />
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