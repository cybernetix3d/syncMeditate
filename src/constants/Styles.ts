import { StyleSheet } from 'react-native';

// App colors with improved contrast for better readability
export const LIGHT_COLORS = {
  primary: '#0D3B66',      // Navy Blue (professional, solid)
  secondary: '#F95738',    // Vibrant Orange (dynamic accent)
  accent: '#EE964B',       // Sunny Amber (energetic highlight)
  pastel1: '#F4D35E',      // Soft Yellow (warm and inviting)
  pastel2: '#A1C181',      // Light Green (refreshing, calming)
  pastel3: '#619B8A',      // Sage Green (balanced, sophisticated)
  background: '#FAFAFA',   // Off-white (clean and minimal)
  surface: '#FFFFFF',      // Pure White
  white: '#FFFFFF',
  lightGray: '#E8E9EB',    // Subtle Gray (gentle contrast)
  mediumGray: '#CDD0D4',   // Neutral Gray (versatile)
  gray: '#6E7C8A',         // Mid-tone Gray (readable text)
  darkGray: '#333F48',     // Dark Charcoal (strong contrast)
  headerText: '#0D3B66',   // Matching Primary (cohesive branding)
  bodyText: '#2B2D42',     // Dark Navy (excellent readability)
  subtitleText: '#8D99AE'  // Cool Gray (subtle differentiation)
};

export const DARK_COLORS = {
  primary: '#1E88E5',      // Bright Blue (high visibility)
  secondary: '#F4511E',    // Deep Orange (vibrant, appealing)
  accent: '#FFC107',       // Bold Amber (eye-catching)
  pastel1: '#4CAF50',      // Bright Green (energetic and fresh)
  pastel2: '#26C6DA',      // Cyan Blue (modern and vivid)
  pastel3: '#AB47BC',      // Purple (distinctive and attractive)
  background: '#121212',   // Deep Black (sleek, professional)
  surface: '#1E1E1E',      // Charcoal Black (comfortable dark mode)
  white: '#FFFFFF',
  lightGray: '#2C2C2C',    // Dark Gray (clear contrast)
  mediumGray: '#424242',   // Balanced Gray (neutral elements)
  gray: '#9E9E9E',         // Medium Gray (legible detail)
  darkGray: '#E0E0E0',     // Light Gray (strong contrast)
  headerText: '#BBDEFB',   // Soft Blue (easily readable)
  bodyText: '#E3F2FD',     // Very Light Blue (high contrast text)
  subtitleText: '#90A4AE'  // Muted Blue-Gray (professional subtlety)
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