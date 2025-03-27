import React, { useState, useEffect } from 'react'; // Added useEffect
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Using ImagePicker import as before
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthProvider';
import { supabase } from '../../api/supabase';
import Button from '../common/Button';
import { FAITH_TRADITIONS } from '../faith/TraditionSelector';
import { usePrivacySettings, PrivacySettings } from '../../context/PrivacyContext';
// Assuming COLORS might be needed for styles, keep import if used
// import { COLORS } from '../../constants/Styles';

interface RequestFormProps {
  onSubmit?: () => void;
  onCancel?: () => void;
}

// Default privacy settings
const defaultPrivacySettings: PrivacySettings = {
    locationSharingLevel: 'none',
    useAnonymousId: false,
    shareTradition: true,
};

// --- WebForm Component ---
const WebForm = ({ onSubmit, onCancel, colors }: RequestFormProps & { colors: any }) => {
  const { user } = useAuth();
  const { privacySettings } = usePrivacySettings();
  const currentSettings = privacySettings || defaultPrivacySettings;

  const [requestType, setRequestType] = useState<'prayer' | 'healing' | 'vibe' | 'meditation'>('prayer');
  const [fullName, setFullName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(currentSettings.useAnonymousId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setIsAnonymous(currentSettings.useAnonymousId);
  }, [currentSettings.useAnonymousId]);

  const getRequestTypeLabel = (): string => {
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
    if (isUploading) return;
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          setIsUploading(true);
          setImage(null);
          try {
            if (!user || typeof user === 'boolean') {
              throw new Error('No valid user profile');
            }
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(7);
            const fileExt = file.name.split('.').pop() || 'jpeg';
            const fileName = `${user.id}/${timestamp}-${random}.${fileExt}`;

            // --- WEB UPLOAD using File object ---
            const { data: uploadData, error } = await supabase.storage
              .from('meditation-requests') // Ensure bucket name is correct
              .upload(fileName, file, {
                contentType: file.type,
                upsert: false
              });

            if (error) throw error;
            if (!uploadData) throw new Error("Upload successful but no data returned");

            const { data: urlData } = supabase.storage
              .from('meditation-requests') // Ensure bucket name is correct
              .getPublicUrl(uploadData.path);

            if (!urlData?.publicUrl) throw new Error('Failed to get public URL');
            const formattedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            setImage(formattedUrl);
          } catch (error: any) {
            console.error('Upload error:', error);
            alert(`Failed to upload image: ${error?.message || 'Unknown error'}`);
            setImage(null);
          } finally {
            setIsUploading(false);
          }
        }
      };
      input.click();
    } catch (error) {
      console.error('Error initiating image pick:', error);
      alert('Failed to initiate image selection.');
    }
  };

  const handleSubmit = async () => {
    if (!user || typeof user === 'boolean') { alert('Error: Please sign in...'); return; }
    if (!focusArea.trim()) { alert('Required Field: Please specify focus area...'); return; }
    if (isUploading) { alert('Please wait for image upload...'); return; }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('meditation_requests').insert([ // Ensure table name is correct
        {
          user_id: user.id,
          request_type: requestType,
          tradition: currentSettings.shareTradition ? user.faith_preferences?.primaryTradition : null,
          full_name: isAnonymous ? null : fullName,
          image_url: image,
          location: currentSettings.locationSharingLevel !== 'none' ? location : null,
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
      } else {
        onSubmit?.();
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An unexpected error occurred while submitting your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- WebForm Styles ---
  const formStyle = {
    maxWidth: '600px', width: '100%', margin: '0 auto', padding: '20px',
    backgroundColor: 'transparent', borderRadius: '12px',
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    overflowY: 'auto' as const, maxHeight: 'calc(100vh - 40px)',
  };
  const typeSelectorStyle = { display: 'flex', gap: '10px', marginBottom: '25px' };
  const buttonStyle = (isActive: boolean) => ({
    flex: 1, padding: '10px 12px',
    backgroundColor: isActive ? colors.primary : 'rgba(255, 255, 255, 0.07)',
    color: isActive ? colors.white : 'rgba(255, 255, 255, 0.8)',
    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 as const,
    fontSize: '14px', transition: 'all 0.2s ease', textAlign: 'center' as const,
  });
  const inputStyle = {
    boxSizing: 'border-box' as const, width: '100%', padding: '14px', fontSize: '16px',
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif", borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)', marginBottom: '16px', outline: 'none' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.07)', color: colors.bodyText || 'white', // Use theme color
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  };
  const textareaStyle = { ...inputStyle, minHeight: '120px', resize: 'vertical' as const, lineHeight: '1.5' };
  const imagePickerStyle = {
    width: '120px', height: '120px', borderRadius: '60px',
    backgroundColor: 'rgba(255, 255, 255, 0.07)', display: 'flex',
    flexDirection: 'column' as const, alignItems: 'center' as const, justifyContent: 'center' as const,
    cursor: 'pointer', overflow: 'hidden', margin: '10px auto 20px auto',
    border: '1px solid rgba(255, 255, 255, 0.2)', position: 'relative' as const,
  };
  const selectedImageStyle = { width: '100%', height: '100%', objectFit: 'cover' as const };
  const checkboxStyle = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', cursor: 'pointer' };
  const submitButtonStyle = {
    backgroundColor: colors.primary, color: colors.white, padding: '15px', borderRadius: '8px',
    border: 'none', cursor: isSubmitting || isUploading ? 'not-allowed' : 'pointer',
    opacity: isSubmitting || isUploading ? 0.7 : 1, width: '100%', fontSize: '16px', fontWeight: 'bold' as const,
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    transition: 'background-color 0.2s ease, transform 0.1s ease, opacity 0.2s ease',
  };
  const cancelButtonStyle = {
    backgroundColor: 'transparent', color: colors.primary, padding: '15px', borderRadius: '8px',
    border: `1px solid ${colors.primary}`, cursor: isSubmitting || isUploading ? 'not-allowed' : 'pointer',
    marginTop: '12px', width: '100%', fontSize: '16px', fontWeight: '500' as const,
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    transition: 'background-color 0.2s ease', opacity: isSubmitting || isUploading ? 0.7 : 1,
  };
  const labelStyle = {
    display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' as const,
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    color: colors.bodyText || 'rgba(255, 255, 255, 0.9)', // Use theme color
  };
  const sectionStyle = { marginBottom: '25px' };
  const uploadIndicatorStyle = {
      position: 'absolute' as const, top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)', zIndex: 1,
      width: '30px', height: '30px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)',
      borderTopColor: colors.primary, animation: 'spin 1s linear infinite'
  };

  return (
    <div style={{ width: '100%', height: '100%', maxWidth: '600px', margin: '0 auto', padding: '0 5px', overflowX: 'hidden', backgroundColor: 'transparent' }}>
        {/* Inject keyframes for spinner animation */}
        <style>{`@keyframes spin { 0% { transform: translate(-50%, -50%) rotate(0deg); } 100% { transform: translate(-50%, -50%) rotate(360deg); } }`}</style>
        <div style={formStyle}>
            {/* Type Selector */}
            <div style={typeSelectorStyle}>
            {['prayer', 'healing', 'vibe', 'meditation'].map((type) => (
                <button key={type} style={buttonStyle(requestType === type)} onClick={() => !isSubmitting && !isUploading && setRequestType(type as any)} disabled={isSubmitting || isUploading}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
            ))}
            </div>

            {/* Name Input */}
            <div style={sectionStyle}>
                {!isAnonymous && (
                    <>
                    <label style={labelStyle} htmlFor="fullNameInput">Your Name (optional)</label>
                    <input id="fullNameInput" type="text" style={inputStyle} value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isSubmitting || isUploading} />
                    </>
                )}
            </div>

            {/* Image Picker */}
            <div style={{...sectionStyle, textAlign: 'center' as const}}>
                <label style={labelStyle}>Add a Photo (optional)</label>
                <div style={imagePickerStyle} onClick={!isSubmitting && !isUploading ? pickImage : undefined}>
                    {isUploading && <div style={uploadIndicatorStyle}></div>}
                    {image && !isUploading ? (
                    <img src={image} style={selectedImageStyle} alt="Selected request visual" />
                    ) : !isUploading ? (
                    <>
                        <span style={{ fontSize: '32px', color: colors.gray, marginBottom: '5px' }}>📷</span>
                        <span style={{ color: colors.gray, fontSize: '14px', fontFamily: "'Rubik', sans-serif" }}>Add Photo</span>
                    </>
                    ) : null}
                </div>
            </div>

            {/* Location Input */}
            {currentSettings.locationSharingLevel !== 'none' && (
                <div style={sectionStyle}>
                    <label style={labelStyle} htmlFor="locationInput">Location (optional, uses '{currentSettings.locationSharingLevel}' precision)</label>
                    <input id="locationInput" type="text" style={inputStyle} value={location} onChange={(e) => setLocation(e.target.value)} disabled={isSubmitting || isUploading} />
                </div>
            )}

            {/* Focus Area */}
            <div style={sectionStyle}>
                <label style={labelStyle} htmlFor="focusAreaInput">{`Focus for ${(getRequestTypeLabel() || 'request').toLowerCase()}? *`}</label>
                <textarea id="focusAreaInput" required style={textareaStyle} value={focusArea} onChange={(e) => setFocusArea(e.target.value)} rows={4} disabled={isSubmitting || isUploading} />
            </div>

            {/* Desired Outcome */}
            <div style={sectionStyle}>
                <label style={labelStyle} htmlFor="desiredOutcomeInput">How would you like to feel? (optional)</label>
                <textarea id="desiredOutcomeInput" style={textareaStyle} value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} rows={4} disabled={isSubmitting || isUploading} />
            </div>

            {/* Anonymous Checkbox */}
            {!currentSettings.useAnonymousId && (
                <div style={{...checkboxStyle, ...sectionStyle}}>
                    <input type="checkbox" id="anonymous" checked={isAnonymous} onChange={() => !isSubmitting && !isUploading && setIsAnonymous(!isAnonymous)} disabled={isSubmitting || isUploading} style={{ cursor: isSubmitting || isUploading ? 'not-allowed' : 'pointer' }} />
                    <label htmlFor="anonymous" style={{ color: colors.primary, cursor: isSubmitting || isUploading ? 'not-allowed' : 'pointer', userSelect: 'none' }}>Keep my request anonymous</label>
                </div>
            )}

            {/* Buttons */}
            <button style={submitButtonStyle} onClick={handleSubmit} disabled={isSubmitting || isUploading || !focusArea.trim()}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
            {onCancel && (
                <button style={cancelButtonStyle} onClick={onCancel} disabled={isSubmitting || isUploading}>
                    Cancel
                </button>
            )}
        </div>
    </div>
  );
};


