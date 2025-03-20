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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/src/context/AuthProvider';
import TraditionSelector from '@/src/components/faith/TraditionSelector';
import Button from '@/src/components/common/Button';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';

export default function ProfileSettingsScreen() {
  const { user, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [tradition, setTradition] = useState('secular');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setTradition(user.faith_preferences?.primaryTradition || 'secular');
    }
  }, [user]);

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
        <View style={[styles.header, { borderBottomColor: colors.mediumGray }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Edit Profile</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.profileImageContainer}>
            <View style={[styles.profileImage, { backgroundColor: colors.primary }]}>
              <Text style={styles.profileInitial}>
                {displayName ? displayName[0].toUpperCase() : '?'}
              </Text>
            </View>
            <TouchableOpacity style={styles.changeImageButton}>
              <Text style={[styles.changeImageText, { color: colors.primary }]}>
                Change Photo
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
                  {user?.email || 'No email associated'}
                </Text>
              </View>
              
              <View style={styles.accountInfoItem}>
                <Text style={[styles.accountInfoLabel, { color: colors.gray }]}>Account Type</Text>
                <Text style={[styles.accountInfoValue, { color: colors.bodyText }]}>
                  {user?.email ? 'Registered User' : 'Anonymous User'}
                </Text>
              </View>
              
              <View style={styles.accountInfoItem}>
                <Text style={[styles.accountInfoLabel, { color: colors.gray }]}>Member Since</Text>
                <Text style={[styles.accountInfoValue, { color: colors.bodyText }]}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
            </View>

            {!user?.email && (
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
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
});