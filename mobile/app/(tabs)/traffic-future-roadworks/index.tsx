import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTraffic } from '@/context/TrafficContext';
import { FontSize, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import type { TrafficSituation } from '@/types/traffic';
import { formatDateForDisplay } from '@/types/member';

const SITUATION_TYPE = 'future_roadworks';
const LIGHT_EDGE = NeoGlass.cardBorder;

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const t = iso.slice(11, 16);
  if (t && t !== '00:00') return `${formatDateForDisplay(d)} ${t}`;
  return formatDateForDisplay(d);
}

export default function FutureRoadworksListScreen() {
  const router = useRouter();
  const { situations, isLoading, error, refresh } = useTraffic();
  const [refreshing, setRefreshing] = useState(false);
  const [areaSearch, setAreaSearch] = useState('');
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const list = useMemo(
    () => situations.filter((s) => s.situationType === SITUATION_TYPE),
    [situations]
  );
  const filtered = useMemo(() => {
    if (!areaSearch.trim()) return list;
    const q = areaSearch.trim().toLowerCase();
    return list.filter(
      (s) =>
        s.locationName?.toLowerCase().includes(q) ||
        s.title?.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }, [list, areaSearch]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <TabScreenHeader title="Future Roadworks" />
        <View style={styles.centered}>
          <ThemedText style={styles.muted}>Loading…</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TabScreenHeader title="Future Roadworks" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00CCFF" />}
      >
        <ThemedText style={styles.helper}>
          Planned roadworks on Glasgow roads. Tap for details.
        </ThemedText>
        {error && <ThemedText style={styles.error}>Unable to load. Pull to try again.</ThemedText>}
        {!error && list.length > 0 && (
          <TextInput
            style={styles.areaInput}
            placeholder="Filter by area (e.g. M8)"
            placeholderTextColor={NeoText.muted}
            value={areaSearch}
            onChangeText={setAreaSearch}
          />
        )}
        {!error && list.length === 0 && (
          <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} style={styles.emptyCard}>
            <ThemedText style={styles.empty}>No planned roadworks.</ThemedText>
            <ThemedText style={styles.emptySub}>Data is updated regularly from Traffic Scotland.</ThemedText>
          </GlassCard>
        )}
        {!error && list.length > 0 && filtered.length === 0 && (
          <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} style={styles.emptyCard}>
            <ThemedText style={styles.empty}>No roadworks match your filter.</ThemedText>
          </GlassCard>
        )}
        {!error && filtered.length > 0 && (
          <View style={styles.list}>
            {filtered.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => router.push(`/traffic-future-roadworks/${s.id}`)}
                activeOpacity={0.8}
              >
                <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} contentStyle={styles.cardContent} style={styles.card}>
                  <ThemedText style={styles.title} numberOfLines={2}>{s.title ?? 'Planned roadworks'}</ThemedText>
                  {(s.locationName ?? s.locationDirection) && (
                    <ThemedText style={styles.location} numberOfLines={1}>
                      {[s.locationName, s.locationDirection].filter(Boolean).join(' · ')}
                    </ThemedText>
                  )}
                  <ThemedText style={styles.time}>
                    {formatTime(s.startTime)}
                    {s.endTime ? ` – ${formatTime(s.endTime)}` : ''}
                  </ThemedText>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {!error && (
          <ThemedText style={styles.credit}>Data from Traffic Scotland</ThemedText>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { flex: 1, paddingVertical: Spacing.xxl, alignItems: 'center' },
  helper: { fontSize: FontSize.sm, color: NeoText.muted, marginBottom: Spacing.md },
  muted: { color: NeoText.muted },
  error: { color: NeoText.error, marginBottom: Spacing.md },
  emptyCard: { marginTop: Spacing.sm },
  empty: { fontSize: FontSize.body, color: NeoText.secondary },
  emptySub: { fontSize: FontSize.sm, color: NeoText.muted, marginTop: Spacing.xs },
  list: { gap: Spacing.md, marginTop: Spacing.sm },
  card: { marginBottom: 0 },
  cardContent: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  title: { fontSize: FontSize.body, fontWeight: '600', color: NeoText.primary, marginBottom: Spacing.xs },
  location: { fontSize: FontSize.sm, color: NeoText.secondary, marginBottom: 2 },
  time: { fontSize: FontSize.xs, color: NeoText.muted },
  credit: { fontSize: FontSize.xs, color: NeoText.muted, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  areaInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    color: NeoText.primary,
    marginBottom: Spacing.md,
  },
});
