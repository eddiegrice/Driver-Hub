import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AssociationDashboardBackLink } from '@/components/AssociationDashboardBackLink';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useCasework } from '@/context/CaseworkContext';
import { FontSize, Spacing } from '@/constants/theme';
import { statusLabel } from '@/types/casework';
import { formatDateForDisplay } from '@/types/member';

function CaseworkListInner() {
  const router = useRouter();
  const { tickets, isLoading } = useCasework();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AssociationDashboardBackLink />
        <TabScreenHeader title="Casework" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AssociationDashboardBackLink />
      <TabScreenHeader title="Casework" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.helperText}>
            Open a new request or tap one to view messages and status.
          </ThemedText>

          <PrimaryButton
            title="New request"
            onPress={() => router.push('/casework/new')}
            fullWidth
          />

          {tickets.length === 0 ? (
            <ThemedText style={styles.empty}>No requests yet.</ThemedText>
          ) : (
            <ThemedView style={styles.list}>
              {tickets.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => router.push(`/casework/${t.id}`)}
                  activeOpacity={0.8}>
                  <Card accent elevated style={styles.card}>
                    <ThemedText type="defaultSemiBold">{t.type}</ThemedText>
                    <ThemedText style={styles.subject} numberOfLines={1}>{t.subject || 'No subject'}</ThemedText>
                    <ThemedText style={styles.meta}>
                      {statusLabel(t.status)} · {formatDateForDisplay(t.createdAt.slice(0, 10))}
                    </ThemedText>
                  </Card>
                </TouchableOpacity>
              ))}
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </View>
  );
}

export default function CaseworkListScreen() {
  return (
    <AssociationMembershipGate title="Casework">
      <CaseworkListInner />
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
  empty: {
    opacity: 0.8,
    paddingVertical: Spacing.xxl,
    fontSize: FontSize.body,
  },
  list: {
    gap: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  card: {
    marginBottom: 0,
  },
  subject: {
    opacity: 0.9,
    marginTop: Spacing.xs,
  },
  meta: {
    fontSize: FontSize.sm,
    opacity: 0.75,
    marginTop: Spacing.xs,
  },
});
