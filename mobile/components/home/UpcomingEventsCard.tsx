import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  GLASGOW_FIXTURE_VENUE_ROWS,
  GLASGOW_GIG_VENUE_ORDER,
} from '@/lib/events-supabase';
import type { GlasgowEventBannerRow, GlasgowVenueKey } from '@/types/events';
import { FontSize, FontWeight, NeoText, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';
const MOTORWAY_TILE_BG = 'rgba(40, 80, 200, 0.22)';
const MOTORWAY_TILE_BORDER = 'rgba(140, 180, 255, 0.7)';
const BRIDGE_ALERT_AMBER = 'rgba(255, 220, 150, 0.95)';

const GIG_VENUE_SHORT_LABEL: Pick<
  Record<GlasgowVenueKey, string>,
  'ovo_hydro' | 'swg3' | 'barrowlands' | 'o2_academy_glasgow'
> = {
  ovo_hydro: 'HYDRO',
  swg3: 'SWG3',
  barrowlands: 'BARRAS',
  o2_academy_glasgow: 'THE O2',
};

function truncateGigEventTitle(text: string, maxChars = 14): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars)}…`;
}

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

  const formatFixtureDateTime = (startTime: string | null): string => {
    if (!startTime) return 'TBC';
    const d = new Date(startTime);
    if (!Number.isFinite(d.getTime())) return 'TBC';
    const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${date} - ${time}`;
  };

  const getFixtureTeams = (
    ev: GlasgowEventBannerRow | undefined,
    titleLine: string
  ): { home: string; away: string } | null => {
    if (!ev) return null;
    const h = ev.homeTeam?.trim();
    const a = ev.awayTeam?.trim();
    if (h && a) return { home: h, away: a };
    const parts = titleLine.split(/\s+vs\.?\s+/i);
    if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
      return { home: parts[0].trim(), away: parts[1].trim() };
    }
    return null;
  };

  const venueLabels: Record<GlasgowVenueKey, string> = {
    ovo_hydro: 'OVO Hydro',
    swg3: 'SWG3',
    barrowlands: 'Barrowlands',
    o2_academy_glasgow: 'O2 Academy',
    celtic_park: 'Parkhead',
    ibrox: 'Ibrox',
    partick_thistle: 'Firhill',
    hampden: 'Hampden',
  };

  const renderEventCell = (venueKey: GlasgowVenueKey, layout: 'gig' | 'fixture') => {
    const ev = eventsByVenueKey.get(venueKey);
    const title = eventsLoading
      ? 'CHECKING…'
      : eventsError
        ? 'Events unavailable'
        : ev?.title ?? 'No upcoming events';

    const isGig = layout === 'gig';

    if (isGig) {
      const gigWhen = eventsLoading
        ? '...'
        : eventsError
          ? '—'
          : formatFixtureDateTime(ev?.startTime ?? null);
      const gigTitleLine = truncateGigEventTitle(title);

      return (
        <View key={venueKey} style={[styles.eventCell, styles.eventCellGig]}>
          <View style={styles.eventCellGigTop}>
            <ThemedText style={styles.eventCellGigVenue} numberOfLines={1}>
              {GIG_VENUE_SHORT_LABEL[venueKey as keyof typeof GIG_VENUE_SHORT_LABEL]}
            </ThemedText>
          </View>
          <View style={styles.eventCellGigMiddle}>
            <ThemedText style={styles.eventCellGigTitle} numberOfLines={1}>
              {gigTitleLine}
            </ThemedText>
          </View>
          <View style={styles.eventCellGigBottom}>
            <ThemedText style={styles.eventCellGigWhen} numberOfLines={1}>
              {gigWhen}
            </ThemedText>
          </View>
        </View>
      );
    }

    const fixtureWhen = eventsLoading
      ? '...'
      : eventsError
        ? '—'
        : formatFixtureDateTime(ev?.startTime ?? null);
    const teams = getFixtureTeams(ev, title);

    return (
      <View key={venueKey} style={[styles.eventCell, styles.eventCellFixture]}>
        <View style={styles.eventCellFixtureTop}>
          <ThemedText style={styles.eventCellFixtureStadium} numberOfLines={2}>
            {venueLabels[venueKey]}
          </ThemedText>
        </View>

        <View style={styles.eventCellFixtureMiddle}>
          {teams ? (
            <View style={styles.eventCellFixtureMatchCol}>
              <ThemedText style={styles.eventCellFixtureTeam} numberOfLines={2}>
                {teams.home}
              </ThemedText>
              <ThemedText style={styles.eventCellFixtureVs}>vs</ThemedText>
              <ThemedText style={styles.eventCellFixtureTeam} numberOfLines={2}>
                {teams.away}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.eventCellFixtureTitleFallback} numberOfLines={3}>
              {title}
            </ThemedText>
          )}
        </View>

        <View style={styles.eventCellFixtureBottom}>
          <ThemedText style={styles.eventCellFixtureWhen} numberOfLines={2}>
            {fixtureWhen}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <GlassCard
      elevated
      borderRadius={Radius.lg}
      borderColor={LIGHT_EDGE}
      contentStyle={styles.eventsCardContent}
      sleek
      style={styles.eventsCard}
    >
      <View style={styles.alertsHeaderRow}>
        <View style={styles.alertsHeaderLine} />
        <ThemedText style={styles.alertsHeaderText}>Upcoming Events</ThemedText>
        <View style={styles.alertsHeaderLine} />
      </View>

      <View style={styles.eventsTilesStack}>
        <View style={styles.eventsGigRow}>
          {GLASGOW_GIG_VENUE_ORDER.map((venueKey) => renderEventCell(venueKey, 'gig'))}
        </View>

        <View style={styles.eventsFixtureGrid}>
          {GLASGOW_FIXTURE_VENUE_ROWS.map((rowKeys, rowIndex) => (
            <View key={`fixture-row-${rowIndex}`} style={styles.eventsFixtureRow}>
              {rowKeys.map((venueKey) => renderEventCell(venueKey, 'fixture'))}
            </View>
          ))}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  eventsCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
  },
  eventsCardContent: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  alertsHeaderRow: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    justifyContent: 'center',
  },
  alertsHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    maxWidth: 72,
  },
  alertsHeaderText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(230, 237, 255, 0.85)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eventsTilesStack: {
    gap: Spacing.sm,
  },
  eventsGigRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.xs,
  },
  eventsFixtureGrid: {
    gap: Spacing.xs,
  },
  eventsFixtureRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.xs,
  },
  eventCell: {
    flex: 1,
    minWidth: 0,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: MOTORWAY_TILE_BORDER,
    backgroundColor: MOTORWAY_TILE_BG,
  },
  eventCellGig: {
    alignItems: 'stretch',
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  eventCellGigTop: {
    width: '100%',
    alignItems: 'center',
  },
  eventCellGigMiddle: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  eventCellGigBottom: {
    width: '100%',
    alignItems: 'center',
  },
  eventCellGigVenue: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: '#E5EDFF',
    letterSpacing: 0.2,
    marginBottom: Spacing.xs,
    textAlign: 'center',
    width: '100%',
    textDecorationLine: 'underline',
  },
  eventCellGigTitle: {
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: BRIDGE_ALERT_AMBER,
    textAlign: 'center',
    width: '100%',
  },
  eventCellGigWhen: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: FontWeight.medium,
    color: NeoText.muted,
    textAlign: 'center',
    width: '100%',
  },
  eventCellFixture: {
    alignItems: 'stretch',
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  eventCellFixtureTop: {
    width: '100%',
  },
  eventCellFixtureMiddle: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  eventCellFixtureBottom: {
    width: '100%',
  },
  eventCellFixtureStadium: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: '#E5EDFF',
    letterSpacing: 0.2,
    marginBottom: Spacing.xs,
    textAlign: 'center',
    width: '100%',
    textDecorationLine: 'underline',
    textTransform: 'uppercase',
  },
  eventCellFixtureMatchCol: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 2,
  },
  eventCellFixtureTeam: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: BRIDGE_ALERT_AMBER,
    textAlign: 'center',
    width: '100%',
  },
  eventCellFixtureVs: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: BRIDGE_ALERT_AMBER,
    textAlign: 'center',
    textTransform: 'lowercase',
  },
  eventCellFixtureTitleFallback: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: BRIDGE_ALERT_AMBER,
    textAlign: 'center',
    width: '100%',
  },
  eventCellFixtureWhen: {
    marginTop: 2,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: NeoText.muted,
    textAlign: 'center',
    width: '100%',
  },
});
