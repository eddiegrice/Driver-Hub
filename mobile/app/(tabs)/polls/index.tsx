import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AssociationDashboardBackLink } from '@/components/AssociationDashboardBackLink';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { GlassCard } from '@/components/ui/GlassCard';
import { usePolls } from '@/context/PollsContext';
import { scrollContentGutter } from '@/constants/scrollLayout';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import type { Poll } from '@/types/polls';
import { formatDateTimeLocalForDisplay } from '@/types/member';
const TILE_BORDER = 'rgba(140, 180, 255, 0.7)';
const TILE_BG = 'rgba(40, 80, 200, 0.18)';
const CYAN = '#00CCFF';

type Segment = 'polls' | 'surveys';

const PILL_DEFS: { key: Segment; label: string }[] = [
  { key: 'polls', label: 'Polls' },
  { key: 'surveys', label: 'Surveys' },
];

function openPollMetaLine(poll: Poll): string {
  const now = Date.now();
  const start = new Date(poll.publishAt).getTime();
  if (now < start) {
    return `Opens ${formatDateTimeLocalForDisplay(poll.publishAt)}`;
  }
  return `Closes ${formatDateTimeLocalForDisplay(poll.closeAt)}`;
}

type PollSectionProps = {
  title: string;
  polls: Poll[];
  variant: 'open' | 'closed';
};

function PollSection({ title, polls, variant }: PollSectionProps) {
  const router = useRouter();

  return (
    <GlassCard
      elevated
      borderRadius={Radius.lg}
      contentStyle={styles.sectionContent}
      sleek
      style={styles.sectionCard}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {polls.length === 0 ? (
        <ThemedText style={styles.noneText}>• None</ThemedText>
      ) : (
        <View style={styles.pollList}>
          {polls.map((poll) => (
            <TouchableOpacity
              key={poll.id}
              onPress={() => router.push(`/polls/${poll.id}`)}
              activeOpacity={0.8}>
              <GlassCard
                elevated
                borderRadius={Radius.lg}
                borderColor={TILE_BORDER}
                contentStyle={[styles.tileContent, { backgroundColor: TILE_BG }]}
                sleek
                style={styles.tileCard}>
                <ThemedText style={styles.tileTitle} numberOfLines={2}>
                  {poll.title}
                </ThemedText>
                <ThemedText style={styles.tileMeta}>
                  {variant === 'open'
                    ? openPollMetaLine(poll)
                    : `Closed ${formatDateTimeLocalForDisplay(poll.closeAt)}`}
                </ThemedText>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </GlassCard>
  );
}

function PollsListInner() {
  const [segment, setSegment] = useState<Segment>('polls');
  const { openPolls, closedPolls, openSurveys, closedSurveys, isLoading } = usePolls();

  const openList: Poll[] = segment === 'polls' ? openPolls : openSurveys;
  const closedList: Poll[] = segment === 'polls' ? closedPolls : closedSurveys;
  const openTitle = segment === 'polls' ? 'Open Polls' : 'Open Surveys';
  const closedTitle = segment === 'polls' ? 'Closed Polls' : 'Closed Surveys';

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AssociationDashboardBackLink />
        <TabScreenHeader title="Polls and Surveys" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AssociationDashboardBackLink />
      <TabScreenHeader title="Polls and Surveys" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={scrollContentGutter}
        showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
            style={styles.pillScroll}
            nestedScrollEnabled>
            {PILL_DEFS.map(({ key, label }) => {
              const active = segment === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setSegment(key)}
                  style={({ pressed }) => [
                    styles.pill,
                    active && styles.pillActive,
                    pressed && styles.pillPressed,
                  ]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}>
                  <ThemedText style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <PollSection title={openTitle} polls={openList} variant="open" />
          <PollSection title={closedTitle} polls={closedList} variant="closed" />
        </ThemedView>
      </ScrollView>
    </View>
  );
}

export default function PollsListScreen() {
  return (
    <AssociationMembershipGate title="Polls and Surveys">
      <PollsListInner />
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
  centered: {
    flex: 1,
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  container: {
    gap: Spacing.lg,
  },
  pillScroll: {
    flexGrow: 0,
    marginHorizontal: -Spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    backgroundColor: 'rgba(22, 24, 32, 0.75)',
  },
  pillActive: {
    borderColor: CYAN,
    backgroundColor: 'rgba(0, 204, 255, 0.14)',
  },
  pillPressed: {
    opacity: 0.88,
  },
  pillLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.muted,
  },
  pillLabelActive: {
    color: CYAN,
  },
  sectionCard: {
    marginBottom: 0,
  },
  sectionContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: NeoText.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  noneText: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
  },
  pollList: {
    gap: Spacing.md,
  },
  tileCard: {
    marginBottom: 0,
  },
  tileContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  tileTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
  },
  tileMeta: {
    fontSize: FontSize.sm,
    color: NeoText.secondary,
    lineHeight: 20,
  },
});
