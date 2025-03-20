import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp
} from 'react-native';

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
}

/**
 * Button component with different variants and states
 */
const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false
}) => {
  // Get the appropriate styles based on props
  const getButtonStyle = () => {
    let result: StyleProp<ViewStyle>[] = [baseStyles.button];
    
    // Add variant style
    switch (variant) {
      case 'primary':
        result = [...result, baseStyles.primaryButton];
        break;
      case 'secondary':
        result = [...result, baseStyles.secondaryButton];
        break;
      case 'outline':
        result = [...result, baseStyles.outlineButton];
        break;
      case 'text':
        result = [...result, baseStyles.textButton];
        break;
    }
    
    // Add size style
    switch (size) {
      case 'small':
        result = [...result, baseStyles.smallButton];
        break;
      case 'medium':
        result = [...result, baseStyles.mediumButton];
        break;
      case 'large':
        result = [...result, baseStyles.largeButton];
        break;
    }
    
    // Handle disabled state
    if (disabled) {
      result = [...result, baseStyles.disabledButton];
    }
    
    // Handle full width
    if (fullWidth) {
      result = [...result, baseStyles.fullWidth];
    }
    
    return result;
  };
  
  // Get the appropriate text styles based on props
  const getTextStyle = () => {
    let result: StyleProp<TextStyle>[] = [baseStyles.buttonText];
    
    // Add variant text style
    switch (variant) {
      case 'primary':
        result = [...result, baseStyles.primaryButtonText];
        break;
      case 'secondary':
        result = [...result, baseStyles.secondaryButtonText];
        break;
      case 'outline':
        result = [...result, baseStyles.outlineButtonText];
        break;
      case 'text':
        result = [...result, baseStyles.textButtonText];
        break;
    }
    
    // Add size text style
    switch (size) {
      case 'small':
        result = [...result, baseStyles.smallButtonText];
        break;
      case 'medium':
        result = [...result, baseStyles.mediumButtonText];
        break;
      case 'large':
        result = [...result, baseStyles.largeButtonText];
        break;
    }
    
    // Handle disabled state
    if (disabled) {
      result = [...result, baseStyles.disabledButtonText];
    }
    
    return result;
  };
  
  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={variant === 'primary' || variant === 'secondary' ? '#FFFFFF' : '#1A2151'} 
        />
      ) : (
        <Text style={[...getTextStyle(), textStyle]}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const baseStyles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  
  // Variant styles
  primaryButton: {
    backgroundColor: '#1A2151',
  },
  secondaryButton: {
    backgroundColor: '#4A6FFF',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#1A2151',
  },
  textButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  
  // Size styles
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  mediumButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  largeButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  
  // Text styles
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
  },
  outlineButtonText: {
    color: '#1A2151',
  },
  textButtonText: {
    color: '#1A2151',
  },
  
  // Text size styles
  smallButtonText: {
    fontSize: 12,
  },
  mediumButtonText: {
    fontSize: 14,
  },
  largeButtonText: {
    fontSize: 16,
  },
  
  // State styles
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.8,
  },
  
  // Width styles
  fullWidth: {
    width: '100%',
  },
});

export default Button;