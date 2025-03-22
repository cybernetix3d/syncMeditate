import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Switch,
  Alert,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthProvider';
import { useTheme } from '@/src/context/ThemeContext';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import Button from '@/src/components/common/Button';
import type { UserProfile } from '@/src/context/AuthProvider';

// Improved type guard function
const isUserProfile = (user: null | boolean | UserProfile): user is UserProfile => {
  return user !== null && typeof user !== 'boolean' && 'id' in user;
};

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme, colors } = useTheme();

  console.log("User in settings:", user);

  // Admin check
  const isAdmin = isUserProfile(user) && 
    (user.email === 'timhart.sound@gmail.com' || user.is_admin === true);

  console.log("Is admin:", isAdmin, "User email:", isUserProfile(user) ? user.email : "no email");

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Signing out...');
              await signOut();
              console.log('Signed out successfully');
              router.replace('/(auth)/sign-in');
            } catch (error: any) {
              console.error('Sign out error:', error);
              Alert.alert('Error', error.message || 'Failed to sign out. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/sign-in');
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            } catch (error: any) {
              console.error('Delete account error:', error);
              Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Updated navigation functions
  const navigateToAdmin = () => {
    console.log("Navigating to admin...");
    try {
      router.push('/admin');
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Could not navigate to admin panel: " + String(error));
    }
  };
  
  const navigateToAdminEvents = () => {
    console.log("Navigating to admin events...");
    try {
      router.push('/admin/events');
    } catch (error) {
      console.error("Navigation error:", error);
      Alert.alert("Navigation Error", "Could not navigate to events admin: " + String(error));
    }
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
            {isUserProfile(user) && user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.profileInitial}>
                {isUserProfile(user) && user.display_name ? user.display_name[0].toUpperCase() : '?'}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.headerText }]}>
              {isUserProfile(user) && user.display_name ? user.display_name : 'Anonymous User'}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.gray }]}>
              {isUserProfile(user) && user.email ? user.email : 'No email associated'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.gray} />
        </TouchableOpacity>

        {/* Admin Panel (only visible to admin users) */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Administration</Text>
            
            <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
              <TouchableOpacity 
                style={styles.settingsRow}
                onPress={navigateToAdmin}
              >
                <View style={styles.settingsIconContainer}>
                  <Ionicons name="construct" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Admin Dashboard</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.gray} />
              </TouchableOpacity>
              
              <View style={[styles.separator, { backgroundColor: colors.lightGray }]} />
              
              <TouchableOpacity 
                style={styles.settingsRow}
                onPress={navigateToAdminEvents}
              >
                <View style={styles.settingsIconContainer}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>Manage System Events</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.gray} />
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            
            {(!isUserProfile(user) || !user.email) && (
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
              <Text style={[styles.settingsLabel, { color: colors.bodyText }]}>About Synkr</Text>
              <Text style={[styles.versionText, { color: colors.gray }]}>v1.0.0</Text>
            </TouchableOpacity>
          </View>
        </View>

  
        

        {/* Sign Out Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={[styles.signOutButton, { backgroundColor: colors.surface }]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.signOutText, { color: colors.primary }]}>Sign Out</Text>
          </TouchableOpacity>
          
          {isUserProfile(user) && user.email && (
            <TouchableOpacity 
              style={styles.deleteAccountButton}
              onPress={handleDeleteAccount}
            >
              <Text style={[styles.deleteAccountText, { color: colors.primary }]}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    padding: 10,
  },
  deleteAccountText: {
    fontSize: 14,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
});