// --- MobileForm Component ---
const MobileForm = ({ onSubmit, onCancel }: RequestFormProps) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { privacySettings } = usePrivacySettings();
  const currentSettings = privacySettings || defaultPrivacySettings;

  const [requestType, setRequestType] = useState<'prayer' | 'healing' | 'vibe' | 'meditation'>('prayer');
  const [fullName, setFullName] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(currentSettings.useAnonymousId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setIsAnonymous(currentSettings.useAnonymousId);
  }, [currentSettings.useAnonymousId]);

  const pickImage = async () => {
    if (isUploading) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload an image.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        // Use deprecated but TS-recognized option
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      const errorMessage = (error instanceof Error) ? error.message : 'Failed to pick image.';
      Alert.alert('Image Picker Error', errorMessage);
      if (isUploading) setIsUploading(false); // Should not be true here, but safe
      setImage(null);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      setIsUploading(true);
      setImage(null);
      console.log('Starting upload for request image...', { uri: uri.substring(0, 60) + '...' });

      if (!user || typeof user === 'boolean') {
        throw new Error('No valid user profile');
      }

      const fileExt = uri.split('.').pop() || 'jpeg';
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `${user.id}/${timestamp}-${random}.${fileExt}`;
      const filePath = fileName;
      const mimeType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

      console.log('Uploading as:', filePath, 'Type:', mimeType);

      const fileObject = { uri: uri, name: fileName, type: mimeType };

      const { error } = await supabase.storage
        .from('meditation-requests') // Ensure bucket name is correct
        .upload(filePath, fileObject as any, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) {
        console.error("Supabase upload error:", error);
        throw error;
      }

      console.log('Upload successful, getting public URL for:', filePath);

      const { data: urlData } = supabase.storage
        .from('meditation-requests') // Ensure bucket name is correct
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      const formattedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      console.log('Generated public URL:', formattedUrl);
      setImage(formattedUrl); // Update local state for the form

    } catch (error: any) {
      console.error('Full upload/URL error:', error);
      const errorMsg = error.message || 'Unknown upload error';
       if (errorMsg.includes('Network request failed')) {
          Alert.alert('Network Error', 'Failed to upload image. Please check your connection.');
      } else {
        Alert.alert('Upload Error', `Failed to upload image: ${errorMsg}`);
      }
      setImage(null);
    } finally {
      setIsUploading(false);
    }
  };
  const handleSubmit = async () => {
    if (!user || typeof user === 'boolean') { alert('Authentication Error: Please sign in...'); return; }
    if (!focusArea.trim()) { alert('Required Field: Please describe the focus...'); return; }
    if (isUploading) { Alert.alert('Please Wait', 'Image is still uploading.'); return; }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('meditation_requests') // Ensure table name is correct
        .insert([{
          user_id: user.id,
          request_type: requestType,
          tradition: currentSettings.shareTradition ? user.faith_preferences?.primaryTradition : null,
          full_name: isAnonymous ? null : fullName,
          image_url: image,
          location: currentSettings.locationSharingLevel !== 'none' ? location : null,
          location_precision: currentSettings.locationSharingLevel,
          focus_area: focusArea.trim(),
          desired_outcome: desiredOutcome.trim() || null,
          is_anonymous: isAnonymous,
          is_active: true
        }])
        .select().single();

      if (error) {
        console.error('Error submitting request:', error);
        Alert.alert('Submission Error', `Failed to submit request: ${error.message}`);
        setIsSubmitting(false);
      } else if (data) {
        onSubmit?.();
      } else {
        console.error("Submission successful but no data returned.");
        Alert.alert('Submission Info', 'Request submitted, but confirmation failed.');
        onSubmit?.();
      }
    } catch (error: any) {
      console.error('Catch Error in handleSubmit:', error);
      Alert.alert('Unexpected Error', 'An unexpected error occurred: ' + error?.message);
      setIsSubmitting(false);
    } finally {
      // Reset submitting state if the component is still mounted and submitting
      // This handles cases where submission fails early or onSubmit doesn't navigate
      if (isSubmitting) {
         setIsSubmitting(false);
      }
    }
  };

  // Add return type annotation
  const getRequestTypeLabel = (): string => {
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardAvoidingContainer, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formContainer]}>
          {/* Type Selector */}
          <View style={styles.typeSelector}>
            {['prayer', 'healing', 'vibe', 'meditation'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  { backgroundColor: requestType === type ? colors.primary : colors.surface,
                    borderColor: requestType === type ? colors.primary : colors.border },
                ]}
                onPress={() => !isSubmitting && !isUploading && setRequestType(type as any)}
                disabled={isSubmitting || isUploading}
                activeOpacity={0.7}
              >
                <Text style={[ styles.typeButtonText, { color: requestType === type ? colors.white : colors.bodyText }]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Name Input */}
          <View style={styles.formSection}>
            {!isAnonymous && (
              <>
                <Text style={[styles.inputLabel, { color: colors.bodyText }]}>Your Name (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText, borderColor: colors.border }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor={colors.gray}
                  editable={!isSubmitting && !isUploading}
                  autoCapitalize="words"
                  returnKeyType="next"
                 />
              </>
            )}
          </View>

          {/* Image Picker */}
          <View style={[styles.formSection, styles.imageSection]}>
            <Text style={[styles.inputLabel, { color: colors.bodyText, textAlign: 'center'}]}>Add a Photo (optional)</Text>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.imagePicker}
              disabled={isSubmitting || isUploading}
              activeOpacity={0.7}
            >
              {image && !isUploading ? (
                <Image source={{ uri: image }} style={styles.selectedImage} />
              ) : (
                <View style={[styles.imagePickerPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {isUploading ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={40} color={colors.gray} />
                      <Text style={[styles.imagePickerText, { color: colors.gray }]}>Add Photo</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Location Input */}
          {currentSettings.locationSharingLevel !== 'none' && (
             <View style={styles.formSection}>
               <Text style={[styles.inputLabel, { color: colors.bodyText }]}>Location (optional, uses '{currentSettings.locationSharingLevel}' precision)</Text>
               <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText, borderColor: colors.border }]}
                  value={location}
                  onChangeText={setLocation}
                  placeholderTextColor={colors.gray}
                  placeholder="e.g., City, State or General Area"
                  editable={!isSubmitting && !isUploading}
                  returnKeyType="next"
                />
             </View>
          )}

          {/* Focus Area */}
          <View style={styles.formSection}>
            <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
              {/* Use the safer call within the template literal */}
              {`Focus for ${(getRequestTypeLabel() || 'request').toLowerCase()}? *`}
            </Text>
            <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.bodyText, borderColor: colors.border }]}
                value={focusArea}
                onChangeText={setFocusArea}
                placeholderTextColor={colors.gray}
                placeholder="Describe what you'd like support with..."
                multiline
                numberOfLines={4}
                editable={!isSubmitting && !isUploading}
                returnKeyType="default"
            />
          </View>

          {/* Desired Outcome */}
          <View style={styles.formSection}>
            <Text style={[styles.inputLabel, { color: colors.bodyText }]}>Desired Feeling / Outcome (optional)</Text>
            <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, color: colors.bodyText, borderColor: colors.border }]}
                value={desiredOutcome}
                onChangeText={setDesiredOutcome}
                placeholderTextColor={colors.gray}
                placeholder="e.g., Peace, Clarity, Strength, Relief..."
                multiline
                numberOfLines={4}
                editable={!isSubmitting && !isUploading}
                returnKeyType="done"
            />
          </View>

          {/* Anonymous Toggle */}
          {!currentSettings.useAnonymousId && (
            <TouchableOpacity
                style={[styles.anonymousToggle, styles.formSection]}
                onPress={() => !isSubmitting && !isUploading && setIsAnonymous(!isAnonymous)}
                disabled={isSubmitting || isUploading}
                activeOpacity={0.7}
            >
              <Ionicons name={isAnonymous ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
              <Text style={[styles.anonymousToggleText, { color: colors.primary }]}>Keep my request anonymous</Text>
            </TouchableOpacity>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              onPress={handleSubmit}
              disabled={isSubmitting || isUploading || !focusArea.trim()}
              loading={isSubmitting}
              fullWidth
              style={{ marginBottom: onCancel ? 10 : 0 }}
            >
              Submit Request
            </Button>
            {onCancel && (
              <Button
                variant="outline"
                onPress={onCancel}
                disabled={isSubmitting || isUploading}
                fullWidth
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

// Main component deciding platform
export default function RequestForm(props: RequestFormProps) {
  const { colors } = useTheme();
  return Platform.OS === 'web'
    ? <WebForm {...props} colors={colors} />
    : <MobileForm {...props} />;
}

// --- Styles for MobileForm ---
const styles = StyleSheet.create({
    keyboardAvoidingContainer: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContentContainer: { flexGrow: 1, paddingVertical: 20, paddingHorizontal: 15, paddingBottom: 180, alignItems: 'center' },
    formContainer: { width: '100%', maxWidth: 580 },
    formSection: { marginBottom: 24 },
    inputLabel: { fontSize: 15, fontWeight: '500', marginBottom: 8, fontFamily: 'Rubik-Medium' },
    typeSelector: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    typeButton: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    typeButtonText: { fontSize: 14, fontWeight: '500', fontFamily: 'Rubik-Medium', textAlign: 'center' },
    input: { height: 50, borderRadius: 8, paddingHorizontal: 16, fontSize: 16, borderWidth: 1, fontFamily: 'Rubik-Regular', width: '100%' },
    textArea: { minHeight: 120, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, textAlignVertical: 'top', borderWidth: 1, fontFamily: 'Rubik-Regular', width: '100%', lineHeight: 22 },
    imageSection: { alignItems: 'center' },
    imagePicker: { width: 130, height: 130, borderRadius: 65, overflow: 'hidden', marginTop: 10, justifyContent: 'center', alignItems: 'center' },
    imagePickerPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', borderRadius: 65, borderWidth: 1 },
    imagePickerText: { marginTop: 8, fontSize: 14, fontFamily: 'Rubik-Regular' },
    selectedImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    anonymousToggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
    anonymousToggleText: { fontSize: 16, marginLeft: 10, fontWeight: '500', fontFamily: 'Rubik-Medium' },
    buttonContainer: { marginTop: 10, width: '100%' },
});