import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { useTraffic } from '@/context/TrafficContext';
import { FontSize, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import type { TrafficSituation } from '@/types/traffic';
import type { MotorwayCode } from '@/lib/traffic-status';
import { formatDateForDisplay } from '@/types/member';

const LIGHT_EDGE = NeoGlass.cardBorder;

function isActiveSituation(s: TrafficSituation, now: Date): boolean {
  const startOk =
    !s.startTime || new Date(s.startTime).getTime() <= now.getTime();
  const endOk =
    !s.endTime || new Date(s.endTime).getTime() >= now.getTime();
  return startOk && endOk;
}

function situationMatchesMotorway(
  s: TrafficSituation,
  code: MotorwayCode,
): boolean {
  const title = s.title ?? '';
  const re = new RegExp(`\\b${code}(?!\\d)`, 'i');
  return re.test(title);
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const t = iso.slice(11, 16);
  if (t && t !== '00:00') return `${formatDateForDisplay(d)} ${t}`;
  return formatDateForDisplay(d);
}

export default function MotorwayStatusScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: MotorwayCode }>();
  const { situations } = useTraffic();

  const liveIssues = useMemo(() => {
    if (!code) return [];
    const now = new Date();
    return situations.filter((s) => {
      if (s.situationType !== 'unplanned_event' && s.situationType !== 'current_roadworks') {
        return false;
      }
      if (!s.title) return false;
      if (!situationMatchesMotorway(s, code as MotorwayCode)) return false;
      if (!isActiveSituation(s, now)) return false;
      const text = (s.title + ' ' + (s.description ?? '')).toLowerCase();
      if (text.includes('lane closure') || text.includes('lane closures')) return false;
      return true;
    });
  }, [situations, code]);

  const title = code ? `${code} alerts` : 'Motorway alerts';

  return (
    <View style={styles.screen}>
      <TabScreenHeader title={title} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {liveIssues.length === 0 ? (
          <GlassCard sleek borderRadius={Radius.lg} borderColor={LIGHT_EDGE} style={styles.emptyCard}>
            <ThemedText style={styles.empty}>No active situations for this motorway.</ThemedText>
            <ThemedText style={styles.emptySub}>Data is updated regularly from Traffic Scotland.</ThemedText>
          </GlassCard>
        ) : (
          <View style={styles.list}>
            {liveIssues.map((s) => (
              <TouchableOpacity
                key={s.id}
                onPress={() => router.push(`/traffic-incidents/${s.id}`)}
                activeOpacity={0.8}
              >
                <GlassCard
                  sleek
                  borderRadius={Radius.lg}
                  borderColor={LIGHT_EDGE}
                  contentStyle={styles.cardContent}
                  style={styles.card}
                >
                  <ThemedText style={styles.title} numberOfLines={2}>
                    {s.title ?? 'Traffic situation'}
                  </ThemedText>
                  {(s.locationName ?? s.locationDirection) && (
                    <ThemedText style={styles.location} numberOfLines={1}>
                      {[s.locationName, s.locationDirection].filter(Boolean).join(' · ')}
                    </ThemedText>
                  )}
                  <ThemedText style={styles.time}>
                    {formatTime(s.startTime)}
                    {s.endTime ? ` – ${formatTime(s.endTime)}` : ''}
                  </ThemedText>
                  {s.situationType === 'current_roadworks' && (
                    <ThemedText style={styles.badge}>Roadworks</ThemedText>
                  )}
                  {s.situationType === 'unplanned_event' && (
                    <ThemedText style={styles.badge}>Incident</ThemedText>
                  )}
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
  list: { gap: Spacing.md, marginTop: Spacing.sm },
  card: { marginBottom: 0 },
  cardContent: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg },
  title: { fontSize: FontSize.body, fontWeight: '600', color: NeoText.primary, marginBottom: Spacing.xs },
  location: { fontSize: FontSize.sm, color: NeoText.secondary, marginBottom: 2 },
  time: { fontSize: FontSize.xs, color: NeoText.muted, marginTop: Spacing.xs },
  badge: {
    marginTop: Spacing.xs,
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
  emptyCard: { marginTop: Spacing.sm },
  empty: { fontSize: FontSize.body, color: NeoText.secondary },
  emptySub: { fontSize: FontSize.sm, color: NeoText.muted, marginTop: Spacing.xs },
});

