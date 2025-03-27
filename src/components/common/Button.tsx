// src/components/common/Button.tsx
import React, { forwardRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View, // Keep View imported
} from 'react-native';
// *** Ensure Ionicons is imported ***
import { Ionicons } from '@expo/vector-icons';
// Make sure this path is correct for your project structure
import { COLORS } from '@/src/constants/Styles'; // Assuming you have a COLORS export

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
  // Ensure these are defined
  iconLeft?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
}

// Using View as the ref type to avoid previous TS errors potentially
const Button = forwardRef<View, ButtonProps>(({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
  // Destructure icon props
  iconLeft,
  iconRight,
}, ref) => {
  // Use a default fallback if COLORS isn't fully defined initially
  const colors = COLORS || {
      primary: '#BB86FC', // Example defaults
      secondary: '#03DAC6',
      accent: '#498FE1',
      white: '#FFFFFF',
      gray: '#9E9E9E',
      lightGray: '#E0E0E0',
      mediumGray: '#BDBDBD',
      background: '#121212',
      surface: '#1E1E1E'
  };
  const isDisabled = disabled || loading;

  // --- getButtonStyle function ---
  const getButtonStyle = (): StyleProp<ViewStyle>[] => {
    let result: StyleProp<ViewStyle>[] = [baseStyles.button];
    switch (variant) {
      case 'primary':
        result.push(isDisabled ? { backgroundColor: colors.mediumGray } : { backgroundColor: colors.primary });
        break;
      case 'secondary':
        result.push(isDisabled ? { backgroundColor: colors.mediumGray } : { backgroundColor: colors.secondary });
        break;
      case 'outline':
         result.push({
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: isDisabled ? colors.mediumGray : colors.primary
        });
        break;
      case 'text':
        result.push(baseStyles.textButton);
        break;
      default:
         result.push(isDisabled ? { backgroundColor: colors.mediumGray } : { backgroundColor: colors.primary });
    }
    switch (size) {
      case 'small': result.push(baseStyles.smallButton); break;
      case 'medium': result.push(baseStyles.mediumButton); break;
      case 'large': result.push(baseStyles.largeButton); break;
    }
    if (isDisabled) result.push(baseStyles.disabledButton);
    if (fullWidth) result.push(baseStyles.fullWidth);

    // Ensure border is handled correctly
    if (variant !== 'outline' && variant !== 'text') {
        const hasBorderWidth = result.some(s => StyleSheet.flatten(s)?.borderWidth !== undefined);
        if (!hasBorderWidth) {
             result.push({ borderWidth: 0 }); // Explicitly no border unless 'outline'
        }
    } else if (variant === 'text') {
         result.push({ borderWidth: 0 }); // Ensure text has no border
    }

    return result;
  };

  // --- getTextStyle function ---
  const getTextStyle = (): StyleProp<TextStyle>[] => {
    let result: StyleProp<TextStyle>[] = [baseStyles.buttonText];
    switch (variant) {
      case 'primary': result.push(baseStyles.primaryButtonText); break;
      case 'secondary': result.push(baseStyles.secondaryButtonText); break;
      case 'outline': result.push(isDisabled ? { color: colors.gray } : baseStyles.outlineButtonText); break;
      case 'text': result.push(isDisabled ? { color: colors.gray } : baseStyles.textButtonText); break;
      default: result.push(baseStyles.primaryButtonText);
    }
    // Adjust color if disabled and not outline/text
    if (isDisabled && variant !== 'outline' && variant !== 'text') {
       // Find existing color style and remove it before adding disabled color
       const colorStyleIndex = result.findIndex(s => StyleSheet.flatten(s)?.color !== undefined);
       if (colorStyleIndex > -1) result.splice(colorStyleIndex, 1);
       result.push({ color: colors.lightGray }); // Use a lighter gray for disabled text on dark bg
    }

    switch (size) {
      case 'small': result.push(baseStyles.smallButtonText); break;
      case 'medium': result.push(baseStyles.mediumButtonText); break;
      case 'large': result.push(baseStyles.largeButtonText); break;
    }
    return result;
  };

  // Determine final text/icon color
  const currentFinalTextStyles = StyleSheet.flatten([getTextStyle(), textStyle]);
  // Provide a sensible default if color calculation fails
  const finalTextColor = currentFinalTextStyles.color || (variant === 'primary' || variant === 'secondary' ? colors.white : colors.primary);


  // Determine Icon Size based on button size
  let iconSize: number;
  switch (size) {
    case 'small': iconSize = 16; break;
    case 'large': iconSize = 20; break;
    case 'medium': default: iconSize = 18; break;
  }

  return (
    <TouchableOpacity
      ref={ref}
      style={[getButtonStyle(), style]} // Apply styles as an array
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={finalTextColor} />
      ) : (
        // *** Render icons and children ***
        <View style={baseStyles.contentContainer}>
          {iconLeft && (
              <Ionicons
                  name={iconLeft}
                  size={iconSize}
                  color={finalTextColor}
                  style={baseStyles.iconLeft}
              />
          )}
          {typeof children === 'string' ? (
            <Text style={[getTextStyle(), textStyle]}>
              {children}
            </Text>
          ) : (
            children // Render non-string children directly
          )}
          {iconRight && (
              <Ionicons
                  name={iconRight}
                  size={iconSize}
                  color={finalTextColor}
                  style={baseStyles.iconRight}
              />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

// Base Styles - Adjust colors to match your actual COLORS object
const baseStyles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1.5, // Default border width for outline
    borderColor: 'transparent', // Default border color
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Variant specific styles that DIFFER from base/inline
  // primaryButton handled inline
  // secondaryButton handled inline
  // outlineButton handled inline
  textButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    borderWidth: 0,
  },
  // Sizes (Padding)
  smallButton: { paddingVertical: 6, paddingHorizontal: 12 },
  mediumButton: { paddingVertical: 10, paddingHorizontal: 16 },
  largeButton: { paddingVertical: 14, paddingHorizontal: 20 },
  // Base Text
  buttonText: { fontWeight: '600', textAlign: 'center' },
  // Variant Text Colors
  primaryButtonText: { color: COLORS.white },
  secondaryButtonText: { color: COLORS.white },
  outlineButtonText: { color: COLORS.primary },
  textButtonText: { color: COLORS.primary },
  // Size Text Fonts
  smallButtonText: { fontSize: 12 },
  mediumButtonText: { fontSize: 14 },
  largeButtonText: { fontSize: 16 },
  // Disabled State
  disabledButton: { opacity: 0.6 },
  // Full Width
  fullWidth: { width: '100%' },
  // Icons
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },
});

export default Button;