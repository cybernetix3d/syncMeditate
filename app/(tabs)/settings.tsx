import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '@/src/contexts/ThemeContext';

export default function SettingsScreen() {
  const { isDark, toggleTheme, colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.section, { borderBottomColor: colors.lightGray }]}>
        <Text style={[styles.sectionTitle, { color: colors.primary }]}>Appearance</Text>
        <View style={styles.settingItem}>
          <Text style={[styles.settingLabel, { color: colors.bodyText }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.lightGray, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingLabel: {
    fontSize: 16,
  },
}); 