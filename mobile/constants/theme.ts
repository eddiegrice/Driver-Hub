/**
 * DriverHub design system — sleek, professional, easy to read.
 * Primary: deep teal (trust, transport). Accent: warm amber (premium, clear CTAs).
 */
import { Platform } from 'react-native';

// Brand
export const Brand = {
  primary: '#0D5C63',      // Deep teal
  primaryDark: '#08464B',
  accent: '#D4A012',       // Warm amber
  accentLight: '#E8B82E',
} as const;

// Light theme
const light = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  tint: Brand.primary,
  tabIconDefault: '#94A3B8',
  tabIconSelected: Brand.primary,
  success: '#059669',
  error: '#DC2626',
  cardAccent: Brand.primary,
};

// Dark theme
const dark = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceElevated: '#334155',
  text: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  border: '#334155',
  borderLight: '#1E293B',
  tint: Brand.accent,
  tabIconDefault: '#64748B',
  tabIconSelected: Brand.accent,
  success: '#10B981',
  error: '#EF4444',
  cardAccent: Brand.accent,
};

export const Colors = {
  light,
  dark,
  brand: Brand,
};

// Spacing scale (px)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Border radius
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

// Typography — larger body for readability
export const FontSize = {
  xs: 12,
  sm: 14,
  body: 17,
  bodyLarge: 19,
  subtitle: 20,
  title: 28,
  hero: 34,
} as const;

export const LineHeight = {
  tight: 1.25,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.6,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "system-ui, sans-serif",
    mono: "ui-monospace, monospace",
  },
});
