/**
 * PHD Matrix — Neo-Gradients Glassmorphism Design System
 * Dark-mode-first: deep charcoal base, glowing portal gradient, glass surfaces, neon accents.
 */
import { Platform } from 'react-native';

// ——— Core canvas (dark-mode-first) ———
export const NeoBase = {
  canvas: '#101115',           // Deep charcoal base
  portalStart: '#3D37F2',      // Rich blue (gradient)
  portalEnd: '#8930F3',        // Purple (gradient)
} as const;

// ——— Glass element material (high-end glassmorphism) ———
export const NeoGlass = {
  frostedOverlay: 'rgba(255, 255, 255, 0.07)',  // Over blur for frosted look
  cardBorder: 'rgba(255, 255, 255, 0.1)',       // 1px etched border on cards/containers
  surface: 'rgba(22, 24, 30, 0.85)',           // Fallback when blur unavailable
  surfaceElevated: 'rgba(28, 30, 38, 0.9)',
  navBar: 'rgba(16, 17, 21, 0.75)',
  stroke: 'rgba(255, 255, 255, 0.12)',
  strokeBright: 'rgba(255, 255, 255, 0.18)',
} as const;

/** Gradient for Active Membership card border: cyan → purple */
export const MembershipCardBorderGradient = ['#00ccff', '#1a0033'] as const;

// ——— Accent gradients (neon) ———
export const NeoAccent = {
  purple: ['#8930F3', '#B24BF3'] as const,   // Active nav, primary glow
  cyan: ['#00D4FF', '#3D37F2'] as const,
  pink: ['#FF2D92', '#8930F3'] as const,
  gold: ['#FFD93D', '#FF9F43'] as const,
};

// ——— Semantic text (on dark) ———
export const NeoText = {
  primary: '#FFFFFF',
  secondary: 'rgba(255, 255, 255, 0.78)',
  muted: 'rgba(255, 255, 255, 0.55)',
  accent: '#B24BF3',
  success: '#00E676',
  error: '#FF5252',
} as const;

// Legacy Brand (kept for non-glass screens)
export const Brand = {
  primary: '#0D5C63',
  primaryDark: '#08464B',
  primaryLight: '#0F7A84',
  accent: '#D4A012',
  accentLight: '#E8B82E',
  accentMuted: 'rgba(212, 160, 18, 0.15)',
} as const;

export const Gradients = {
  hero: [Brand.primaryLight, Brand.primary, Brand.primaryDark] as const,
  heroDark: [Brand.primaryDark, '#062A2E'] as const,
  cardHighlight: [Brand.primary, Brand.primaryDark] as const,
  portal: [NeoBase.portalStart, NeoBase.portalEnd] as const,
} as const;

// Light theme (fallback)
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

// Dark theme = Neo-Glass. Background transparent so fixed gradient shows through.
const dark = {
  background: 'transparent',
  surface: NeoGlass.surface,
  surfaceElevated: NeoGlass.surfaceElevated,
  text: NeoText.primary,
  textSecondary: NeoText.secondary,
  textMuted: NeoText.muted,
  border: NeoGlass.stroke,
  borderLight: 'rgba(255,255,255,0.06)',
  tint: NeoAccent.purple[0],
  tabIconDefault: NeoText.muted,
  tabIconSelected: NeoAccent.purple[0],
  success: NeoText.success,
  error: NeoText.error,
  cardAccent: NeoAccent.purple[0],
};

export const Colors = {
  light,
  dark,
  brand: Brand,
  neo: { base: NeoBase, glass: NeoGlass, text: NeoText, accent: NeoAccent },
};

// Spacing
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Corner radii — large for primary cards (32–40px)
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  card: 32,
  cardLarge: 40,
  full: 9999,
} as const;

// Typography — bold titles/numbers, lighter secondary
export const FontSize = {
  xs: 12,
  sm: 14,
  body: 16,
  bodyLarge: 18,
  subtitle: 20,
  title: 26,
  titleLarge: 32,
  hero: 38,
  display: 42,
} as const;

export const LineHeight = {
  tight: 1.25,
  normal: 1.4,
  relaxed: 1.5,
  loose: 1.6,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  superheavy: '900' as const,
  light: '300' as const,
  thin: '200' as const,
};

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
