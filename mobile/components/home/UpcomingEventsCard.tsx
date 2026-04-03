import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import type { GlasgowEventBannerRow, GlasgowVenueKey } from '@/types/events';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = NeoGlass.cardBorder;
const TILE_BG = 'rgba(40, 80, 200, 0.22)';
const TILE_BORDER = 'rgba(140, 180, 255, 0.7)';
const HIGHLIGHT_TEXT = 'rgba(255, 220, 150, 0.95)';

const GIG_ORDER: GlasgowVenueKey[] = ['ovo_hydro', 'swg3', 'barrowlands', 'o2_academy_glasgow'];
const STADIUM_ORDER: GlasgowVenueKey[] = ['celtic_park', 'ibrox', 'partick_thistle', 'hampden'];

const VENUE_LABELS: Record<GlasgowVenueKey, string> = {
  ovo_hydro: 'OVO Hydro',
  swg3: 'SWG3',
  barrowlands: 'Barrowlands',
  o2_academy_glasgow: 'The o2 Academy',
  celtic_park: 'Parkhead',
  ibrox: 'Ibrox',
  partick_thistle: 'Firhill',
  hampden: 'Hampden',
};

type Props = {
  eventsRows: GlasgowEventBannerRow[];
  eventsLoading: boolean;
  eventsError: Error | null;
};

export function UpcomingEventsCard({ eventsRows, eventsLoading, eventsError }: Props) {
  const eventsByVenueKey = useMemo(() => {
    const map = new Map<GlasgowVenueKey, GlasgowEventBannerRow>();
    for (const row of eventsRows) map.set(row.venueKey, row);
    return map;
  }, [eventsRows]);

  const formatDateTime = (startTime: string | null): string => {
    if (!startTime) return 'TBC';
    const d = new Date(startTime);
    if (!Number.isFinite(d.getTime())) return 'TBC';
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${date} - ${time}`;
  };

  const getTitle = (ev: GlasgowEventBannerRow | undefined): string => {
    if (eventsLoading) return 'CHECKING...';
    if (eventsError) return 'Events unavailable';
    return ev?.title ?? 'No upcoming events';
  };

  const getWhen = (ev: GlasgowEventBannerRow | undefined): string => {
    if (eventsLoading) return '...';
    if (eventsError) return '—';
    return formatDateTime(ev?.startTime ?? null);
  };

  const renderStackedTile = (venueKey: GlasgowVenueKey) => {
    const ev = eventsByVenueKey.get(venueKey);
    return (
      <View key={venueKey} style={styles.eventTile}>
        <View style={styles.eventTileTopRow}>
          <ThemedText style={styles.eventVenue}>{VENUE_LABELS[venueKey]}</ThemedText>
          <ThemedText style={styles.eventWhen}>{getWhen(ev)}</ThemedText>
        </View>
        <ThemedText style={styles.eventTitle}>{getTitle(ev)}</ThemedText>
      </View>
    );
  };

  return (
    <View style={styles.stack}>
      <GlassCard
        elevated
        borderRadius={Radius.lg}
        borderColor={LIGHT_EDGE}
        contentStyle={styles.panelContent}
        sleek
        style={styles.panel}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLine} />
          <ThemedText style={styles.headerText}>Upcoming Venue Events</ThemedText>
          <View style={styles.headerLine} />
        </View>
        <View style={styles.tilesStack}>
          {GIG_ORDER.map((venueKey) => renderStackedTile(venueKey))}
        </View>
      </GlassCard>

      <GlassCard
        elevated
        borderRadius={Radius.lg}
        borderColor={LIGHT_EDGE}
        contentStyle={styles.panelContent}
        sleek
        style={styles.panel}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLine} />
          <ThemedText style={styles.headerText}>Upcoming Stadium Events</ThemedText>
          <View style={styles.headerLine} />
        </View>
        <View style={styles.tilesStack}>
          {STADIUM_ORDER.map((venueKey) => renderStackedTile(venueKey))}
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.sm,
  },
  panel: {
    marginHorizontal: Spacing.md,
    marginTop: 0,
  },
  panelContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  headerRow: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    maxWidth: 72,
  },
  headerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(230, 237, 255, 0.85)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  tilesStack: {
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  eventTile: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: TILE_BORDER,
    backgroundColor: TILE_BG,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  eventTileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  eventVenue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: '#E5EDFF',
    letterSpacing: 0.2,
  },
  eventWhen: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: '#FFFFFF',
  },
  eventTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: HIGHLIGHT_TEXT,
    lineHeight: 20,
    textAlign: 'center',
    width: '100%',
  },
});
