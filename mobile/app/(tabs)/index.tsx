import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useMember } from '@/context/MemberContext';
import {
  FontSize,
  FontWeight,
  NeoAccent,
  NeoText,
  Radius,
  Spacing,
} from '@/constants/theme';

const MENU_ITEMS: {
  route: string;
  label: string;
  icon: 'newspaper.fill' | 'person.crop.circle' | 'doc.text.magnifyingglass' | 'checklist' | 'message.fill' | 'square.grid.2x2';
}[] = [
  { route: '/news', label: 'News', icon: 'newspaper.fill' },
  { route: '/profile', label: 'Profile', icon: 'person.crop.circle' },
  { route: '/casework', label: 'Casework', icon: 'doc.text.magnifyingglass' },
  { route: '/polls', label: 'Polls', icon: 'checklist' },
  { route: '/chat', label: 'Chat', icon: 'message.fill' },
  { route: '/more', label: 'More', icon: 'square.grid.2x2' },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member } = useMember();

  const membershipStatus = member?.membershipStatus ?? '—';
  const membershipNumber = member?.membershipNumber ?? '—';
  const isActive = membershipStatus === 'active';

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
        <GlassCard elevated gradientBorder={isActive} style={styles.card}>
          <View style={styles.statusRow}>
            <View>
              <ThemedText style={styles.label}>Membership status</ThemedText>
              <ThemedText style={styles.value}>{membershipStatus}</ThemedText>
            </View>
            <View style={[styles.badge, isActive && styles.badgeActive]}>
              <LinearGradient
                colors={isActive ? (NeoAccent.cyan as unknown as string[]) : ['#444', '#333']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <ThemedText style={styles.badgeText}>{isActive ? 'Active' : membershipStatus}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.muted}>Member no. {membershipNumber}</ThemedText>
        </GlassCard>

        <View style={styles.menuGrid}>
          {MENU_ITEMS.map(({ route, label, icon }) => (
            <TouchableOpacity
              key={route}
              activeOpacity={0.8}
              onPress={() => router.push(route)}
              style={styles.quickTileWrap}
            >
              <GlassCard style={styles.quickTile}>
                <View style={styles.quickIconWrap}>
                  <IconSymbol name={icon} size={26} color={NeoText.secondary} />
                </View>
                <ThemedText style={styles.quickLabel} numberOfLines={1}>{label}</ThemedText>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText style={styles.sectionTitle}>Latest updates</ThemedText>
        <GlassCard elevated style={styles.card}>
          <ThemedText style={styles.cardTitle}>News & announcements</ThemedText>
          <ThemedText style={styles.cardBody}>
            Important club news and updates appear here. Tap below to open the full feed.
          </ThemedText>
          <TouchableOpacity onPress={() => router.push('/news')} style={styles.linkRow}>
            <ThemedText style={styles.link}>View news</ThemedText>
            <IconSymbol name="chevron.right" size={18} color={NeoAccent.purple[0]} />
          </TouchableOpacity>
        </GlassCard>
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
    marginBottom: 0,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
    fontWeight: FontWeight.regular,
  },
  value: {
    fontSize: FontSize.title,
    fontWeight: FontWeight.bold,
    color: NeoText.primary,
    marginTop: 2,
  },
  badge: {
    overflow: 'hidden',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: 'center',
    position: 'relative',
  },
  badgeActive: {},
  badgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: NeoText.primary,
  },
  muted: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
  },
  sectionTitle: {
    fontSize: FontSize.subtitle,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
    marginBottom: Spacing.sm,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
  },
  quickTileWrap: {
    width: '30%',
    minWidth: 100,
    flexGrow: 1,
  },
  quickTile: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 96,
  },
  quickIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
  },
  cardTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
    marginBottom: Spacing.sm,
  },
  cardBody: {
    fontSize: FontSize.body,
    color: NeoText.secondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  link: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: NeoAccent.purple[0],
  },
});
