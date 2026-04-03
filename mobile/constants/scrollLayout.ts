import { Spacing } from '@/constants/theme';

/**
 * Default gutters for scrollable stack content under the global header.
 * Prefer this (or `ParallaxScrollView`) instead of ad-hoc large `paddingTop` values.
 */
export const scrollContentGutter = {
  paddingHorizontal: Spacing.xl,
  paddingTop: Spacing.sm,
  paddingBottom: Spacing.xxl,
} as const;
