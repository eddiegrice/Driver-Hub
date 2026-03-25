import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { CommandCenterTiles } from '@/components/CommandCenterTiles';
import type { BridgeBannerDisplay } from '@/lib/bridge-display';
import type { MotorwayStatus } from '@/lib/traffic-status';
import { FontSize, FontWeight, NeoGlass, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';
const BRIDGE_ALERT_AMBER = 'rgba(255, 220, 150, 0.95)';

type Props = {
  bridgeBanner: BridgeBannerDisplay;
  motorwayStatuses: MotorwayStatus[];
};

export function GlasgowRoadsAlertsCard({ bridgeBanner, motorwayStatuses }: Props) {
  return (
    <GlassCard
      elevated
      borderRadius={Radius.lg}
      borderColor={LIGHT_EDGE}
      contentStyle={styles.commandCenterContent}
      sleek
      style={styles.commandCenterCard}
    >
      <View style={styles.alertsHeaderRow}>
        <View style={styles.alertsHeaderLine} />
        <ThemedText style={styles.alertsHeaderText}>Glasgow Roads Alerts</ThemedText>
        <View style={styles.alertsHeaderLine} />
      </View>

      <View style={styles.bridgeCard}>
        <View style={styles.bridgeHeaderRow}>
          <View style={styles.bridgeTitleBlock}>
            <ThemedText style={styles.bridgeTitleTop}>RENFREW BRIDGE</ThemedText>
            <ThemedText style={styles.bridgeTitleSub}>Current Status</ThemedText>
          </View>
          <View
            style={[
              styles.bridgePill,
              bridgeBanner.pillKind === 'open' && styles.bridgePillOpen,
              bridgeBanner.pillKind === 'closed' && styles.bridgePillClosed,
            ]}
          >
            <ThemedText
              style={[
                styles.bridgePillText,
                bridgeBanner.pillKind === 'open' && styles.bridgePillTextOpen,
                bridgeBanner.pillKind === 'closed' && styles.bridgePillTextClosed,
              ]}
            >
              {bridgeBanner.pillLabel}
            </ThemedText>
          </View>
        </View>
        {bridgeBanner.warning?.kind === 'planned' ? (
          <ThemedText style={styles.bridgeWarning}>
            <ThemedText style={styles.bridgeWarningBold}>CLOSURE ALERT: </ThemedText>
            <ThemedText style={styles.bridgeWarningLine1Rest}>
              {bridgeBanner.warning.line1Rest}
            </ThemedText>
            {'\n'}
            <ThemedText style={styles.bridgeWarningItalic}>Times are approximate</ThemedText>
          </ThemedText>
        ) : bridgeBanner.warning?.kind === 'in_progress' ? (
          <ThemedText style={styles.bridgeWarning}>{bridgeBanner.warning.text}</ThemedText>
        ) : null}
      </View>

      <CommandCenterTiles items={motorwayStatuses} />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  commandCenterCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  commandCenterContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  bridgeCard: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: 'rgba(60, 120, 255, 0.26)',
    borderWidth: 1,
    borderColor: 'rgba(140, 180, 255, 0.9)',
    shadowColor: 'rgba(0, 0, 0, 0.7)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  bridgeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
  },
  bridgeTitleBlock: {
    flex: 1,
  },
  bridgeTitleTop: {
    fontSize: FontSize.body,
    color: '#E5EDFF',
    fontWeight: FontWeight.semibold,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
    letterSpacing: 1.2,
  },
  bridgeTitleSub: {
    fontSize: FontSize.sm,
    color: 'rgba(230, 237, 255, 0.85)',
    fontWeight: FontWeight.medium,
  },
  bridgePill: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(10, 22, 40, 0.8)',
  },
  bridgePillOpen: {
    borderColor: 'rgba(74, 222, 128, 0.7)',
    backgroundColor: 'rgba(22, 163, 74, 0.95)',
  },
  bridgePillClosed: {
    borderColor: 'rgba(255, 80, 80, 0.45)',
    backgroundColor: 'rgba(255, 80, 80, 0.14)',
  },
  bridgePillText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: '#E5EDFF',
    letterSpacing: 1,
  },
  bridgePillTextOpen: {
    color: '#ECFDF5',
  },
  bridgePillTextClosed: {
    color: '#FFD6D6',
  },
  bridgeWarning: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm + 1,
    lineHeight: 22,
    color: BRIDGE_ALERT_AMBER,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  bridgeWarningBold: {
    fontWeight: FontWeight.bold,
    color: BRIDGE_ALERT_AMBER,
    fontSize: FontSize.sm + 1,
  },
  bridgeWarningLine1Rest: {
    fontWeight: FontWeight.medium,
    color: BRIDGE_ALERT_AMBER,
    fontSize: FontSize.sm + 1,
  },
  bridgeWarningItalic: {
    fontStyle: 'italic',
    fontWeight: FontWeight.regular,
    color: BRIDGE_ALERT_AMBER,
    fontSize: FontSize.sm + 1,
  },
  alertsHeaderRow: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  alertsHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: NeoGlass.stroke,
    maxWidth: 72,
  },
  alertsHeaderText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(230, 237, 255, 0.85)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
