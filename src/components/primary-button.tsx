// Renders a reusable accessible action button for TakwimuCheck screens.

import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colours } from '@/constants/colours';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface PrimaryButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function PrimaryButton({
  label,
  variant = 'primary',
  fullWidth = true,
  disabled,
  ...pressableProps
}: PrimaryButtonProps) {
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      {...pressableProps}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        isSecondary ? styles.secondary : isDanger ? styles.danger : styles.primary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.label,
          isSecondary ? styles.secondaryLabel : styles.primaryLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: Colours.brand,
    borderColor: Colours.brand,
  },
  secondary: {
    backgroundColor: Colours.surface,
    borderColor: Colours.brand,
  },
  danger: {
    backgroundColor: Colours.error,
    borderColor: Colours.error,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
  },
  primaryLabel: {
    color: Colours.white,
  },
  secondaryLabel: {
    color: Colours.brandDark,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});
