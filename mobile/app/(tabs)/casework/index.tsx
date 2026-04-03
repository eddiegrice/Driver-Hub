import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { AssociationDashboardBackLink } from '@/components/AssociationDashboardBackLink';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { GlassCard } from '@/components/ui/GlassCard';
import { useCasework } from '@/context/CaseworkContext';
import { FontSize, FontWeight, NeoText, Radius, Spacing } from '@/constants/theme';
import { statusLabel } from '@/types/casework';
import { formatDateForDisplay } from '@/types/member';

const CYAN_BTN = '#00CCFF';
const TILE_BORDER = 'rgba(140, 180, 255, 0.7)';
const TILE_BG = 'rgba(40, 80, 200, 0.18)';

function CaseworkListInner() {
  const router = useRouter();
  const { tickets, isLoading, remoteReady } = useCasework();

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <AssociationDashboardBackLink />
        <TabScreenHeader title="Casework and Support" />
        <ThemedView style={styles.centered}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AssociationDashboardBackLink />
      <TabScreenHeader title="Casework and Support" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          {!remoteReady ? (
            <ThemedText style={styles.helperText}>
              Sign into your account to load casework.
            </ThemedText>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.newRequestBtn, pressed && styles.newRequestBtnPressed]}
            onPress={() => router.push('/casework/new')}>
            <ThemedText style={styles.newRequestBtnText}>New request</ThemedText>
          </Pressable>

          {tickets.length === 0 ? (
            <ThemedText style={styles.empty}>No requests yet.</ThemedText>
          ) : (
            <ThemedView style={styles.list}>
              {tickets.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => router.push(`/casework/${t.id}`)}
                  activeOpacity={0.8}>
                  <GlassCard
                    elevated
                    borderRadius={Radius.lg}
                    borderColor={TILE_BORDER}
                    contentStyle={[styles.tileContent, { backgroundColor: TILE_BG }]}
                    sleek
                    style={styles.tileCard}>
                    <ThemedText style={styles.tileTitle} numberOfLines={2}>
                      {t.subject || 'No subject'}
                    </ThemedText>
                    <ThemedText style={styles.tileLine} numberOfLines={2}>
                      Case Type: {t.type}
                    </ThemedText>
                    <ThemedText style={styles.tileLine}>
                      Date Opened: {formatDateForDisplay(t.createdAt.slice(0, 10))}
                    </ThemedText>
                    <ThemedText style={styles.tileLine}>
                      Status: {statusLabel(t.status)}
                      {t.closureRequested ? ' · Closure requested' : ''}
                    </ThemedText>
                  </GlassCard>
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
    <AssociationMembershipGate title="Casework and Support">
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
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  newRequestBtn: {
    backgroundColor: CYAN_BTN,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  newRequestBtnPressed: {
    opacity: 0.9,
  },
  newRequestBtnText: {
    color: '#101115',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.body,
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
    fontWeight: FontWeight.bold,
    color: NeoText.primary,
  },
  tileLine: {
    fontSize: FontSize.sm,
    color: NeoText.secondary,
    lineHeight: 20,
  },
});
