import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/src/context/AuthProvider';
import TraditionSelector from '@/src/components/faith/TraditionSelector';
import Button from '@/src/components/common/Button';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';
import { supabase } from '@/src/api/supabase';
import type { UserProfile } from '@/src/context/AuthProvider';

export default function ProfileSettingsScreen() {
  const { user, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [tradition, setTradition] = useState('secular');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { colors } = useTheme();

  // Type guard function
  const isUserProfile = (user: null | boolean | UserProfile): user is UserProfile => {
    return user !== null && typeof user !== 'boolean';
  };

  useEffect(() => {
    if (isUserProfile(user)) {
      setDisplayName(user.display_name || '');
      setTradition(user.faith_preferences?.primaryTradition || 'secular');
    }
  }, [user]);

  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        // Create an input element for file selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        // Create a promise to handle the file selection
        const fileSelected = new Promise<File>((resolve) => {
          input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              resolve(file); // Pass the actual File object
            }
          };
        });
        
        // Trigger file selection dialog
        input.click();
        
        // Wait for file selection and upload
        const file = await fileSelected;
        await uploadAvatar(file);
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera roll permissions to upload a profile photo.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });

        if (!result.canceled) {
          await uploadAvatar(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadAvatar = async (source: string | File) => {
    try {
      setUploading(true);
      console.log('Starting upload process...', { source: typeof source === 'string' ? source.substring(0, 50) + '...' : 'File object' });
  
      if (!isUserProfile(user)) {
        throw new Error('No valid user profile');
      }
  
      // Generate file name with timestamp and random string for uniqueness
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const fileName = `${user.id}-${timestamp}-${random}.jpeg`;
      
      console.log('Uploading as:', fileName);
  
      if (source instanceof File) {
        // For web, use File directly (known to work)
        const { error } = await supabase.storage
          .from('avatars')
          .upload(fileName, source, {
            contentType: 'image/jpeg',
            upsert: false
          });
  
        if (error) throw error;
      } else {
        // For mobile platforms, use the approach that works for RequestForm
        const fileObject = {
          uri: source,
          name: fileName,
          type: 'image/jpeg'
        };
        
        console.log('Uploading with fileObject');
        
        const { error } = await supabase.storage
          .from('avatars')
          .upload(fileName, fileObject as any, {
            contentType: 'image/jpeg',
            upsert: false
          });
  
        if (error) throw error;
      }
  
      console.log('Upload successful, getting URL...');
  
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
  
      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
  
      // Add cache buster to URL
      const formattedUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      console.log('Generated public URL:', formattedUrl);
  
      // Update user profile with new avatar URL
      const { error: updateError } = await updateUserProfile({
        avatar_url: formattedUrl
      });
  
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }
  
      console.log('Profile updated successfully with new avatar');
      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (error: any) {
      console.error('Full error details:', error);
      Alert.alert(
        'Upload Error',
        `Failed to upload profile photo: ${error?.message || 'Unknown error'}. Please try again.`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Missing Information', 'Please enter a display name.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await updateUserProfile({
        display_name: displayName,
        faith_preferences: {
          primaryTradition: tradition
        }
      });

      if (error) {
        Alert.alert('Update Error', error.message);
        return;
      }

      Alert.alert('Success', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity 
              style={[styles.profileImage, { backgroundColor: colors.primary }]}
              onPress={pickImage}
              disabled={uploading}
            >
              {isUserProfile(user) && user.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.profileInitial}>
                  {displayName ? displayName[0].toUpperCase() : '?'}
                </Text>
              )}
              {uploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color={COLORS.white} />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.changeImageButton}
              onPress={pickImage}
              disabled={uploading}
            >
              <Text style={[styles.changeImageText, { color: colors.primary }]}>
                {uploading ? 'Uploading...' : 'Change Photo'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.headerText }]}>Profile Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.bodyText }]}>Display Name</Text>
              <TextInput
                style={[
                  styles.input, 
                  { 
                    color: colors.bodyText, 
                    borderColor: colors.mediumGray,
                    backgroundColor: colors.surface
                  }
                ]}
                placeholder="Enter your display name"
                placeholderTextColor={colors.gray}
                value={displayName}
                onChangeText={setDisplayName}
                maxLength={30}
              />
              <Text style={[styles.inputHint, { color: colors.gray }]}>
                This is how you'll appear to other meditators
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.bodyText }]}>
                Meditation Tradition
              </Text>
              <View style={styles.traditionContainer}>
                <TraditionSelector
                  selectedTradition={tradition}
                  onSelectTradition={setTradition}
                  compact={true}
                  showDescription={true}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.headerText }]}>Account Information</Text>
            
            <View style={[styles.accountInfoCard, { backgroundColor: colors.surface }]}>
              <View style={styles.accountInfoItem}>
                <Text style={[styles.accountInfoLabel, { color: colors.gray }]}>Email</Text>
                <Text style={[styles.accountInfoValue, { color: colors.bodyText }]}>
                  {isUserProfile(user) && user.email ? user.email : 'No email associated'}
                </Text>
              </View>
              
              <View style={styles.accountInfoItem}>
                <Text style={[styles.accountInfoLabel, { color: colors.gray }]}>Account Type</Text>
                <Text style={[styles.accountInfoValue, { color: colors.bodyText }]}>
                  {isUserProfile(user) && user.email ? 'Registered User' : 'Anonymous User'}
                </Text>
              </View>
              
              <View style={styles.accountInfoItem}>
                <Text style={[styles.accountInfoLabel, { color: colors.gray }]}>Member Since</Text>
                <Text style={[styles.accountInfoValue, { color: colors.bodyText }]}>
                  {isUserProfile(user) && user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
            </View>

            {(!isUserProfile(user) || !user.email) && (
              <View style={[styles.upgradeCard, { backgroundColor: colors.surface }]}>
                <Ionicons name="alert-circle-outline" size={24} color={colors.primary} />
                <View style={styles.upgradeTextContainer}>
                  <Text style={[styles.upgradeTitle, { color: colors.primary }]}>
                    Upgrade to Full Account
                  </Text>
                  <Text style={[styles.upgradeDescription, { color: colors.gray }]}>
                    You're using an anonymous account. Create a full account to save your progress and settings.
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/auth/sign-up')}
                >
                  <Text style={styles.upgradeButtonText}>Upgrade</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <Button onPress={handleSave} fullWidth loading={loading}>
            Save Changes
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileImageContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 40,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  changeImageButton: {
    marginTop: 10,
    padding: 5,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 5,
  },
  traditionContainer: {
    marginTop: 5,
  },
  accountInfoCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  accountInfoItem: {
    paddingVertical: 10,
  },
  accountInfoLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  accountInfoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  upgradeCard: {
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  upgradeTextContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  upgradeDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  upgradeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  upgradeButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});