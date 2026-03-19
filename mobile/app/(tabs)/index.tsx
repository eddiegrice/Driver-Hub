import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { useEffect, useMemo, useState } from 'react';

import { FrostedGlassView } from '@/components/FrostedGlassView';
import { AssociationMembershipModal } from '@/components/AssociationMembershipModal';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { CommandCenterTiles } from '@/components/CommandCenterTiles';
import { useMember } from '@/context/MemberContext';
import { useTraffic } from '@/context/TrafficContext';
import { supabase } from '@/lib/supabase';
import { fetchBridgeStatus } from '@/lib/bridge-supabase';
import { computeMotorwayStatuses } from '@/lib/traffic-status';
import type { BridgeStatus } from '@/types/bridge';
import {
  FontSize,
  FontWeight,
  NeoGlass,
  NeoText,
  Radius,
  Spacing,
} from '@/constants/theme';
import { CHAT_ROOM_VISIBLE } from '@/constants/features';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';
const SMOKED_OVERLAY = 'rgba(255, 255, 255, 0.03)';

type MenuIconName =
  | 'newspaper.fill'
  | 'person.crop.circle'
  | 'doc.text.magnifyingglass'
  | 'message.fill'
  | 'dollarsign.circle'
  | 'creditcard.fill'
  | 'folder.fill'
  | 'poll'
  | 'gavel.fill'
  | 'book.closed.fill'
  | 'megaphone.fill'
  | 'calendar'
  | 'music.note'
  | 'soccerball'
  | 'exclamationmark.triangle.fill'
  | 'wrench.and.screwdriver'
  | 'calendar.badge.clock'
  | 'clock.fill'
  | 'chart.line.uptrend.xyaxis'
  | 'signpost.left.fill'
  | 'star.fill';

