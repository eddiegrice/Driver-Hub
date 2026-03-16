import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTraffic } from '@/context/TrafficContext';
import { fetchTrafficSituationById } from '@/lib/traffic-supabase';
import { supabase } from '@/lib/supabase';
import { FontSize, NeoText, Radius, Spacing } from '@/constants/theme';
import { situationTypeLabel } from '@/types/traffic';
import type { TrafficSituation } from '@/types/traffic';
import { formatDateForDisplay } from '@/types/member';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';
const TRAFFIC_SCOTLAND_URL = 'https://www.traffic.gov.scot/';

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const t = iso.slice(11, 16);
  if (t && t !== '00:00') return `${formatDateForDisplay(d)} ${t}`;
  return formatDateForDisplay(d);
}

export default function CurrentRoadworksDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getSituation } = useTraffic();
  const [fetched, setFetched] = useState<TrafficSituation | null | undefined>(undefined);
  const fromContext = id ? getSituation(id) : undefined;
  const situation = fromContext ?? (id && fetched !== undefined ? fetched : undefined);

  useEffect(() => {
    if (!id || fromContext) return;
    let cancelled = false;
    (async () => {
      const { situation: s } = await fetchTrafficSituationById(supabase, id);
      if (!cancelled) setFetched(s ?? null);
    })();
    return () => { cancelled = true; };
  }, [id, fromContext]);

  const loading = id && !fromContext && fetched === undefined;

  if (!id || !situation) {
    return (
      <View style={styles.screen}>
        <TabScreenHeader title="Current Roadworks" />
        <View style={styles.centered}>
          <ThemedText style={styles.muted}>{!id ? 'Alert not found.' : loading ? 'Loading…' : 'Alert not found.'}</ThemedText>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.link}>← Back to Current Roadworks</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <TabScreenHeader title="Current Roadworks" />
        <View style={styles.centered}>
          <ThemedText style={styles.muted}>Loading…</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TabScreenHeader title="Current Roadworks" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ThemedText style={styles.link}>← Back to Current Roadworks</ThemedText>
        </TouchableOpacity>
        <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} style={styles.card}>
          <View style={styles.typeRow}>
            <ThemedText style={styles.typePill}>{situationTypeLabel(situation.situationType)}</ThemedText>
            {situation.severity && <ThemedText style={styles.severity}>{situation.severity}</ThemedText>}
          </View>
          <ThemedText style={styles.title}>{situation.title ?? 'Roadworks'}</ThemedText>
          <ThemedText style={styles.label}>Location</ThemedText>
          <ThemedText style={styles.value}>
            {[situation.locationName, situation.locationDirection].filter(Boolean).join(' · ') || 'No location provided'}
          </ThemedText>
          <ThemedText style={styles.label}>Time</ThemedText>
          <ThemedText style={styles.value}>
            {formatTime(situation.startTime)}
            {situation.endTime ? ` – ${formatTime(situation.endTime)}` : ''}
          </ThemedText>
          <ThemedText style={styles.label}>Details</ThemedText>
          <ThemedText style={styles.description}>
            {situation.description?.trim() || 'No further details from Traffic Scotland.'}
          </ThemedText>
        </GlassCard>
        <TouchableOpacity style={styles.sourceRow} onPress={() => Linking.openURL(TRAFFIC_SCOTLAND_URL)} activeOpacity={0.8}>
          <ThemedText style={styles.sourceLink}>View this alert on map</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  centered: { paddingVertical: Spacing.xxl, alignItems: 'center' },
  backRow: { marginBottom: Spacing.md },
  backBtn: { marginTop: Spacing.md },
  link: { color: '#00CCFF', fontSize: FontSize.body },
  muted: { color: NeoText.muted },
  card: { marginBottom: Spacing.xl },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  typePill: { fontSize: FontSize.xs, fontWeight: '600', color: '#00CCFF' },
  severity: { fontSize: FontSize.sm, color: NeoText.muted },
  title: { fontSize: FontSize.subtitle, fontWeight: '600', color: NeoText.primary, marginBottom: Spacing.lg },
  label: { fontSize: FontSize.xs, color: NeoText.muted, marginTop: Spacing.sm, marginBottom: 2, letterSpacing: 1 },
  value: { fontSize: FontSize.body, color: NeoText.secondary },
  description: { fontSize: FontSize.body, color: NeoText.secondary, lineHeight: 22, marginTop: Spacing.xs },
  sourceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  sourceLink: { fontSize: FontSize.sm, color: '#00CCFF' },
});
