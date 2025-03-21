import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Fix imports to match your project structure
// You may need to adjust these paths based on your actual file locations
import { useAuth } from '../../src/context/AuthProvider';
import { COLORS } from '../../src/constants/Styles';
import { useTheme } from '../../src/context/ThemeContext';
import type { UserProfile } from '../../src/context/AuthProvider';

// Type guard function for UserProfile
const isUserProfile = (user: boolean | UserProfile | null): user is UserProfile => {
  return user !== null && typeof user !== 'boolean' && 'id' in user;
};

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const [mounted, setMounted] = useState(false);
  
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
  
  if (!isAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.bodyText }}>Unauthorized access. Redirecting...</Text>
      </View>
    );
  }
  
  const adminModules = [
    {
      title: 'Event Management',
      icon: 'calendar' as const, 
      description: 'Manage system events, create solar events',
      route: '/admin/events',
    },
    // Add more admin modules here as needed
  ];
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.headerText }]}>Admin Dashboard</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtitleText }]}>
            Manage system settings and content
          </Text>
        </View>
        
        <View style={styles.modulesContainer}>
          {adminModules.map((module, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.moduleCard, { backgroundColor: colors.surface }]}
              onPress={() => router.push(module.route)}
            >
              <View style={[styles.iconContainer, { backgroundColor: COLORS.primary }]}>
                <Ionicons name={module.icon} size={24} color={COLORS.white} />
              </View>
              <View style={styles.moduleContent}>
                <Text style={[styles.moduleTitle, { color: colors.headerText }]}>{module.title}</Text>
                <Text style={[styles.moduleDescription, { color: colors.bodyText }]}>
                  {module.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.gray} />
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>System Information</Text>
          <View style={[styles.statsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.bodyText }]}>User:</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {isUserProfile(user) ? user.email || 'Unknown' : 'Unknown'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.bodyText }]}>Role:</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>Administrator</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.bodyText }]}>App Version:</Text>
              <Text style={[styles.statValue, { color: colors.primary }]}>1.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  modulesContainer: {
    padding: 15,
  },
  moduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  moduleContent: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  moduleDescription: {
    fontSize: 14,
  },
  statsSection: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  statsCard: {
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  statLabel: {
    fontSize: 16,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
  },
});