/** Four menu boxes: Your PHD Matrix, Collective (merged), Glasgow Traffic Data, Glasgow Events Data. */
const MENU_BOXES: {
  title: string;
  items: { route: string; label: string; icon: MenuIconName; premium?: boolean }[];
  itemsPerRow: number;
}[] = [
  {
    title: 'Your PHD Matrix',
    itemsPerRow: 3,
    items: [
      { route: '/profile', label: 'Profile', icon: 'person.crop.circle' },
      { route: '/docs-vault', label: 'Docs Vault', icon: 'folder.fill' },
      { route: '/member-e-card', label: 'Member E-Card', icon: 'creditcard.fill' },
    ],
  },
  {
    title: 'Association Members Only',
    itemsPerRow: 3,
    items: [
      ...(CHAT_ROOM_VISIBLE ? [{ route: '/chat' as const, label: 'Chat Room' as const, icon: 'message.fill' as const }] : []),
      { route: '/campaigns', label: 'Campaigns', icon: 'megaphone.fill', premium: true },
      { route: '/news', label: 'News', icon: 'newspaper.fill', premium: true },
      { route: '/casework', label: 'Casework', icon: 'doc.text.magnifyingglass', premium: true },
      { route: '/library', label: 'Library', icon: 'book.closed.fill', premium: true },
      { route: '/petitions', label: 'Petitions', icon: 'gavel.fill', premium: true },
      { route: '/polls', label: 'Polls', icon: 'poll', premium: true },
    ],
  },
  {
    title: 'Glasgow Traffic Data',
    itemsPerRow: 3,
    items: [
      { route: '/traffic-incidents', label: 'Incidents', icon: 'exclamationmark.triangle.fill' },
      { route: '/traffic-current-roadworks', label: 'Current Roadworks', icon: 'wrench.and.screwdriver' },
      { route: '/traffic-future-roadworks', label: 'Future Roadworks', icon: 'calendar.badge.clock' },
      { route: '/traffic-journey-times', label: 'Journey Times', icon: 'clock.fill' },
      { route: '/traffic-flows', label: 'Traffic Flows', icon: 'chart.line.uptrend.xyaxis' },
      { route: '/traffic-vms-signs', label: 'VMS Signs', icon: 'signpost.left.fill' },
    ],
  },
  {
    title: 'Glasgow Events Data',
    itemsPerRow: 3,
    items: [
      { route: '/events-gigs', label: 'Gigs & Shows', icon: 'music.note' },
      { route: '/events-sport', label: 'Sport Events', icon: 'soccerball' },
      { route: '/events-other', label: 'Other Events', icon: 'calendar' },
    ],
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { memberStatus } = useMember();
  const { situations } = useTraffic();

  const isActive = memberStatus.isActive;
  const membershipStatus = memberStatus.membershipStatus;

  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [bridgeError, setBridgeError] = useState<Error | null>(null);
  const [bridgeLoading, setBridgeLoading] = useState(true);
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBridgeLoading(true);
      const { status, error } = await fetchBridgeStatus(supabase, 'renfrew_bridge');
      if (cancelled) return;
      setBridge(status);
      setBridgeError(error);
      setBridgeLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const bridgeUi = useMemo(() => {
    if (!bridge || bridgeError) return { label: 'Status unavailable', kind: 'unknown' as const };
    if (bridge.status === 'open') return { label: 'OPEN', kind: 'open' as const };
    if (bridge.status === 'closed') return { label: 'CLOSED', kind: 'closed' as const };
    return { label: 'Status unavailable', kind: 'unknown' as const };
  }, [bridge, bridgeError]);

  const motorwayStatuses = useMemo(
    () => computeMotorwayStatuses(situations),
    [situations]
  );

  return (
    <View style={styles.screen}>
      <AssociationMembershipModal visible={membershipModalVisible} onClose={() => setMembershipModalVisible(false)} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Spacing.md,
            paddingBottom: (insets.bottom || 16) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard
          elevated
          gradientBorder={isActive}
          borderRadius={Radius.lg}
          borderColor={LIGHT_EDGE}
          contentStyle={styles.cardContent}
          sleek
          style={styles.card}
        >
          <View style={styles.statusRow}>
            <ThemedText style={[styles.label, isActive && styles.labelOnCyan]}>
              Membership status
            </ThemedText>
            <View style={[styles.badge, isActive && styles.badgeActive]}>
              {!isActive && (
                <LinearGradient
                  colors={['#444', '#333']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <ThemedText style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                {isActive ? 'Active' : membershipStatus}
              </ThemedText>
            </View>
          </View>
        </GlassCard>

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
                  bridgeUi.kind === 'open' && styles.bridgePillOpen,
                  bridgeUi.kind === 'closed' && styles.bridgePillClosed,
                ]}
              >
                <ThemedText
                  style={[
                    styles.bridgePillText,
                    bridgeUi.kind === 'open' && styles.bridgePillTextOpen,
                    bridgeUi.kind === 'closed' && styles.bridgePillTextClosed,
                  ]}
                >
                  {bridgeLoading ? 'CHECKING…' : bridgeUi.label}
                </ThemedText>
              </View>
            </View>
          </View>

          <CommandCenterTiles items={motorwayStatuses} />
        </GlassCard>

        {/* Five menu boxes: each with header and icon grid */}
        {MENU_BOXES.map((box) => (
          <View key={box.title} style={styles.menuBoxOuter}>
            <View style={[styles.menuBox, { borderColor: LIGHT_EDGE }]}>
              <FrostedGlassView
                borderRadius={Radius.lg - 1}
                intensity={12}
                overlayColor={SMOKED_OVERLAY}
                style={styles.menuBoxFrosted}
              >
                <View style={styles.menuSectionHeader}>
                  <View style={styles.sectionHeaderLine} />
                  <ThemedText style={styles.menuSectionTitle}>{box.title}</ThemedText>
                  <View style={styles.sectionHeaderLine} />
                </View>
                {box.items.reduce<typeof box.items[]>((rows, item, i) => {
                  if (i % box.itemsPerRow === 0) rows.push([]);
                  rows[rows.length - 1].push(item);
                  return rows;
                }, []).map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.menuRow}>
                    {row.map(({ route, label, icon, premium }) => (
                      <TouchableOpacity
                        key={`${route}-${label}`}
                        activeOpacity={0.8}
                        style={styles.menuItem}
                        onPress={() => {
                          if (premium && !isActive) {
                            setMembershipModalVisible(true);
                            return;
                          }
                          router.push(route);
                        }}>
                        <View style={styles.menuIconWrap}>
                          <View style={styles.menuIconInner}>
                            <IconSymbol name={icon} size={28} color="#FFFFFF" style={styles.menuIconNudge} />
                          </View>
                          {premium && <IconSymbol name="star.fill" size={16} color="#FFD166" style={styles.premiumStar} />}
                        </View>
                        <ThemedText style={styles.menuItemLabel} numberOfLines={2}>
                          {label}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </FrostedGlassView>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
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
    gap: Spacing.xxl,
  },
  card: {
    marginHorizontal: Spacing.md,
    marginBottom: 0,
  },
  cardContent: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
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
  bridgeSub: {
    fontSize: FontSize.sm,
    color: NeoText.secondary,
    opacity: 0.9,
  },
  bridgeNext: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
    marginTop: 2,
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.body,
    color: NeoText.muted,
    fontWeight: FontWeight.semibold,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  labelOnCyan: {
    color: '#FFFFFF',
  },
  badge: {
    overflow: 'hidden',
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: 'center',
    position: 'relative',
  },
  badgeActive: {
    backgroundColor: '#00CCFF',
  },
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: NeoText.primary,
  },
  badgeTextActive: {
    color: '#1e1b4b',
  },
  menuBoxOuter: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  menuBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuBoxFrosted: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  menuSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  sectionHeaderLine: {
    flex: 1,
    maxWidth: 72,
    height: 1,
    backgroundColor: NeoGlass.stroke,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  menuIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    shadowColor: '#00CCFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
  },
  menuIconInner: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Slight downward nudge so round icons (e.g. clock, soccer ball) sit visually centered in the neon glow. */
  menuIconNudge: {
    transform: [{ translateY: 2 }],
  },
  menuItemLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
  },
  premiumStar: {
    position: 'absolute',
    top: -4,
    right: -3,
  },
});
