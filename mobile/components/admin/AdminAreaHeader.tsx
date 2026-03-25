import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { MenuSectionEyebrow } from '@/components/home/MenuIconGrid';
import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, NeoGlass, NeoText, Spacing } from '@/constants/theme';

export type AdminAreaHeaderProps = {
  /** Shown in the uppercase eyebrow with wide side lines (e.g. News System, Admin systems). */
  subsystemLabel: string;
  /** Main admin hub omits the back row; subsystem screens show it. */
  showBackLink?: boolean;
  /** Default: ← Admin dashboard (navigates to `/admin`). */
  backLabel?: string;
  /** Default: `router.push('/admin')`. Use `router.back` when nested admin flows need stack pop. */
  onBackPress?: () => void;
};

/**
 * Shared admin chrome: optional back link, rule, **Admin Dashboard** title (matches Association scale),
 * then {@link MenuSectionEyebrow} with `wideSideLines` for the active subsystem.
 */
export function AdminAreaHeader({
  subsystemLabel,
  showBackLink = true,
  backLabel = '← Admin dashboard',
  onBackPress,
}: AdminAreaHeaderProps) {
  const router = useRouter();
  const handleBack = onBackPress ?? (() => router.push('/admin' as Href));

  return (
    <View style={styles.root}>
      {showBackLink ? (
        <View style={styles.backWrap}>
          <TouchableOpacity onPress={handleBack} hitSlop={12}>
            <ThemedText type="link">{backLabel}</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={[styles.dashboardHeader, !showBackLink && styles.dashboardHeaderHub]}>
        <View style={styles.headerLine} />
        <ThemedText style={styles.dashboardTitle}>Admin Dashboard</ThemedText>
        <MenuSectionEyebrow label={subsystemLabel} wideSideLines />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  backWrap: {
    paddingTop: Spacing.sm,
    paddingBottom: 0,
  },
  dashboardHeader: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  dashboardHeaderHub: {
    paddingTop: Spacing.md,
  },
  headerLine: {
    height: 1,
    width: '100%',
    backgroundColor: NeoGlass.stroke,
  },
  dashboardTitle: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    textAlign: 'center',
  },
});
