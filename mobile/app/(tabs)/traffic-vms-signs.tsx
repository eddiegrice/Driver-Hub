import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { TextInput } from 'react-native';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/lib/supabase';
import { fetchTrafficVms } from '@/lib/traffic-supabase';
import { FontSize, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import type { TrafficVms } from '@/types/traffic';

const LIGHT_EDGE = NeoGlass.cardBorder;

function formatTimeLastSet(iso: string | null): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const t = iso.slice(11, 16);
  return t ? `${d} ${t}` : d;
}

export default function VmsSignsScreen() {
  const [data, setData] = useState<TrafficVms[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.trim().toLowerCase();
    return data.filter(
      (row) =>
        row.locationName?.toLowerCase().includes(q) ||
        row.messageText?.toLowerCase().includes(q) ||
        row.direction?.toLowerCase().includes(q) ||
        row.vmsId?.toLowerCase().includes(q)
    );
  }, [data, search]);

  const load = useCallback(async () => {
    const { data: list, error: err } = await fetchTrafficVms(supabase);
    setData(list);
    setError(err);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      await load();
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (isLoading && data.length === 0) {
    return (
      <View style={styles.screen}>
        <TabScreenHeader title="VMS Signs" />
        <View style={styles.centered}>
          <ThemedText style={styles.muted}>Loading…</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TabScreenHeader title="VMS Signs" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00CCFF" />}
      >
        <ThemedText style={styles.helper}>
          Variable message signs on Scottish roads.
        </ThemedText>
        {error && <ThemedText style={styles.error}>Unable to load. Pull to try again.</ThemedText>}
        {!error && data.length > 0 && (
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor={NeoText.muted}
            value={search}
            onChangeText={setSearch}
          />
        )}
        {!error && data.length === 0 && (
          <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} style={styles.emptyCard}>
            <ThemedText style={styles.empty}>No VMS data yet.</ThemedText>
            <ThemedText style={styles.emptySub}>Run the traffic receiver to pull data from Traffic Scotland.</ThemedText>
          </GlassCard>
        )}
        {!error && data.length > 0 && filtered.length === 0 && (
          <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} style={styles.emptyCard}>
            <ThemedText style={styles.empty}>No results match your search.</ThemedText>
          </GlassCard>
        )}
        {!error && filtered.length > 0 && (
          <View style={styles.list}>
            {filtered.map((row) => (
              <GlassCard
                key={row.vmsId}
                sleek
                borderRadius={Radius.lg}
                borderColor={LIGHT_EDGE}
                contentStyle={styles.cardContent}
                style={styles.card}
              >
                {(row.locationName || row.direction) && (
                  <ThemedText style={styles.location} numberOfLines={2}>
                    {[row.locationName, row.direction].filter(Boolean).join(' · ')}
                  </ThemedText>
                )}
                <ThemedText style={styles.message} numberOfLines={4}>
                  {row.messageText?.trim() || 'No message'}
                </ThemedText>
                <ThemedText style={styles.time}>
                  Last set {formatTimeLastSet(row.timeLastSet)}
                  {row.vmsWorking === false && ' · Sign not working'}
                </ThemedText>
              </GlassCard>
            ))}
          </View>
        )}
        {!error && <ThemedText style={styles.credit}>Data from Traffic Scotland</ThemedText>}
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
  location: { fontSize: FontSize.sm, color: NeoText.secondary, marginBottom: Spacing.xs },
  message: { fontSize: FontSize.body, color: NeoText.primary, lineHeight: 22 },
  time: { fontSize: FontSize.xs, color: NeoText.muted, marginTop: Spacing.sm },
  credit: { fontSize: FontSize.xs, color: NeoText.muted, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  searchInput: {
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
