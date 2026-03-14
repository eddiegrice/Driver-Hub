import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { formatDateForDisplay } from '@/types/member';

type MembershipCardProps = {
  name: string;
  membershipNumber: string;
  status: 'active' | 'expired' | 'pending';
  membershipExpiry: string;
};

export function MembershipCard({
  name,
  membershipNumber,
  status,
  membershipExpiry,
}: MembershipCardProps) {
  const displayName = name.trim() || 'Add your name in the form below';
  const statusLabel = status === 'active' ? 'Active' : status === 'expired' ? 'Expired' : 'Pending';

  return (
    <View style={styles.card}>
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <ThemedText style={styles.label}>MEMBERSHIP CARD</ThemedText>
        <ThemedText style={styles.name}>{displayName}</ThemedText>
        <View style={styles.row}>
          <ThemedText style={styles.meta}>No. {membershipNumber || '—'}</ThemedText>
          <ThemedText style={[styles.badge, status === 'active' && styles.badgeActive]}>
            {statusLabel}
          </ThemedText>
        </View>
        <ThemedText style={styles.expiry}>Expires {formatDateForDisplay(membershipExpiry)}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.primaryDark,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    paddingTop: 1,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: Brand.accent,
  },
  content: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg + 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: Spacing.xs,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  meta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  badgeActive: {
    color: '#0F172A',
    backgroundColor: '#00CCFF',
  },
  expiry: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
});
