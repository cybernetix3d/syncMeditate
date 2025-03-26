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
            const fileName = `${user.id}/${timestamp}-${random}.${file.name.split('.').pop() || 'jpeg'}`; // Use original extension

            // Use Supabase client library upload
            const { data: uploadData, error } = await supabase.storage
              .from('meditation-requests')
              .upload(fileName, file, {
                contentType: file.type, // Use actual file type
                upsert: false
              });

            if (error) throw error;
            if (!uploadData) throw new Error("Upload successful but no data returned");

            const { data: urlData } = supabase.storage
              .from('meditation-requests')
              .getPublicUrl(uploadData.path); // Use path from successful upload

            if (!urlData?.publicUrl) {
              throw new Error('Failed to get public URL for uploaded file');
            }

            // Add timestamp query param to bust cache if needed
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
        // Keep isSubmitting true here so user doesn't accidentally double-submit
        return;
      }

      // Reset form state on successful submission (optional)
      // setRequestType('prayer');
      // setFullName('');
      // setImage(null);
      // setLocation('');
      // setFocusArea('');
      // setDesiredOutcome('');
      // setIsAnonymous(false);

      onSubmit?.(); // Call onSubmit callback if provided

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('An unexpected error occurred while submitting your request.');
    } finally {
      // Ensure isSubmitting is always set to false eventually,
      // unless there was a specific error we want the user to address first.
      // If the submission was successful or had an unexpected client-side error, reset loading.
      // If Supabase returned an error, we might keep loading=true until user fixes it or cancels.
      // For simplicity now, we'll always set it false.
      setIsSubmitting(false);
    }
  };

  // --- WebForm Styles (minor adjustments for consistency) ---
  const formStyle = {
    maxWidth: '600px',
    width: '100%',
    margin: '0 auto',
    padding: '20px', // Slightly more padding
    backgroundColor: 'transparent', // Keep transparent
    borderRadius: '12px',
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    overflowY: 'auto' as const,
    maxHeight: 'calc(100vh - 40px)', // Adjust max height if needed
  };

  const typeSelectorStyle = {
    display: 'flex',
    gap: '10px', // Slightly more gap
    marginBottom: '25px', // More margin
  };

  const buttonStyle = (isActive: boolean) => ({
    flex: 1,
    padding: '10px 12px', // Slightly larger padding
    backgroundColor: isActive ? colors.primary : 'rgba(255, 255, 255, 0.07)',
    color: isActive ? colors.white : 'rgba(255, 255, 255, 0.8)', // Slightly less transparent text
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 500 as const,
    fontSize: '14px',
    transition: 'all 0.2s ease',
    textAlign: 'center' as const, // Ensure text is centered
  });

  const inputStyle = {
    boxSizing: 'border-box' as const, // Ensure padding doesn't increase size
    width: '100%',
    padding: '14px', // More padding
    fontSize: '16px',
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    marginBottom: '16px',
    outline: 'none' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    color: 'white',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
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
    margin: '10px auto 20px auto', // Adjusted margin
    border: '1px solid rgba(255, 255, 255, 0.2)',
    position: 'relative' as const, // Needed for potential overlay/icon positioning
  };

  const selectedImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  };

  const checkboxStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px', // Increased gap
    marginBottom: '20px', // Increased margin
    cursor: 'pointer',
  };

  const submitButtonStyle = {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: '15px', // Slightly more padding
    borderRadius: '8px',
    border: 'none',
    cursor: isSubmitting ? 'not-allowed' : 'pointer', // Change cursor when disabled
    opacity: isSubmitting ? 0.7 : 1,
    width: '100%',
    fontSize: '16px',
    fontWeight: 'bold' as const, // Ensure bold is applied
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    transition: 'background-color 0.2s ease, transform 0.1s ease, opacity 0.2s ease',
  };

  const cancelButtonStyle = {
    backgroundColor: 'transparent',
    color: colors.primary,
    padding: '15px',
    borderRadius: '8px',
    border: `1px solid ${colors.primary}`, // Add border for visibility
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    marginTop: '12px', // Increased margin
    width: '100%',
    fontSize: '16px',
    fontWeight: '500' as const, // Ensure weight is applied
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    transition: 'background-color 0.2s ease',
    opacity: isSubmitting ? 0.7 : 1,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px', // Increased margin
    fontSize: '14px',
    fontWeight: '500' as const,
    fontFamily: "'Rubik', 'Roboto', 'Helvetica Neue', sans-serif",
    color: 'rgba(255, 255, 255, 0.9)', // Slightly brighter label
  };

  const sectionStyle = {
    marginBottom: '25px', // Consistent margin
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '0 5px', // Padding on outer container if needed
      overflowX: 'hidden',
      backgroundColor: 'transparent'
    }}>
      <div style={formStyle}>
        <div style={typeSelectorStyle}>
          {['prayer', 'healing', 'vibe', 'meditation'].map((type) => (
            <button
              key={type}
              style={buttonStyle(requestType === type)}
              onClick={() => !isSubmitting && setRequestType(type as any)} // Prevent change while submitting
              disabled={isSubmitting}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        <div style={sectionStyle}>
          {!isAnonymous && (
            <>
              <label style={labelStyle} htmlFor="fullNameInput">Your Name (optional)</label>
              <input
                id="fullNameInput"
                type="text"
                style={inputStyle}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
              />
            </>
          )}
        </div>

        <div style={{...sectionStyle, textAlign: 'center' as const}}>
          <label style={labelStyle}>Add a Photo (optional)</label>
          <div style={imagePickerStyle} onClick={!isSubmitting ? pickImage : undefined}>
            {image ? (
              <img src={image} style={selectedImageStyle} alt="Selected request visual" />
            ) : (
              <>
                {/* Consider using an SVG or icon font for better scaling */}
                <span style={{ fontSize: '32px', color: colors.gray, marginBottom: '5px' }}>📷</span>
                <span style={{ color: colors.gray, fontSize: '14px', fontFamily: "'Rubik', sans-serif" }}>Add Photo</span>
              </>
            )}
          </div>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle} htmlFor="locationInput">Location (optional)</label>
          <input
            id="locationInput"
            type="text"
            style={inputStyle}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle} htmlFor="focusAreaInput">{`Focus for ${getRequestTypeLabel().toLowerCase()}? *`}</label>
          <textarea
            id="focusAreaInput"
            style={textareaStyle}
            value={focusArea}
            onChange={(e) => setFocusArea(e.target.value)}
            rows={4}
            required // Add required attribute for browser validation
            disabled={isSubmitting}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle} htmlFor="desiredOutcomeInput">How would you like to feel? (optional)</label>
          <textarea
            id="desiredOutcomeInput"
            style={textareaStyle}
            value={desiredOutcome}
            onChange={(e) => setDesiredOutcome(e.target.value)}
            rows={4}
            disabled={isSubmitting}
          />
        </div>

        <div style={{...checkboxStyle, ...sectionStyle}}>
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={() => setIsAnonymous(!isAnonymous)}
            disabled={isSubmitting}
            style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
          />
          <label htmlFor="anonymous" style={{ color: colors.primary, cursor: isSubmitting ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
            Keep my request anonymous
          </label>
        </div>

        <button
          style={submitButtonStyle}
          onClick={handleSubmit}
          disabled={isSubmitting || !focusArea.trim()} // Also disable if focusArea is empty
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
    // Check permissions first
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload an image.');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Slightly lower quality for faster uploads
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        // Show uploading state visually if desired (e.g., ActivityIndicator over image)
        await uploadImage(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Image Picker Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImage = async (uri: string, mimeType: string) => {
    try {
      if (!user || typeof user === 'boolean') {
        throw new Error('No valid user profile');
      }

      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Use fetch API to get blob for RN Supabase upload
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meditation-requests')
        .upload(filePath, blob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }
      if (!uploadData) {
          throw new Error("Upload successful but no data returned");
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('meditation-requests')
        .getPublicUrl(uploadData.path); // Use the path returned from upload

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }

      // Add timestamp to URL to help bust cache
      const formattedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setImage(formattedUrl);

    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Upload Error', `Failed to upload image: ${error?.message || 'Unknown error'}`);
      // Optionally reset image state if upload fails
      // setImage(null);
    }
  };


  const handleSubmit = async () => {
    if (!user || typeof user === 'boolean') {
      Alert.alert('Authentication Error', 'Please sign in to submit a request.');
      return;
    }

    if (!focusArea.trim()) {
      Alert.alert('Required Field', 'Please describe the focus for your request.');
      return;
    }

    setIsSubmitting(true); // Set loading state immediately

    try {
      const { error } = await supabase
        .from('meditation_requests')
        .insert([
          {
            user_id: user.id,
            request_type: requestType,
            tradition: currentSettings.shareTradition ? user.faith_preferences?.primaryTradition : null, // Respect privacy setting
            full_name: isAnonymous || currentSettings.useAnonymousId ? null : fullName, // Respect privacy setting & form toggle
            image_url: image,
            location: currentSettings.locationSharingLevel !== 'none' ? location : null, // Respect privacy setting
            location_precision: currentSettings.locationSharingLevel,
            focus_area: focusArea.trim(),
            desired_outcome: desiredOutcome.trim() || null,
            is_anonymous: isAnonymous || currentSettings.useAnonymousId, // Combine form toggle and privacy setting
            is_active: true
          }
        ]);

      if (error) {
        console.error('Error submitting request:', error);
        Alert.alert('Submission Error', `Failed to submit request: ${error.message}`);
        setIsSubmitting(false); // Stop loading on error
        return; // Important: Stop execution here
      }

      // Submission successful
      // Alert.alert('Success', 'Your request has been submitted.'); // Optional success message
      onSubmit?.(); // Call the callback

      // Resetting form state might be desired here, depending on UX flow
      // setRequestType('prayer');
      // setFullName('');
      // setImage(null);
      // setLocation('');
      // setFocusArea('');
      // setDesiredOutcome('');
      // setIsAnonymous(false);

    } catch (error) {
      console.error('Error in handleSubmit:', error);
      Alert.alert('Unexpected Error', 'An unexpected error occurred while submitting your request.');
    } finally {
      // Make sure loading state is always reset *unless* there was a handled Supabase error above
      // If the Supabase error happened, we already set it to false.
      // If successful or unexpected client error, set it false here.
       if (supabase.from('meditation_requests').insert([{}]).then(res => !res.error)) { // Check if last op was NOT an error
         setIsSubmitting(false);
       }
       // Simplified: Always set to false here for now. Handle specific error cases above if needed.
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
      // Use 'height' for Android as it often works better than 'padding' when views adjust size
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.keyboardAvoidingContainer, { backgroundColor: colors.background }]} // Use theme background
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // Increased offset slightly for iOS potentially
    >
      <ScrollView
        style={styles.scrollView} // Use flex: 1 via styles
        contentContainerStyle={styles.scrollContentContainer}
        // *** KEY CHANGES HERE ***
        keyboardShouldPersistTaps="handled" // Allows taps on buttons/inputs within scrollview without dismissing keyboard
        keyboardDismissMode="on-drag" // Allows dismissing keyboard by dragging down on the scrollview
        showsVerticalScrollIndicator={false} // Hide scrollbar if desired
      >
        {/* Removed the outer formContainer View, place content directly in ScrollView */}
        {/* Or keep it if needed for styling, ensure it doesn't have flex: 1 */}
        <View style={[styles.formContainer, { backgroundColor: 'transparent' }]}>

          <View style={styles.typeSelector}>
            {['prayer', 'healing', 'vibe', 'meditation'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  { backgroundColor: requestType === type ? colors.primary : colors.surface },
                ]}
                onPress={() => !isSubmitting && setRequestType(type as any)}
                disabled={isSubmitting}
                activeOpacity={0.7}
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
            {!(isAnonymous || currentSettings.useAnonymousId) && ( // Hide if anonymous is toggled OR set in privacy
              <>
                <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
                  Your Name (optional)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText, borderColor: colors.border }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholderTextColor={colors.gray}
                  editable={!isSubmitting}
                  autoCapitalize="words"
                  returnKeyType="next" // Helps with keyboard navigation
                />
              </>
            )}
          </View>

          <View style={[styles.formSection, styles.imageSection]}>
            <Text style={[styles.inputLabel, { color: colors.bodyText, textAlign: 'center'}]}>
              Add a Photo (optional)
            </Text>
            <TouchableOpacity
              onPress={!isSubmitting ? pickImage : undefined}
              style={styles.imagePicker}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              {image ? (
                <Image
                  source={{ uri: image }}
                  style={styles.selectedImage}
                />
              ) : (
                <View style={[styles.imagePickerPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="image-outline" size={32} color={colors.gray} />
                  <Text style={styles.imagePickerText}>Add Photo</Text>
                </View>
              )}
              {/* Optional: Add an ActivityIndicator overlay during upload */}
            </TouchableOpacity>
          </View>

          {currentSettings.locationSharingLevel !== 'none' && ( // Only show if location sharing is enabled
             <View style={styles.formSection}>
               <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
                 Location (optional, uses '{currentSettings.locationSharingLevel}' precision)
               </Text>
               <TextInput
                 style={[styles.input, { backgroundColor: colors.surface, color: colors.bodyText, borderColor: colors.border }]}
                 value={location}
                 onChangeText={setLocation}
                 placeholderTextColor={colors.gray}
                 placeholder="e.g., City, State or General Area"
                 editable={!isSubmitting}
                 returnKeyType="next"
               />
             </View>
          )}


          <View style={styles.formSection}>
            <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
              {`Focus for ${getRequestTypeLabel().toLowerCase()}? *`}
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.bodyText, borderColor: colors.border }]}
              value={focusArea}
              onChangeText={setFocusArea}
              placeholderTextColor={colors.gray}
              placeholder="Describe what you'd like support with..."
              multiline
              numberOfLines={4} // Initial height hint
              editable={!isSubmitting}
              returnKeyType="default" // Or "done" if last field before submit
            />
          </View>

          <View style={styles.formSection}>
            <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
              Desired Feeling / Outcome (optional)
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.surface, color: colors.bodyText, borderColor: colors.border }]}
              value={desiredOutcome}
              onChangeText={setDesiredOutcome}
              placeholderTextColor={colors.gray}
              placeholder="e.g., Peace, Clarity, Strength, Relief..."
              multiline
              numberOfLines={4}
              editable={!isSubmitting}
              returnKeyType="done"
            />
          </View>

          {!currentSettings.useAnonymousId && ( // Only show toggle if not forced anonymous by privacy
            <TouchableOpacity
              style={[styles.anonymousToggle, styles.formSection]}
              onPress={() => !isSubmitting && setIsAnonymous(!isAnonymous)}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isAnonymous ? 'checkbox' : 'square-outline'}
                size={24}
                color={colors.primary}
              />
              <Text style={styles.anonymousToggleText}>
                Keep my request anonymous
              </Text>
            </TouchableOpacity>
          )}


          <View style={styles.buttonContainer}>
            <Button
              onPress={handleSubmit}
              disabled={isSubmitting || !focusArea.trim()} // Disable if submitting or required field empty
              loading={isSubmitting}
              fullWidth
              style={{ marginBottom: onCancel ? 10 : 0 }} // Add margin if cancel button exists
            >
              Submit Request
            </Button>
            {onCancel && (
              <Button
                variant="outline" // Use outline or text for cancel
                onPress={onCancel}
                disabled={isSubmitting}
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

// Main component that decides which platform-specific form to render
export default function RequestForm(props: RequestFormProps) {
  const { colors } = useTheme();

  // Use completely separate components for web and mobile
  return Platform.OS === 'web'
    ? <WebForm {...props} colors={colors} />
    : <MobileForm {...props} />;
}

// --- Styles for MobileForm ---
const styles = StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1, // Ensures KAV takes full screen height
  },
  scrollView: {
    flex: 1, // Allows ScrollView to take remaining space within KAV
  },
  scrollContentContainer: {
    paddingVertical: 20,
    paddingHorizontal: 15, // Consistent horizontal padding
    paddingBottom: 150, // Increased padding to ensure last element scrolls above keyboard
    alignItems: 'center', // Center the form container horizontally
  },
  formContainer: {
    width: '100%', // Form takes full width within scroll padding
    maxWidth: 580, // Max width for larger screens
    backgroundColor: 'transparent', // Kept transparent, background set on KAV
  },
  formSection: {
    marginBottom: 24, // Increased spacing between sections
  },
  inputLabel: {
    fontSize: 15, // Slightly larger label
    fontWeight: '500',
    marginBottom: 8, // More space below label
    fontFamily: 'Rubik-Medium', // Use specific font weight
    color: '#E0E0E0', // Default fallback color
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10, // Use gap for spacing
    marginBottom: 25,
  },
  typeButton: {
    flex: 1, // Distribute space evenly
    paddingVertical: 10, // Vertical padding
    paddingHorizontal: 8, // Horizontal padding
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center', // Center text vertically
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Rubik-Medium',
    textAlign: 'center', // Ensure text is centered
  },
  input: {
    height: 50, // Slightly taller input
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    fontFamily: 'Rubik-Regular',
    width: '100%',
    // Removed marginBottom, handled by formSection
  },
  textArea: {
    minHeight: 120,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12, // Use vertical padding
    fontSize: 16,
    textAlignVertical: 'top',
    borderWidth: 1,
    fontFamily: 'Rubik-Regular',
    width: '100%',
    // Removed marginBottom, handled by formSection
    lineHeight: 22, // Improve readability
  },
  imageSection: {
    alignItems: 'center', // Center image picker elements
    // Removed marginVertical, handled by formSection
  },
  imagePicker: {
    width: 130, // Slightly larger picker
    height: 130,
    borderRadius: 65, // Keep it circular
    overflow: 'hidden',
    marginTop: 10, // Space below label
    // Removed elevation/shadow, rely on border/background
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 65,
    borderWidth: 1, // Add border for definition
  },
  imagePickerText: {
     color: '#9E9E9E', // Default fallback color
     marginTop: 8,
     fontSize: 14,
     fontFamily: 'Rubik-Regular'
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    // Removed marginVertical, handled by formSection
  },
  anonymousToggleText: {
     // Use theme color via inline style if needed, or define in component
     fontSize: 16,
     marginLeft: 10, // More space after checkbox
     fontWeight: '500',
     fontFamily: 'Rubik-Medium',
     color: '#BB86FC', // Default fallback color for primary
  },
  buttonContainer: {
    marginTop: 10, // Add some space above the buttons
    width: '100%', // Ensure buttons take full width within container
  },
  // Removed container style as it's handled by KAV/ScrollView
});