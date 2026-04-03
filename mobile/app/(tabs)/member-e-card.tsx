import { ScrollView, StyleSheet, View } from 'react-native';

import { AssociationDashboardBackLink } from '@/components/AssociationDashboardBackLink';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { useMember } from '@/context/MemberContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { formatDateForDisplay } from '@/types/member';

function MemberECardInner() {
  const { member } = useMember();
  const name = member.name.trim() || 'Name not set';
  const badgeNumber = member.badgeNumber.trim() || 'Badge not set';
  const memberNumber = member.membershipNumber.trim() || '—';
  const validFrom = formatDateForDisplay(member.subscriptionStartDate);
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const textMuted = useThemeColor({}, 'textMuted');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.screen}>
      <AssociationDashboardBackLink />
      <TabScreenHeader title="Member E-Card" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <View style={[styles.cardShell, { borderColor: border }]}>
            <View style={[styles.card, { backgroundColor: surface }]}>
              <View style={[styles.accent, { backgroundColor: tint }]} />

              <View style={styles.headerRow}>
                <ThemedText style={[styles.cardSubTitle, { color: textMuted }]}>Membership E-Card</ThemedText>
                <View style={styles.brandWrap}>
                  <View style={styles.brandTopRow}>
                    <ThemedText style={styles.brandTopPHD}>PHD</ThemedText>
                    <ThemedText style={styles.brandTopMatrix}>MATRIX:</ThemedText>
                  </View>
                  <ThemedText style={styles.brandBottom}>ASSOCIATION</ThemedText>
                </View>
              </View>

              <View style={styles.identityBlock}>
                <ThemedText style={[styles.metaLabel, { color: textMuted }]}>Member name</ThemedText>
                <ThemedText style={styles.memberName}>{name}</ThemedText>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailCell}>
                  <ThemedText style={[styles.metaLabel, { color: textMuted }]}>PHDL NO.</ThemedText>
                  <ThemedText style={styles.detailValue}>{badgeNumber}</ThemedText>
                </View>
                <View style={styles.detailCell}>
                  <ThemedText style={[styles.metaLabel, { color: textMuted }]}>Member no.</ThemedText>
                  <ThemedText style={styles.detailValue}>{memberNumber}</ThemedText>
                </View>
                <View style={styles.detailCell}>
                  <ThemedText style={[styles.metaLabel, { color: textMuted }]}>Valid from</ThemedText>
                  <ThemedText style={styles.detailValue}>{validFrom}</ThemedText>
                </View>
              </View>

              <View style={styles.footer}>
                <ThemedText style={[styles.statusHeadline, styles.statusHeadlineActive]}>
                  Association Membership Active
                </ThemedText>
                <ThemedText style={[styles.statusCaption, { color: textMuted }]}>
                  Your subscription to association services is in effect
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      </ScrollView>
    </View>
  );
}

export default function MemberECardScreen() {
  return (
    <AssociationMembershipGate title="Member E-Card">
      <MemberECardInner />
    </AssociationMembershipGate>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  container: {
    gap: Spacing.xl,
  },
  cardShell: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: 1,
  },
  card: {
    borderRadius: Radius.lg - 1,
    padding: Spacing.xl,
    minHeight: 240,
    justifyContent: 'space-between',
    gap: Spacing.lg,
  },
  accent: {
    height: 6,
    borderRadius: 999,
    marginBottom: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  cardSubTitle: {
    fontSize: FontSize.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  brandWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  brandTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
  },
  brandTopPHD: {
    fontSize: 22,
    fontWeight: FontWeight.superheavy,
    letterSpacing: -0.5,
  },
  brandTopMatrix: {
    fontSize: 22,
    fontWeight: FontWeight.light,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  brandBottom: {
    fontSize: 13,
    fontWeight: FontWeight.bold,
    letterSpacing: 4.2,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  identityBlock: {
    gap: Spacing.xs,
  },
  metaLabel: {
    fontSize: FontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  memberName: {
    fontSize: 28,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  detailCell: {
    flex: 1,
    gap: Spacing.xs,
  },
  detailValue: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  footer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    alignItems: 'center',
  },
  statusHeadline: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
    textAlign: 'center',
  },
  statusHeadlineActive: {
    color: '#41C56E',
  },
  statusCaption: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
  },
});
