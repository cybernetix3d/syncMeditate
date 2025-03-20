import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import Button from '@/src/components/common/Button';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.push('/auth/sign-in');
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: () => {
            // Add account deletion logic here
            Alert.alert('Not Implemented', 'Account deletion is not implemented in this prototype.');
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.headerText }]}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* User Profile Section */}
        <TouchableOpacity 
          style={[styles.profileCard, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/settings/profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.profileInitial}>
              {user?.display_name ? user.display_name[0].toUpperCase() : '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.headerText }]}>
              {user?.display_name || 'Anonymous User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.gray }]}>
              {user?.email || 'No email associated'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray} />
        </TouchableOpacity>

        {/* Settings Sections */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Account</Text>
          
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity 
              style={styles.settingsRow}
              onPress={() => router.push('/settings/profile')}
            >
              <View style={styles.settingsIconContainer}>
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Profile Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </TouchableOpacity>
            
            <View style={[styles.separator, { backgroundColor: colors.lightGray }]} />
            
            <TouchableOpacity 
              style={styles.settingsRow}
              onPress={() => router.push('/settings/privacy')}
            >
              <View style={styles.settingsIconContainer}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Privacy Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </TouchableOpacity>
            
            {!user?.email && (
              <>
                <View style={[styles.separator, { backgroundColor: colors.lightGray }]} />
                
                <TouchableOpacity 
                  style={styles.settingsRow}
                  onPress={() => router.push('/auth/sign-up')}
                >
                  <View style={styles.settingsIconContainer}>
                    <Ionicons name="cloud-upload" size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Upgrade to Full Account</Text>
                  <View style={[styles.badgeContainer, { backgroundColor: colors.accent }]}>
                    <Text style={styles.badgeText}>Recommended</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Appearance</Text>
          
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <Ionicons name="moon" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Notification</Text>
          
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <Ionicons name="notifications" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Notification Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </TouchableOpacity>
            
            <View style={[styles.separator, { backgroundColor: colors.lightGray }]} />
            
            <View style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <Ionicons name="time" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Meditation Reminders</Text>
              <Switch
                value={false}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>About</Text>
          
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <Ionicons name="help-circle" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </TouchableOpacity>
            
            <View style={[styles.separator, { backgroundColor: colors.lightGray }]} />
            
            <TouchableOpacity style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <Ionicons name="document-text" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </TouchableOpacity>
            
            <View style={[styles.separator, { backgroundColor: colors.lightGray }]} />
            
            <TouchableOpacity style={styles.settingsRow}>
              <View style={styles.settingsIconContainer}>
                <Ionicons name="information-circle" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>About SyncMeditate</Text>
              <Text style={[styles.versionText, { color: colors.gray }]}>v1.0.0</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <View style={styles.buttonSection}>
          <Button 
            variant="outline" 
            onPress={handleSignOut}
            style={[styles.signOutButton, { borderColor: colors.primary }]}
          >
            <Ionicons name="log-out" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            Sign Out
          </Button>
          
          {user?.email && (
            <TouchableOpacity 
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
            >
              <Text style={[styles.deleteAccountText, { color: COLORS.accent }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  profileInitial: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  settingsCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingsIconContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 14,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 16,
  },
  separator: {
    height: 1,
    marginLeft: 60,
  },
  badgeContainer: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  versionText: {
    fontSize: 12,
  },
  buttonSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  signOutButton: {
    width: '100%',
    marginBottom: 20,
  },
  deleteAccountButton: {
    padding: 10,
  },
  deleteAccountText: {
    fontSize: 14,
  },
});