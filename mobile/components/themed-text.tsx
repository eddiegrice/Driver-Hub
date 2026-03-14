import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontSize, Fonts, LineHeight } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const textColor = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const linkColor = useThemeColor({}, 'tint');
  const color = type === 'link' ? linkColor : textColor;

  const fontFamily =
    typeof Fonts?.sans === 'string' && Fonts.sans !== 'normal' ? Fonts.sans : undefined;
  return (
    <Text
      style={[
        { color, ...(fontFamily ? { fontFamily } : {}) },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: FontSize.body,
    lineHeight: FontSize.body * LineHeight.relaxed,
  },
  defaultSemiBold: {
    fontSize: FontSize.body,
    lineHeight: FontSize.body * LineHeight.relaxed,
    fontWeight: '600',
  },
  title: {
    fontSize: FontSize.title,
    fontWeight: '600',
    lineHeight: FontSize.title * LineHeight.tight,
  },
  subtitle: {
    fontSize: FontSize.subtitle,
    fontWeight: '600',
    lineHeight: FontSize.subtitle * LineHeight.normal,
  },
  link: {
    fontSize: FontSize.body,
    lineHeight: FontSize.body * LineHeight.relaxed,
    fontWeight: '600',
  },
});
