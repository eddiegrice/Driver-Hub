import type { PropsWithChildren } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Radius, Spacing } from '@/constants/theme';

type PrimaryButtonProps = PropsWithChildren<{
  onPress: () => void;
  disabled?: boolean;
  title?: string;
  fullWidth?: boolean;
}>;

export function PrimaryButton({
  onPress,
  disabled,
  title,
  children,
  fullWidth,
}: PrimaryButtonProps) {
  const colorScheme = useColorScheme();
  const backgroundColor = useThemeColor({}, 'tint');
  const textColor = colorScheme === 'dark' ? '#0F172A' : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}>
      {(title || children) && (
        <ThemedText style={[styles.text, { color: textColor }]}>
          {title ?? children}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 17,
    fontWeight: '600',
  },
});
