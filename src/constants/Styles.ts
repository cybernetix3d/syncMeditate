import { StyleSheet } from 'react-native';

// App colors with improved complementary options
export const LIGHT_COLORS = {
  primary: '#3D8CAB',      // Teal blue - main brand color
  secondary: '#D9A391',    // Light terracotta - complementary to teal
  accent: '#D93C64',       // Raspberry - vibrant accent
  pastel1: '#F2C94C',      // Golden yellow - warm accent
  pastel2: '#A7D1DF',      // Light teal - complementary to primary
  pastel3: '#34AB6F',      // Emerald green - fresh accent
  background: '#F9FBFD',   // Very light blue-white
  surface: '#FFFFFF',      // White
  white: '#FFFFFF',
  lightGray: '#F0F5F7',
  mediumGray: '#E1E8ED',
  gray: '#8D989F',
  darkGray: '#4F5E66',
  headerText: '#286F8A',   // Dark teal for headers
  bodyText: '#394B54',     // Dark blue-gray for body text
  subtitleText: '#637680'  // Medium blue-gray for subtitles
};

export const DARK_COLORS = {
  primary: '#4A9DBE',      // Brighter teal blue for dark mode
  secondary: '#BE785A',    // Brighter terracotta - complementary
  accent: '#ED4B78',       // Brighter raspberry for dark mode
  pastel1: '#FFD966',      // Bright gold - warm accent
  pastel2: '#79C0D8',      // Light teal - complementary to primary
  pastel3: '#3DC17E',      // Brighter emerald for dark mode
  background: '#121A1F',   // Very dark blue-black
  surface: '#1A252C',      // Dark blue-gray
  white: '#FFFFFF',
  lightGray: '#2A343C',
  mediumGray: '#354551',
  gray: '#6D7C86',
  darkGray: '#C5D0D6',
  headerText: '#79C0D8',   // Light teal for headers
  bodyText: '#DCE5EB',     // Light gray for body text
  subtitleText: '#A0ABB3'  // Medium gray for subtitles
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