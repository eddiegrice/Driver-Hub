```tsx
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { MenuSectionEyebrow } from '@/components/home/MenuIconGrid';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { useCasework } from '@/context/CaseworkContext';
import { FontSize, NeoText, Radius, Spacing } from '@/constants/theme';
import { isClosedStatus, statusLabel } from '@/types/casework';
import { formatDateForDisplay } from '@/types/member';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';
const CYAN = '#00CCFF';

export default function AdminCaseworkHubScreen() {
  const router = useRouter();
  const { tickets, isLoading } = useCasework();

  const active = tickets.filter((t) => !isClosedStatus(t.status));
  const closed = tickets.filter((t) => isClosedStatus(t.status));

  return (
    <AdminSubpageScaffold subsystemTitle="Casework System">
      <View style={styles.body}>
        <View style={styles.createRow}>
          <Pressable
            onPress={() => router.push('/admin/casework/create-for-member' as Href)}
            style={({ pressed }) => [styles.createTile, pressed && styles.pressed]}>
            <ThemedText style={styles.createText} numberOfLines={2}>
              Create case for member
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => router.push('/admin/casework/create-internal' as Href)}
            style={({ pressed }) => [styles.createTile, pressed && styles.pressed]}>
            <ThemedText style={styles.createText} numberOfLines={2}>
              Internal case
            </ThemedText>
          </Pressable>
        </View>

        <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} contentStyle={styles.panelInner} style={styles.panelCard}>
          <MenuSectionEyebrow label="Active cases" />
          {isLoading ? (
            <ThemedText style={styles.noneText}>Loading…</ThemedText>
          ) : active.length === 0 ? (
            <ThemedText style={styles.noneText}>None</ThemedText>
          ) : (
            <ScrollView style={styles.listScroll} nestedScrollEnabled>
              {active.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => router.push(`/admin/casework/${t.id}` as Href)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                  <ThemedText style={styles.rowTitle} numberOfLines={1}>
                    {t.memberId ? t.memberSnapshot.name || 'Member' : 'Internal'} · {t.subject || t.type}
                  </ThemedText>
                  <ThemedText style={styles.rowMeta}>
                    {statusLabel(t.status)} · {formatDateForDisplay(t.updatedAt.slice(0, 10))}
                    {t.closureRequested ? ' · Closure requested' : ''}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </GlassCard>

        <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} contentStyle={styles.panelInner} style={styles.panelCard}>
          <MenuSectionEyebrow label="Closed cases" />
          {isLoading ? (
            <ThemedText style={styles.noneText}>Loading…</ThemedText>
          ) : closed.length === 0 ? (
            <ThemedText style={styles.noneText}>None</ThemedText>
          ) : (
            <ScrollView style={styles.listScroll} nestedScrollEnabled>
              {closed.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => router.push(`/admin/casework/${t.id}` as Href)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
                  <ThemedText style={styles.rowTitle} numberOfLines={1}>
                    {t.memberId ? t.memberSnapshot.name || 'Member' : 'Internal'} · {t.subject || t.type}
                  </ThemedText>
                  <ThemedText style={styles.rowMeta}>{statusLabel(t.status)}</ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </GlassCard>
      </View>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  body: { gap: Spacing.lg, paddingBottom: Spacing.md, alignSelf: 'stretch', width: '100%' },
  createRow: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.md },
  createTile: {
    flex: 1,
    backgroundColor: CYAN,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  pressed: { opacity: 0.9 },
  createText: { color: '#0a1628', fontWeight: '700', fontSize: FontSize.sm, textAlign: 'center' },
  panelCard: { marginHorizontal: Spacing.md, alignSelf: 'stretch' },
  panelInner: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg },
  noneText: { fontSize: FontSize.sm, color: NeoText.muted, paddingVertical: Spacing.sm },
  listScroll: { maxHeight: 280 },
  row: { paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.12)' },
  rowPressed: { opacity: 0.85 },
  rowTitle: { fontWeight: '600' },
  rowMeta: { fontSize: FontSize.sm, color: NeoText.muted, marginTop: 4 },
});
```
