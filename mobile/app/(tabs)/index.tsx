import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrontPageAnnouncementsSection } from '@/components/home/FrontPageAnnouncementsSection';
import { MenuIconGrid, type MenuGridItem } from '@/components/home/MenuIconGrid';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { useMember } from '@/context/MemberContext';
import { HUB_SCROLL_BOTTOM_GAP } from '@/constants/mainBottomBar';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = NeoGlass.cardBorder;

const PHD_MATRIX_MENU: MenuGridItem[] = [
  { route: '/profile', label: 'Profile', icon: 'person.crop.circle' },
  { route: '/docs-vault', label: 'Docs Vault', icon: 'folder.fill' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { memberStatus } = useMember();
  const isActive = memberStatus.isActive;
  const membershipStatus = memberStatus.membershipStatus;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Spacing.md, paddingBottom: (insets.bottom || 16) + HUB_SCROLL_BOTTOM_GAP },
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

        <FrontPageAnnouncementsSection />

        <MenuIconGrid
          title="Your PHD Matrix"
          items={PHD_MATRIX_MENU}
          itemsPerRow={2}
          isMemberActive={isActive}
          onNavigate={(route) => router.push(route)}
          onPremiumBlocked={() => {}}
        />
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
});
