import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { MenuSectionEyebrow } from '@/components/home/MenuIconGrid';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { usePolls } from '@/context/PollsContext';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import type { Poll } from '@/types/polls';
import { formatDateForDisplay } from '@/types/member';
import { isPollClosedForMember, isPollOpenForMember, isPollScheduled } from '@/types/polls';

const LIGHT_EDGE = NeoGlass.cardBorder;
const CYAN = '#00CCFF';

type Segment = 'polls' | 'surveys';

const PILL_DEFS: { key: Segment; label: string }[] = [
  { key: 'polls', label: 'Polls' },
  { key: 'surveys', label: 'Surveys' },
];

function AdminPollsSurveysBody() {
  const router = useRouter();
  const [segment, setSegment] = useState<Segment>('polls');
  const [refreshing, setRefreshing] = useState(false);
  const { polls, isLoading, refreshPolls } = usePolls();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPolls();
    setRefreshing(false);
  }, [refreshPolls]);

  const createHref =
    (segment === 'polls' ? '/admin/polls/create-poll' : '/admin/polls/create-survey') as Href;
  const createLabel = segment === 'polls' ? 'Create a New Poll' : 'Create a New Survey';
  const scheduledHeader = segment === 'polls' ? 'Scheduled Polls' : 'Scheduled Surveys';
  const activeHeader = segment === 'polls' ? 'Active Polls' : 'Active Surveys';
  const closedHeader = segment === 'polls' ? 'Closed Polls' : 'Closed Surveys';
  const archivedHeader = segment === 'polls' ? 'Archived Polls' : 'Archived Surveys';

  const kind = segment === 'polls' ? 'poll' : 'survey';
  const nonArchived = polls.filter((p) => p.kind === kind && !p.archivedAt);
  const archived = polls.filter((p) => p.kind === kind && p.archivedAt);

  const scheduledList = nonArchived.filter((p) => isPollScheduled(p));
  const activeList = nonArchived.filter((p) => isPollOpenForMember(p) && !isPollScheduled(p));
  const closedList = nonArchived.filter((p) => isPollClosedForMember(p) && !isPollScheduled(p));

  const rowForPoll = useCallback(
    (poll: Poll, metaLine: string) => (
      <Pressable
        key={poll.id}
        onPress={() => router.push(`/admin/polls/${poll.id}` as Href)}
        style={({ pressed }) => [styles.rowPress, pressed && styles.rowPressed]}>
        <View style={styles.row}>
          <ThemedText style={styles.rowTitle} numberOfLines={2}>
            {poll.title}
          </ThemedText>
          <ThemedText style={styles.rowMeta}>{metaLine}</ThemedText>
        </View>
      </Pressable>
    ),
    [router]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={CYAN} />
      </View>
    );
  }

  return (
    <AdminSubpageScaffold
      subsystemTitle="Polls and Surveys System"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} />}>
      <View style={styles.body}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          style={styles.pillScroll}>
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

        <View style={styles.createTileOuter}>
          <Pressable
            onPress={() => router.push(createHref)}
            style={({ pressed }) => [
              styles.createTileSurface,
              pressed && styles.createTileSurfacePressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={createLabel}>
            <ThemedText style={styles.createTileText} numberOfLines={2}>
              {createLabel}
            </ThemedText>
          </Pressable>
        </View>

        <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} contentStyle={styles.panelInner} style={styles.panelCard}>
          <View style={styles.panelHeaderWrap}>
            <MenuSectionEyebrow label={scheduledHeader} />
          </View>
          {scheduledList.length === 0 ? (
            <ThemedText style={styles.noneText}>None</ThemedText>
          ) : (
            <View style={styles.listBlock}>
              {scheduledList.map((p) =>
                rowForPoll(
                  p,
                  `Opens ${formatDateForDisplay(p.publishAt.slice(0, 10))} · Closes ${formatDateForDisplay(p.closeAt.slice(0, 10))}`
                )
              )}
            </View>
          )}
        </GlassCard>

        <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} contentStyle={styles.panelInner} style={styles.panelCard}>
          <View style={styles.panelHeaderWrap}>
            <MenuSectionEyebrow label={activeHeader} />
          </View>
          {activeList.length === 0 ? (
            <ThemedText style={styles.noneText}>None</ThemedText>
          ) : (
            <View style={styles.listBlock}>
              {activeList.map((p) =>
                rowForPoll(p, `Closes ${formatDateForDisplay(p.closeAt.slice(0, 10))}`)
              )}
            </View>
          )}
        </GlassCard>

        <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} contentStyle={styles.panelInner} style={styles.panelCard}>
          <View style={styles.panelHeaderWrap}>
            <MenuSectionEyebrow label={closedHeader} />
          </View>
          {closedList.length === 0 ? (
            <ThemedText style={styles.noneText}>None</ThemedText>
          ) : (
            <View style={styles.listBlock}>
              {closedList.map((p) =>
                rowForPoll(p, `Closed ${formatDateForDisplay(p.closeAt.slice(0, 10))}`)
              )}
            </View>
          )}
        </GlassCard>

        <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} contentStyle={styles.panelInner} style={styles.panelCard}>
          <View style={styles.panelHeaderWrap}>
            <MenuSectionEyebrow label={archivedHeader} />
          </View>
          {archived.length === 0 ? (
            <ThemedText style={styles.noneText}>None</ThemedText>
          ) : (
            <View style={styles.listBlock}>
              {archived.map((p) =>
                rowForPoll(p, `Closed ${formatDateForDisplay(p.closeAt.slice(0, 10))}`)
              )}
            </View>
          )}
        </GlassCard>
      </View>
    </AdminSubpageScaffold>
  );
}

export default function AdminPollsIndexScreen() {
  return <AdminPollsSurveysBody />;
}

const styles = StyleSheet.create({
  loadingWrap: {
    paddingVertical: Spacing.xxl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
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
  createTileOuter: {
    marginHorizontal: Spacing.xl,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  createTileSurface: {
    alignSelf: 'stretch',
    borderRadius: Radius.lg,
    backgroundColor: CYAN,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  createTileSurfacePressed: {
    backgroundColor: '#00B8E6',
  },
  createTileText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: '#000000',
    textAlign: 'center',
    flexShrink: 1,
    width: '100%',
  },
  panelCard: {
    marginHorizontal: Spacing.md,
    width: 'auto',
    alignSelf: 'stretch',
  },
  panelInner: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  panelHeaderWrap: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  noneText: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
    paddingVertical: Spacing.sm,
  },
  listBlock: {
    gap: 0,
  },
  rowPress: {
    borderBottomWidth: 1,
    borderBottomColor: NeoGlass.stroke,
  },
  rowPressed: {
    opacity: 0.85,
  },
  row: {
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  rowTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
  },
  rowMeta: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
});
