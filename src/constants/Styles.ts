import { StyleSheet } from 'react-native';

// App colors
export const LIGHT_COLORS = {
  primary: '#4A90E2',      // Bright blue
  secondary: '#B6D0F6',    // Light blue
  accent: '#1B4F8F',       // Dark blue
  pastel1: '#FFB5E8',     // Pastel pink
  pastel2: '#B8F2E6',     // Pastel mint
  pastel3: '#AED9E0',     // Pastel blue
  background: '#F5F8FC',   // Very light blue-white
  surface: '#FFFFFF',      // White
  white: '#FFFFFF',
  lightGray: '#F0F0F0',
  mediumGray: '#E0E0E0',
  gray: '#666666',
  darkGray: '#444444',
  headerText: '#1B4F8F',   // Dark blue for text
  bodyText: '#444444',
  subtitleText: '#666666'
};

export const DARK_COLORS = {
  primary: '#6B9FE6',      // Softer bright blue
  secondary: '#2C4B7A',    // Darker blue
  accent: '#98C1FF',       // Light accent blue
  pastel1: '#BD8BA5',     // Dark pastel pink
  pastel2: '#86B3AA',     // Dark pastel mint
  pastel3: '#7B98A6',     // Dark pastel blue
  background: '#121212',   // Dark background
  surface: '#1E1E1E',     // Slightly lighter dark
  white: '#FFFFFF',
  lightGray: '#2A2A2A',
  mediumGray: '#3D3D3D',
  gray: '#888888',
  darkGray: '#CCCCCC',
  headerText: '#98C1FF',   // Light blue for text
  bodyText: '#E0E0E0',
  subtitleText: '#AAAAAA'
};

// Export a function to get colors based on theme
export const getThemeColors = (isDark: boolean) => isDark ? DARK_COLORS : LIGHT_COLORS;

// Default to light theme initially
export const COLORS = LIGHT_COLORS;

// Common styles used across the app
export const COMMON_STYLES = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  
  // Text styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.headerText,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.subtitleText,
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.headerText,
    marginBottom: 15,
  },
  
  // Card styles
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    padding: 15,
  },
  cardBody: {
    padding: 15,
  },
  cardFooter: {
    padding: 15,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  
  // Icon styles
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  
  // List item styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  
  // Empty state styles
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 20,
  },
  emptyStateIcon: {
    marginBottom: 15,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.headerText,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.subtitleText,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  // Button container
  buttonContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  
  // Header styles
  screenHeader: {
    padding: 20,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  // Detail item (icon + text)
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 5,
  },
});

export default {
  COLORS,
  COMMON_STYLES
};