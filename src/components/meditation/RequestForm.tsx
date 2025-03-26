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
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../api/supabase';
import Button from '../common/Button';
import { FAITH_TRADITIONS } from '../faith/TraditionSelector';
import { usePrivacySettings, PrivacySettings } from '../../context/PrivacyContext';

interface RequestFormProps {
  onSubmit?: () => void;
  onCancel?: () => void;
}

// Web-only component using pure HTML elements
const WebForm = ({ onSubmit, onCancel, colors }: RequestFormProps & { colors: any }) => {
  const { user } = useAuth();
  const { privacySettings } = usePrivacySettings();
  
  const defaultPrivacySettings: PrivacySettings = {
    locationSharingLevel: 'none',
    useAnonymousId: false,
    shareTradition: true,
  };

  const currentSettings = privacySettings || defaultPrivacySettings;
  
  const [requestType, setRequestType] = useState<'prayer' | 'healing' | 'vibe' | 'meditation'>('prayer');
  const [fullName, setFullName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const getRequestTypeLabel = () => {
    if (!user || typeof user === 'boolean') return 'Request';
    
    const tradition = FAITH_TRADITIONS.find(t => t.id === user.faith_preferences?.primaryTradition);
    switch (requestType) {
      case 'prayer': return tradition?.prayerLabel || 'Prayer';
      case 'healing': return tradition?.healingLabel || 'Healing';
      case 'vibe': return 'Good Vibes';
      case 'meditation': return 'Meditation Focus';
      default: return 'Request';
    }
  };
  
  const pickImage = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            if (!user || typeof user === 'boolean') {
              throw new Error('No valid user profile');
            }
            
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const fileName = `${user.id}/${timestamp}-${random}.jpeg`;
            
            const { error } = await supabase.storage
              .from('meditation-requests')
              .upload(fileName, file, {
                contentType: 'image/jpeg',
                upsert: false
              });
    
            if (error) throw error;
            
            const { data: urlData } = supabase.storage
              .from('meditation-requests')
              .getPublicUrl(fileName);
          
            if (!urlData?.publicUrl) {
              throw new Error('Failed to get public URL for uploaded file');
            }
          
            const formattedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            setImage(formattedUrl);
          } catch (error: any) {
            console.error('Upload error:', error);
            alert(`Failed to upload image: ${error?.message || 'Unknown error'}`);
          }
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image. Please try again.');
    }
  };
  
  const handleSubmit = async () => {
    if (!user || typeof user === 'boolean') {
      alert('Error: Please sign in to submit a request.');
      return;
    }

    if (!focusArea) {
      alert('Required Field: Please specify what area you would like people to focus on.');
      return;
    }

    try {
      setIsSubmitting(true);

      const { error } = await supabase
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
        ]);

      if (error) {
        console.error('Error submitting request:', error);
        alert(`Failed to submit request: ${error.message}`);
        return;
      }

      onSubmit?.();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An unexpected error occurred while submitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const formStyle = {
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    padding: '15px',
    backgroundColor: 'transparent',
    borderRadius: '12px',
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    overflowY: 'auto' as const,
    maxHeight: '82vh',
  };
  
  const typeSelectorStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
  };
  
  const buttonStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '8px 10px',
    backgroundColor: isActive ? colors.primary : 'rgba(255, 255, 255, 0.07)',
    color: isActive ? colors.white : 'rgba(255, 255, 255, 0.7)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 500 as const,
    fontSize: '14px',
    transition: 'all 0.2s ease',
  });
  
  const inputStyle = {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    marginBottom: '16px',
    outline: 'none' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    color: 'white',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    ':focus': {
      borderColor: colors.primary,
      boxShadow: `0 0 0 2px ${colors.primary}25`,
    }
  };
  
  const textareaStyle = {
    ...inputStyle,
    minHeight: '120px',
    resize: 'vertical' as const,
    lineHeight: '1.5',
  };
  
  const imagePickerStyle = {
    width: '120px',
    height: '120px',
    borderRadius: '60px',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    cursor: 'pointer',
    overflow: 'hidden',
    margin: '20px auto',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  };
  
  const selectedImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  };
  
  const checkboxStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    cursor: 'pointer',
  };
  
  const submitButtonStyle = {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    cursor: isSubmitting ? 'default' : 'pointer',
    opacity: isSubmitting ? 0.7 : 1,
    width: '100%',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    transition: 'background-color 0.2s ease, transform 0.1s ease',
  };
  
  const cancelButtonStyle = {
    backgroundColor: 'transparent',
    color: colors.primary,
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    cursor: isSubmitting ? 'default' : 'pointer',
    marginTop: '8px',
    width: '100%',
    fontSize: '16px',
    fontWeight: '500',
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    transition: 'background-color 0.2s ease',
  };
  
  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '14px',
    fontWeight: '500' as const,
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    color: 'white',
  };
  
  const sectionStyle = {
    marginBottom: '20px',
  };
  
  return (
    <div style={{
      width: '100%', 
      height: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '5px',
      overflowX: 'hidden',
      backgroundColor: 'transparent'
    }}>
      <div style={formStyle}>
        <div style={typeSelectorStyle}>
          {['prayer', 'healing', 'vibe', 'meditation'].map((type) => (
            <button
              key={type}
              style={buttonStyle(requestType === type)}
              onClick={() => setRequestType(type as any)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
        
        <div style={sectionStyle}>
          {!isAnonymous && (
            <>
              <label style={labelStyle}>Your Name (optional)</label>
              <input
                type="text"
                style={inputStyle}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </>
          )}
        </div>
        
        <div style={{...sectionStyle, textAlign: 'center' as const}}>
          <label style={labelStyle}>Add a Photo (optional)</label>
          <div style={imagePickerStyle} onClick={pickImage}>
            {image ? (
              <img src={image} style={selectedImageStyle} alt="Selected" />
            ) : (
              <>
                <span style={{ fontSize: '24px', color: colors.gray }}>📷</span>
                <span style={{ color: colors.gray, marginTop: '8px' }}>Add Photo</span>
              </>
            )}
          </div>
        </div>
        
        <div style={sectionStyle}>
          <label style={labelStyle}>Location (optional)</label>
          <input
            type="text"
            style={inputStyle}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        
        <div style={sectionStyle}>
          <label style={labelStyle}>{`What would you like the community to focus on during their ${getRequestTypeLabel().toLowerCase()}?`}</label>
          <textarea
            style={textareaStyle}
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
            rows={4}
          />
        </div>
        
        <div style={sectionStyle}>
          <label style={labelStyle}>How would you like to feel? (optional)</label>
          <textarea
            style={textareaStyle}
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            rows={4}
          />
        </div>
        
        <div style={{...checkboxStyle, ...sectionStyle}}>
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={() => setIsAnonymous(!isAnonymous)}
          />
          <label htmlFor="anonymous" style={{ color: colors.primary, cursor: 'pointer' }}>
            Keep my request anonymous
          </label>
        </div>
        
        <button
          style={submitButtonStyle}
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Request'}
        </button>
        
        {onCancel && (
          <button
            style={cancelButtonStyle}
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

// Mobile component using React Native
const MobileForm = ({ onSubmit, onCancel }: RequestFormProps) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { privacySettings } = usePrivacySettings();
  
  const defaultPrivacySettings: PrivacySettings = {
    locationSharingLevel: 'none',
    useAnonymousId: false,
    shareTradition: true,
  };

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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };
  
  const uploadImage = async (uri: string) => {
    try {
      if (!user || typeof user === 'boolean') {
        throw new Error('No valid user profile');
      }
  
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `${user.id}/${timestamp}-${random}.jpeg`;
      
      const fileObject = {
        uri,
        name: fileName,
        type: 'image/jpeg'
      };
      
      const { error } = await supabase.storage
        .from('meditation-requests')
        .upload(fileName, fileObject as any, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from('meditation-requests')
        .getPublicUrl(fileName);
  
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
  
      const formattedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setImage(formattedUrl);
  
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', `Failed to upload image: ${error?.message || 'Unknown error'}`);
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
      setIsSubmitting(true);

      const { error } = await supabase
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
        ]);

      if (error) {
        console.error('Error submitting request:', error);
        Alert.alert('Error', `Failed to submit request: ${error.message}`);
        return;
      }

      onSubmit?.();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert('Error', 'An unexpected error occurred while submitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRequestTypeLabel = () => {
    if (!user || typeof user === 'boolean') return 'Request';
    
    const tradition = FAITH_TRADITIONS.find(t => t.id === user.faith_preferences?.primaryTradition);
    switch (requestType) {
      case 'prayer': return tradition?.prayerLabel || 'Prayer';
      case 'healing': return tradition?.healingLabel || 'Healing';
      case 'vibe': return 'Good Vibes';
      case 'meditation': return 'Meditation Focus';
      default: return 'Request';
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#121212' }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView 
        style={[styles.container, { backgroundColor: '#121212' }]}
        contentContainerStyle={{ 
          paddingVertical: 20, 
          paddingHorizontal: 10,
          paddingBottom: 120,
          alignItems: 'center' 
        }}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
      >
        <View style={[styles.formContainer, { backgroundColor: 'transparent' }]}>
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

          <View style={styles.formSection}>
            {!isAnonymous && (
              <>
                <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
                  Your Name (optional)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor={colors.gray}
                />
              </>
            )}
          </View>

          <View style={[styles.formSection, styles.imageSection]}>
            <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
              Add a Photo (optional)
            </Text>
            <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
              {image ? (
                <Image 
                  source={{ uri: image }} 
                  style={styles.selectedImage} 
                />
              ) : (
                <View style={[styles.imagePickerPlaceholder, { backgroundColor: colors.surface }]}>
                  <Ionicons name="image-outline" size={28} color={colors.gray} />
                  <Text style={{ color: colors.gray, marginTop: 8, fontSize: 14, fontFamily: 'Rubik-Regular' }}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
              Location (optional)
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText }]}
              value={location}
              onChangeText={setLocation}
              placeholderTextColor={colors.gray}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
              {`What would you like the community to focus on during their ${getRequestTypeLabel().toLowerCase()}?`}
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.bodyText }]}
              value={focusArea}
              onChangeText={setFocusArea}
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
              How would you like to feel? (optional)
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.bodyText }]}
              value={desiredOutcome}
              onChangeText={setDesiredOutcome}
              placeholderTextColor={colors.gray}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.anonymousToggle, styles.formSection]}
            onPress={() => setIsAnonymous(!isAnonymous)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isAnonymous ? 'checkbox' : 'square-outline'}
              size={24}
              color={colors.primary}
            />
            <Text style={{ color: colors.primary, fontSize: 16, marginLeft: 8, fontWeight: '500', fontFamily: 'Rubik-Medium' }}>
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
                style={{ marginTop: 8 }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Main component that decides which platform-specific form to render
export default function RequestForm(props: RequestFormProps) {
  const { colors } = useTheme();
  
  // Use completely separate components for web and mobile
  return Platform.OS === 'web' 
    ? <WebForm {...props} colors={colors} />
    : <MobileForm {...props} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  formContainer: {
    borderRadius: 12,
    backgroundColor: 'transparent',
    padding: 16,
    marginBottom: 20,
    width: '95%',
    maxWidth: 580,
    alignSelf: 'center',
  },
  formSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    fontFamily: 'Rubik-Regular',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    fontFamily: 'Rubik-Regular',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    color: 'white',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    fontFamily: 'Rubik-Regular',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    color: 'white',
  },
  imageSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  buttonContainer: {
    marginTop: 8,
  },
});