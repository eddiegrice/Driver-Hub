import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

import { FrostedGlassView } from '@/components/FrostedGlassView';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useMember } from '@/context/MemberContext';
import {
  FontSize,
  FontWeight,
  NeoGlass,
  NeoText,
  Radius,
  Spacing,
} from '@/constants/theme';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';
const SMOKED_OVERLAY = 'rgba(255, 255, 255, 0.03)';

type MenuIconName =
  | 'newspaper.fill'
  | 'person.crop.circle'
  | 'doc.text.magnifyingglass'
  | 'checklist'
  | 'message.fill'
  | 'square.grid.2x2'
  | 'car.fill'
  | 'calendar'
  | 'dollarsign.circle'
  | 'creditcard.fill'
  | 'folder.fill'
  | 'poll'
  | 'gavel.fill'
  | 'book.closed.fill';

const MENU_SECTIONS: {
  title: string;
  items: { route: string; label: string; icon: MenuIconName }[];
}[] = [
  {
    title: 'PHD Matrix Menu',
    items: [
      { route: '/casework', label: 'Casework', icon: 'doc.text.magnifyingglass' },
      { route: '/chat', label: 'Chat Room', icon: 'message.fill' },
      { route: '/earnings-calc', label: 'Earnings Calc', icon: 'dollarsign.circle' },
      { route: '/library', label: 'Library', icon: 'book.closed.fill' },
      { route: '/local-events', label: 'Local Events', icon: 'calendar' },
      { route: '/petitions', label: 'Petitions', icon: 'gavel.fill' },
      { route: '/polls', label: 'Polls & Surveys', icon: 'poll' },
      { route: '/traffic-alerts', label: 'Traffic Alerts', icon: 'car.fill' },
      { route: '/news', label: 'Trade News', icon: 'newspaper.fill' },
    ],
  },
  {
    title: 'Your PHD Matrix',
    items: [
      { route: '/profile', label: 'My Profile', icon: 'person.crop.circle' },
      { route: '/docs-vault', label: 'My Docs Vault', icon: 'folder.fill' },
      { route: '/member-e-card', label: 'Member E-Card', icon: 'creditcard.fill' },
    ],
  },
];

/** Max height of the menu glass container as a fraction of screen (0.45 = 45%). */
const MENU_CONTAINER_HEIGHT_RATIO = 0.45;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member } = useMember();
  const screenHeight = Dimensions.get('window').height;
  const menuContainerMaxHeight = screenHeight * MENU_CONTAINER_HEIGHT_RATIO;

  const membershipStatus = member?.membershipStatus ?? '—';
  const isActive = membershipStatus === 'active';
  const screenWidth = Dimensions.get('window').width;
  const twoBoxRowWidth = screenWidth - 2 * Spacing.xl - 2 * Spacing.md;

  return (
    <View style={styles.screen}>
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

        {/* Single glassmorphic menu container (app-drawer style): scrollable when content overflows */}
        <View style={[styles.glassBoxOuter, { height: menuContainerMaxHeight }]}>
          <View style={[styles.glassBox, { borderColor: LIGHT_EDGE }]}>
            <FrostedGlassView
              borderRadius={Radius.lg - 1}
              intensity={12}
              overlayColor={SMOKED_OVERLAY}
              style={styles.glassBoxFrosted}
            >
              <ScrollView
                style={styles.menuScroll}
                contentContainerStyle={styles.menuScrollContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
              >
                {MENU_SECTIONS.map((section) => (
                  <View key={section.title} style={styles.menuSection}>
                    <View style={styles.menuSectionHeader}>
                      <View style={styles.sectionHeaderLine} />
                      <ThemedText style={styles.menuSectionTitle}>{section.title}</ThemedText>
                      <View style={styles.sectionHeaderLine} />
                    </View>
                    {section.items.reduce<typeof section.items[]>((rows, item, i) => {
                      if (i % 3 === 0) rows.push([]);
                      rows[rows.length - 1].push(item);
                      return rows;
                    }, []).map((row, rowIndex) => (
                      <View key={rowIndex} style={styles.menuRow}>
                        {row.map(({ route, label, icon }) => (
                          <TouchableOpacity
                            key={`${route}-${label}`}
                            activeOpacity={0.8}
                            onPress={() => router.push(route)}
                            style={styles.menuItem}
                          >
                            <View style={styles.menuIconWrap}>
                              <IconSymbol name={icon} size={28} color="#FFFFFF" />
                            </View>
                            <ThemedText style={styles.menuItemLabel} numberOfLines={1}>
                              {label}
                            </ThemedText>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>
            </FrostedGlassView>
          </View>
        </View>

        {/* Two glassmorphic boxes: same style as menu, align with it, gap between */}
        <View style={[styles.twoBoxRow, { width: twoBoxRowWidth }]}>
          <View style={[styles.glassBoxCard, { borderColor: LIGHT_EDGE }]}>
            <FrostedGlassView
              borderRadius={Radius.lg - 1}
              intensity={12}
              overlayColor={SMOKED_OVERLAY}
              style={styles.glassBoxCardFrosted}
            >
              <View style={styles.glassBoxCardContent}>
                <ThemedText style={styles.glassBoxCardTitle}>Announcements</ThemedText>
                <ThemedText style={styles.glassBoxCardBody}>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                  et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                </ThemedText>
              </View>
            </FrostedGlassView>
          </View>
          <View style={[styles.glassBoxCard, { borderColor: LIGHT_EDGE }]}>
            <FrostedGlassView
              borderRadius={Radius.lg - 1}
              intensity={12}
              overlayColor={SMOKED_OVERLAY}
              style={styles.glassBoxCardFrosted}
            >
              <View style={styles.glassBoxCardContent}>
                <ThemedText style={styles.glassBoxCardTitle}>What&apos;s On</ThemedText>
                <ThemedText style={styles.glassBoxCardBody}>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                  dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                </ThemedText>
              </View>
            </FrostedGlassView>
          </View>
        </View>
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
  twoBoxRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.md,
    gap: Spacing.xl,
  },
  glassBoxCard: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 300,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  glassBoxCardFrosted: {
    flex: 1,
    minHeight: 0,
  },
  glassBoxCardContent: {
    flex: 1,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  glassBoxCardTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
    marginBottom: Spacing.md,
  },
  glassBoxCardBody: {
    fontSize: FontSize.body,
    lineHeight: 22,
    color: NeoText.secondary,
  },
  // Glass menu container (matches Chat tab pattern)
  glassBoxOuter: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 0,
  },
  glassBox: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  glassBoxFrosted: {
    flex: 1,
    minHeight: 0,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    flexGrow: 1,
    justifyContent: 'space-evenly',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  menuSection: {
    marginBottom: Spacing.xxl,
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
  },
  menuItemLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
  },
});
