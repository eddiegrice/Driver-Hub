import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssociationFeatureTile } from '@/components/association/AssociationFeatureTile';
import { AssociationMembershipModal } from '@/components/AssociationMembershipModal';
import { MenuSectionEyebrow, type MenuGridItem } from '@/components/home/MenuIconGrid';
import { ThemedText } from '@/components/themed-text';
import { useMember } from '@/context/MemberContext';
import { CHAT_ROOM_VISIBLE } from '@/constants/features';
import { HUB_SCROLL_BOTTOM_GAP } from '@/constants/mainBottomBar';
import { FontSize, FontWeight, NeoGlass, NeoText, Spacing } from '@/constants/theme';

const ASSOCIATION_MENU: MenuGridItem[] = [
  ...(CHAT_ROOM_VISIBLE
    ? [{ route: '/chat' as const, label: 'Chat Room' as const, icon: 'message.fill' as const }]
    : []),
  {
    route: '/member-e-card',
    label: 'Member E-Card',
    icon: 'creditcard.fill',
    premium: true,
    description: 'Your electronic membership card for your association membership.',
  },
  {
    route: '/casework',
    label: 'Casework and Support',
    icon: 'briefcase.fill',
    premium: true,
    description: 'Request caseworker support for licensing and enforcement issues.',
  },
  {
    route: '/news',
    label: 'News and Updates',
    icon: 'newspaper.fill',
    premium: true,
    description: 'News, updates and important announcements for association members.',
  },
  {
    route: '/polls',
    label: 'Polls and Surveys',
    icon: 'poll',
    premium: true,
    description: 'Take part in association polls, ballots and surveys.',
  },
  {
    route: '/library',
    label: 'Guidance Library',
    icon: 'book.closed.fill',
    premium: true,
    description: 'Find documents and links on licensing and regulatory matters.',
  },
  {
    route: '/association',
    label: 'Coming Soon',
    icon: 'sparkles',
    premium: true,
    description: 'New member-only feature coming soon',
    comingSoon: true,
  },
];

export default function AssociationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { memberStatus } = useMember();
  const isActive = memberStatus.isActive;
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);

  return (
    <View style={styles.screen}>
      <AssociationMembershipModal visible={membershipModalVisible} onClose={() => setMembershipModalVisible(false)} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (insets.bottom || 16) + HUB_SCROLL_BOTTOM_GAP },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardHeader}>
          <View style={styles.headerLine} />
          <ThemedText style={styles.dashboardTitle}>Association Dashboard</ThemedText>
          <MenuSectionEyebrow label="Association Members Only" wideSideLines />
        </View>
        <View style={styles.tilesColumn}>
          {ASSOCIATION_MENU.map((item) => (
            <AssociationFeatureTile
              key={`${String(item.route)}-${item.label}`}
              item={item}
              isMemberActive={isActive}
              onNavigate={(route) => router.push(route)}
              onPremiumBlocked={() => setMembershipModalVisible(true)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  dashboardHeader: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
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
  tilesColumn: {
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
  },
});
