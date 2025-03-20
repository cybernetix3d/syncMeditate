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
import { COLORS } from '@/src/constants/Styles';

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

const Button: React.FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = (): StyleProp<ViewStyle>[] => {
    let result: StyleProp<ViewStyle>[] = [baseStyles.button];
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
    if (disabled) {
      result = [...result, baseStyles.disabledButton];
    }
    if (fullWidth) {
      result = [...result, baseStyles.fullWidth];
    }
    return result;
  };

  const getTextStyle = (): StyleProp<TextStyle>[] => {
    let result: StyleProp<TextStyle>[] = [baseStyles.buttonText];
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
          color={
            variant === 'primary' || variant === 'secondary'
              ? COLORS.white
              : COLORS.primary
          }
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
  primaryButton: {
    backgroundColor: COLORS.accent,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  textButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
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
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButtonText: {
    color: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.white,
  },
  outlineButtonText: {
    color: COLORS.primary,
  },
  textButtonText: {
    color: COLORS.primary,
  },
  smallButtonText: {
    fontSize: 12,
  },
  mediumButtonText: {
    fontSize: 14,
  },
  largeButtonText: {
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledButtonText: {
    opacity: 0.8,
  },
  fullWidth: {
    width: '100%',
  },
});

export default Button;
