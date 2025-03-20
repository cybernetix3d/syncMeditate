import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/src/constants/Styles';

interface PrivacyToggleProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (newValue: boolean) => void;
  iconName?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  title,
  description,
  value,
  onValueChange,
  iconName = 'shield-checkmark',
  disabled = false,
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
          <View
            style={[
              styles.iconContainer,
              value ? styles.activeIconContainer : styles.inactiveIconContainer,
            ]}
          >
            <Ionicons name={iconName} size={18} color={value ? COLORS.white : COLORS.gray} />
          </View>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: COLORS.mediumGray, true: '#A4B8FF' }}
        thumbColor={value ? COLORS.primary : COLORS.white}
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
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.primary,
  },
  inactiveIconContainer: {
    backgroundColor: COLORS.lightGray,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
  },
});

export default PrivacyToggle;
