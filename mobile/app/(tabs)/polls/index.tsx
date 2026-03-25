import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/Card';
import { usePolls } from '@/context/PollsContext';
import { AssociationDashboardBackLink } from '@/components/AssociationDashboardBackLink';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { FontSize, Spacing } from '@/constants/theme';
import { formatDateForDisplay } from '@/types/member';

function PollsListInner() {
  const router = useRouter();
  const { openPolls, closedPolls, isLoading } = usePolls();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AssociationDashboardBackLink />
        <TabScreenHeader title="Polls" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AssociationDashboardBackLink />
      <TabScreenHeader title="Polls" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.helperText}>
            Take part in club polls and surveys. Results are only shown after a poll closes.
          </ThemedText>

        {openPolls.length > 0 && (
          <>
            <ThemedText type="subtitle" style={styles.sectionLabel}>Open</ThemedText>
            <ThemedView style={styles.list}>
              {openPolls.map((poll) => (
                <TouchableOpacity
                  key={poll.id}
                  onPress={() => router.push(`/polls/${poll.id}`)}
                  activeOpacity={0.8}>
                  <Card accent elevated style={styles.card}>
                    <ThemedText type="defaultSemiBold">{poll.title}</ThemedText>
                    <ThemedText style={styles.meta}>
                      Closes {formatDateForDisplay(poll.endsAt.slice(0, 10))}
                    </ThemedText>
                  </Card>
                </TouchableOpacity>
              ))}
            </ThemedView>
          </>
        )}

        {closedPolls.length > 0 && (
          <>
            <ThemedText type="subtitle" style={styles.sectionTitle}>Closed</ThemedText>
            <ThemedText style={styles.sectionHint}>Tap to view results</ThemedText>
            <ThemedView style={styles.list}>
              {closedPolls.map((poll) => (
                <TouchableOpacity
                  key={poll.id}
                  onPress={() => router.push(`/polls/${poll.id}`)}
                  activeOpacity={0.8}>
                  <Card elevated style={styles.cardClosed}>
                    <ThemedText type="defaultSemiBold">{poll.title}</ThemedText>
                    <ThemedText style={styles.meta}>Closed {formatDateForDisplay(poll.endsAt.slice(0, 10))}</ThemedText>
                  </Card>
                </TouchableOpacity>
              ))}
            </ThemedView>
          </>
        )}

        {openPolls.length === 0 && closedPolls.length === 0 && (
          <ThemedText style={styles.empty}>No polls at the moment.</ThemedText>
        )}
        </ThemedView>
      </ScrollView>
    </View>
  );
}

export default function PollsListScreen() {
  return (
    <AssociationMembershipGate title="Polls">
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
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
  container: {
    gap: Spacing.xl,
  },
  helperText: {
    opacity: 0.85,
    fontSize: FontSize.body,
  },
  sectionLabel: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    marginTop: Spacing.xxl,
  },
  sectionHint: {
    fontSize: FontSize.sm,
    opacity: 0.75,
    marginTop: Spacing.xs,
  },
  empty: {
    opacity: 0.8,
    paddingVertical: Spacing.xxl,
    fontSize: FontSize.body,
  },
  list: {
    gap: Spacing.lg,
    paddingTop: Spacing.md,
  },
  card: {
    marginBottom: 0,
  },
  cardClosed: {
    marginBottom: 0,
    opacity: 0.95,
  },
  meta: {
    fontSize: FontSize.sm,
    opacity: 0.75,
    marginTop: Spacing.xs,
  },
});
