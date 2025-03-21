import { StyleSheet } from 'react-native';

// App colors with improved contrast for better readability
export const LIGHT_COLORS = {
  primary: '#2D7599',      // Darker teal blue - improved contrast  
  secondary: '#C47A62',    // Darker terracotta - better contrast
  accent: '#CD2B53',       // Deeper raspberry - more vibrant
  pastel1: '#E5B82E',      // Richer golden yellow
  pastel2: '#8ABCD1',      // Medium teal - improved visibility
  pastel3: '#23945A',      // Deeper emerald - better contrast
  background: '#F9FBFD',   // Very light blue-white
  surface: '#FFFFFF',      // White
  white: '#FFFFFF',
  lightGray: '#E8F0F4',    // Slightly more visible light gray
  mediumGray: '#D5DFE5',   // Improved medium gray
  gray: '#718089',         // Darker gray for better text contrast
  darkGray: '#3E4C54',     // Much darker gray for better contrast
  headerText: '#1B5A75',   // Darker teal for better header contrast
  bodyText: '#2A3A43',     // Darker blue-gray for improved readability
  subtitleText: '#4F626A'  // Darker subtitle text
};

export const DARK_COLORS = {
  primary: '#5AB0D1',      // Brighter teal blue for better contrast in dark mode
  secondary: '#DF8E70',    // Brighter terracotta - more visible
  accent: '#FF5D8A',       // Brighter raspberry for improved contrast
  pastel1: '#FFE07A',      // Brighter gold - more visible in dark 
  pastel2: '#8FD6EE',      // Brighter light teal
  pastel3: '#4FDA91',      // Brighter emerald for visibility
  background: '#0A1216',   // Darker blue-black for better contrast
  surface: '#131E24',      // Darker blue-gray
  white: '#FFFFFF',
  lightGray: '#1F2930',    // Slightly darker for better element separation
  mediumGray: '#293640',   // Improved contrast medium gray
  gray: '#8996A1',         // Brighter gray for better visibility
  darkGray: '#DCE8F0',     // Brighter for better text contrast
  headerText: '#93D8F0',   // Brighter teal for better header visibility
  bodyText: '#EEF5FA',     // Brighter gray for improved readability
  subtitleText: '#B7C5CE'  // Brighter subtitle text
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