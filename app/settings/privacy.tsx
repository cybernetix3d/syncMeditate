import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/src/context/AuthProvider';
import { usePrivacySettings } from '@/src/context/PrivacyProvider';
import PrivacyToggle from '@/src/components/common/PrivacyToggle';
import Button from '@/src/components/common/Button';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';

export default function PrivacySettingsScreen() {
  const { user } = useAuth();
  const { privacySettings, updatePrivacySettings, requestLocationPermission } = usePrivacySettings();
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  const handleLocationOptionChange = async (level: 'none' | 'country' | 'city' | 'precise') => {
    // If changing from 'none' to any other option, request permission
    if (privacySettings.locationSharingLevel === 'none' && level !== 'none') {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Location Permission Required',
          'To share your location, you need to grant location permission in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    await updatePrivacySettings({ locationSharingLevel: level });
  };
  
  const handleSave = async () => {
    try {
      setLoading(true);
      // Privacy settings are automatically saved when changed, so we just need to navigate back
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Location Sharing</Text>
          <Text style={[styles.sectionDescription, { color: colors.subtitleText }]}>
            Control how your location is shared with other meditators
          </Text>
          
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.privacyOption,
                privacySettings.locationSharingLevel === 'none' && styles.selectedPrivacyOption,
                { 
                  borderColor: privacySettings.locationSharingLevel === 'none' ? colors.primary : colors.mediumGray,
                  backgroundColor: colors.surface
                }
              ]}
              onPress={() => handleLocationOptionChange('none')}
            >
              <Ionicons 
                name="location-outline" 
                size={24} 
                color={privacySettings.locationSharingLevel === 'none' ? colors.primary : colors.gray} 
              />
              <Text style={[
                styles.privacyOptionTitle,
                { color: privacySettings.locationSharingLevel === 'none' ? colors.primary : colors.bodyText }
              ]}>
                No Location Sharing
              </Text>
              <Text style={[styles.privacyOptionDescription, { color: colors.gray }]}>
                Your location will not be visible to anyone
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.privacyOption,
                privacySettings.locationSharingLevel === 'country' && styles.selectedPrivacyOption,
                { 
                  borderColor: privacySettings.locationSharingLevel === 'country' ? colors.primary : colors.mediumGray,
                  backgroundColor: colors.surface
                }
              ]}
              onPress={() => handleLocationOptionChange('country')}
            >
              <Ionicons 
                name="globe-outline" 
                size={24} 
                color={privacySettings.locationSharingLevel === 'country' ? colors.primary : colors.gray} 
              />
              <Text style={[
                styles.privacyOptionTitle,
                { color: privacySettings.locationSharingLevel === 'country' ? colors.primary : colors.bodyText }
              ]}>
                Country Level
              </Text>
              <Text style={[styles.privacyOptionDescription, { color: colors.gray }]}>
                Only your country will be visible on the map
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.privacyOption,
                privacySettings.locationSharingLevel === 'city' && styles.selectedPrivacyOption,
                { 
                  borderColor: privacySettings.locationSharingLevel === 'city' ? colors.primary : colors.mediumGray,
                  backgroundColor: colors.surface
                }
              ]}
              onPress={() => handleLocationOptionChange('city')}
            >
              <Ionicons 
                name="map-outline" 
                size={24} 
                color={privacySettings.locationSharingLevel === 'city' ? colors.primary : colors.gray} 
              />
              <Text style={[
                styles.privacyOptionTitle,
                { color: privacySettings.locationSharingLevel === 'city' ? colors.primary : colors.bodyText }
              ]}>
                City Level
              </Text>
              <Text style={[styles.privacyOptionDescription, { color: colors.gray }]}>
                Your approximate city location will be visible
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Profile Privacy</Text>
          <Text style={[styles.sectionDescription, { color: colors.subtitleText }]}>
            Control what information is visible to other meditators
          </Text>
          
          <View style={styles.togglesContainer}>
            <PrivacyToggle
              title="Share Meditation Tradition"
              description="Let others see your selected tradition on the map and in events"
              value={privacySettings.shareTradition}
              onValueChange={(value) => updatePrivacySettings({ shareTradition: value })}
              iconName="flower"
            />
            
            <PrivacyToggle
              title="Use Anonymous Profile"
              description="Hide your identity in global meditations and community features"
              value={privacySettings.useAnonymousId}
              onValueChange={(value) => updatePrivacySettings({ useAnonymousId: value })}
              iconName="person"
            />
          </View>
        </View>
        
        <View style={styles.infoSection}>
          <Ionicons name="shield-checkmark" size={24} color={colors.gray} style={styles.infoIcon} />
          <Text style={[styles.infoText, { color: colors.gray }]}>
            SoulSync is committed to protecting your privacy. We never share your personal 
            information with third parties and always give you control over your data.
          </Text>
        </View>
      </ScrollView>
      
      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <Button onPress={handleSave} fullWidth loading={loading}>
          Save Changes
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  privacyOption: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedPrivacyOption: {
    borderWidth: 2,
  },
  privacyOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  privacyOptionDescription: {
    fontSize: 14,
  },
  togglesContainer: {
    marginTop: 10,
  },
  infoSection: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 10,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
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