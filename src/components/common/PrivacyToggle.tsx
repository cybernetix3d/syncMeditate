import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PrivacyToggleProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

/**
 * PrivacyToggle component for toggling privacy settings
 */
const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  title,
  description,
  value,
  onValueChange,
  iconName = 'shield-checkmark',
  disabled = false
}) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => !disabled && onValueChange(!value)}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={styles.contentContainer}>
        {iconName && (
          <View style={[styles.iconContainer, value ? styles.activeIconContainer : styles.inactiveIconContainer]}>
            <Ionicons 
              name={iconName} 
              size={18} 
              color={value ? '#FFFFFF' : '#666666'} 
            />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {description && (
            <Text style={styles.description}>{description}</Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E0E0E0', true: '#A4B8FF' }}
        thumbColor={value ? '#1A2151' : '#FFFFFF'}
        disabled={disabled}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeIconContainer: {
    backgroundColor: '#1A2151',
  },
  inactiveIconContainer: {
    backgroundColor: '#F0F0F0',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2151',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666666',
  },
});

export default PrivacyToggle;