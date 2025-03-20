import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/src/context/AuthProvider';
import { usePrivacySettings } from '@/src/context/PrivacyProvider';
import TraditionSelector, { FAITH_TRADITIONS } from '@/src/components/faith/TraditionSelector';
import PrivacyToggle from '@/src/components/common/PrivacyToggle';
import Button from '@/src/components/common/Button';
import { COLORS, COMMON_STYLES } from '@/src/constants/Styles';
import { useTheme } from '@/src/context/ThemeContext';

export default function OnboardingScreen() {
  const { user, updateUserProfile } = useAuth();
  const { privacySettings, updatePrivacySettings, requestLocationPermission } = usePrivacySettings();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [tradition, setTradition] = useState('secular');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { colors } = useTheme();

  const totalSteps = 3;
  
  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleComplete = async () => {
    if (!displayName && !user?.display_name) {
      Alert.alert('Display Name Required', 'Please enter a display name to continue.');
      setCurrentStep(1);
      return;
    }
    
    try {
      setLoading(true);
      
      // Request location permission if user enabled location sharing
      if (privacySettings.locationSharingLevel !== 'none') {
        await requestLocationPermission();
      }
      
      // Update user profile
      const { error } = await updateUserProfile({
        display_name: displayName,
        privacy_settings: privacySettings,
        faith_preferences: {
          primaryTradition: tradition
        }
      });
      
      if (error) {
        Alert.alert('Update Error', error.message);
        return;
      }
      
      // Navigate to home screen
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const renderProfileStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.headerText }]}>Your Profile</Text>
      <Text style={[styles.stepDescription, { color: colors.subtitleText }]}>
        Let's personalize your meditation experience
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: colors.bodyText }]}>Display Name</Text>
        <TextInput
          style={[styles.input, { color: colors.bodyText, borderColor: colors.mediumGray }]}
          placeholder="Enter a display name"
          placeholderTextColor={colors.gray}
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={30}
        />
        <Text style={[styles.inputHint, { color: colors.gray }]}>
          This is how you'll appear to other meditators
        </Text>
      </View>
      
      <View style={styles.nextButtonContainer}>
        <Button onPress={handleNext} fullWidth>
          Next
        </Button>
      </View>
    </View>
  );
  
  const renderTraditionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.headerText }]}>Meditation Tradition</Text>
      <Text style={[styles.stepDescription, { color: colors.subtitleText }]}>
        Select a meditation tradition that resonates with you
      </Text>
      
      <View style={styles.traditionsContainer}>
        <TraditionSelector
          selectedTradition={tradition}
          onSelectTradition={setTradition}
          showDescription={true}
        />
      </View>
      
      <View style={styles.traditionNote}>
        <Ionicons name="information-circle-outline" size={16} color={colors.gray} />
        <Text style={[styles.traditionNoteText, { color: colors.gray }]}>
          You can change this later in settings
        </Text>
      </View>
      
      <View style={styles.navigationButtons}>
        <Button variant="outline" onPress={handleBack} style={styles.backButton}>
          Back
        </Button>
        <Button onPress={handleNext} style={styles.nextButton}>
          Next
        </Button>
      </View>
    </View>
  );
  
  const renderPrivacyStep = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: colors.headerText }]}>Privacy Settings</Text>
      <Text style={[styles.stepDescription, { color: colors.subtitleText }]}>
        Control how you appear to others in the community
      </Text>
      
      <View style={styles.privacyContainer}>
        <Text style={[styles.privacySectionTitle, { color: colors.primary }]}>Location Sharing</Text>
        
        <View style={styles.privacyOptions}>
          <TouchableOpacity
            style={[
              styles.privacyOption,
              privacySettings.locationSharingLevel === 'none' && styles.selectedPrivacyOption,
              { borderColor: privacySettings.locationSharingLevel === 'none' ? colors.primary : colors.mediumGray }
            ]}
            onPress={() => updatePrivacySettings({ locationSharingLevel: 'none' })}
          >
            <Ionicons 
              name="location-off-outline" 
              size={24} 
              color={privacySettings.locationSharingLevel === 'none' ? colors.primary : colors.gray} 
            />
            <Text style={[
              styles.privacyOptionTitle,
              { color: privacySettings.locationSharingLevel === 'none' ? colors.primary : colors.bodyText }
            ]}>
              No Sharing
            </Text>
            <Text style={[styles.privacyOptionDescription, { color: colors.gray }]}>
              Your location will not be shared
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.privacyOption,
              privacySettings.locationSharingLevel === 'country' && styles.selectedPrivacyOption,
              { borderColor: privacySettings.locationSharingLevel === 'country' ? colors.primary : colors.mediumGray }
            ]}
            onPress={() => updatePrivacySettings({ locationSharingLevel: 'country' })}
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
              Country Only
            </Text>
            <Text style={[styles.privacyOptionDescription, { color: colors.gray }]}>
              Only your country will be visible
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.privacyOption,
              privacySettings.locationSharingLevel === 'city' && styles.selectedPrivacyOption,
              { borderColor: privacySettings.locationSharingLevel === 'city' ? colors.primary : colors.mediumGray }
            ]}
            onPress={() => updatePrivacySettings({ locationSharingLevel: 'city' })}
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
              Your approximate city location
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.privacyToggles}>
          <PrivacyToggle
            title="Share Meditation Tradition"
            description="Let others see your selected tradition"
            value={privacySettings.shareTradition}
            onValueChange={(value) => updatePrivacySettings({ shareTradition: value })}
            iconName="flower"
          />
          
          <PrivacyToggle
            title="Use Anonymous Profile"
            description="Hide your identity in global meditations"
            value={privacySettings.useAnonymousId}
            onValueChange={(value) => updatePrivacySettings({ useAnonymousId: value })}
            iconName="person"
          />
        </View>
      </View>
      
      <View style={styles.navigationButtons}>
        <Button variant="outline" onPress={handleBack} style={styles.backButton}>
          Back
        </Button>
        <Button onPress={handleComplete} style={styles.nextButton} loading={loading}>
          Complete
        </Button>
      </View>
    </View>
  );
  
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {Array(totalSteps).fill(0).map((_, index) => (
        <View 
          key={index} 
          style={[
            styles.stepDot, 
            currentStep >= index + 1 && styles.activeDot,
            { backgroundColor: currentStep >= index + 1 ? colors.primary : colors.mediumGray }
          ]}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Welcome to SyncMeditate</Text>
        {renderStepIndicator()}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {currentStep === 1 && renderProfileStep()}
        {currentStep === 2 && renderTraditionStep()}
        {currentStep === 3 && renderPrivacyStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 0,
  },
  stepContainer: {
    flex: 1,
    minHeight: 450,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 30,
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
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
  },
  traditionsContainer: {
    marginBottom: 20,
  },
  traditionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  traditionNoteText: {
    fontSize: 14,
    marginLeft: 8,
  },
  privacyContainer: {
    marginBottom: 30,
  },
  privacySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  privacyOptions: {
    marginBottom: 20,
  },
  privacyOption: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
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
  privacyToggles: {
    marginTop: 20,
  },
  nextButtonContainer: {
    marginTop: 'auto',
    paddingVertical: 20,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingVertical: 20,
  },
  backButton: {
    flex: 1,
    marginRight: 10,
  },
  nextButton: {
    flex: 1,
    marginLeft: 10,
  },
});