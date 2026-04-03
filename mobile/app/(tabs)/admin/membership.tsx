import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = NeoGlass.cardBorder;
const CYAN = '#00CCFF';

type Segment = 'basic' | 'association' | 'lapsed' | 'cancelled';

const PILL_DEFS: { key: Segment; label: string }[] = [
  { key: 'basic', label: 'Basic' },
  { key: 'association', label: 'Association' },
  { key: 'lapsed', label: 'Lapsed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const PLACEHOLDER_BY_SEGMENT: Record<Segment, string> = {
  basic: 'Basic members (free) table — to go here.',
  association: 'Association members table — to go here.',
  lapsed: 'Sub lapsed table — to go here.',
  cancelled: 'Cancelled members table — to go here.',
};

function AdminMembershipBody() {
  const [segment, setSegment] = useState<Segment>('basic');
  const placeholder = PLACEHOLDER_BY_SEGMENT[segment];

  return (
    <View style={styles.body}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
        style={styles.pillScroll}
      >
        {PILL_DEFS.map(({ key, label }) => {
          const active = segment === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSegment(key)}
              style={({ pressed }) => [
                styles.pill,
                active && styles.pillActive,
                pressed && styles.pillPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <ThemedText style={[styles.pillLabel, active && styles.pillLabelActive]} numberOfLines={1}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <GlassCard
        sleek
        borderRadius={Radius.lg}
        borderColor={LIGHT_EDGE}
        contentStyle={styles.placeholderInner}
        style={styles.placeholderCard}
      >
        <ThemedText style={styles.placeholderText}>{placeholder}</ThemedText>
      </GlassCard>
    </View>
  );
}

export default function AdminMembershipScreen() {
  return (
    <AdminSubpageScaffold subsystemTitle="Membership System">
      <AdminMembershipBody />
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  pillScroll: {
    flexGrow: 0,
    marginHorizontal: -Spacing.xs,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    backgroundColor: 'rgba(22, 24, 32, 0.75)',
  },
  pillActive: {
    borderColor: CYAN,
    backgroundColor: 'rgba(0, 204, 255, 0.14)',
  },
  pillPressed: {
    opacity: 0.88,
  },
  pillLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.muted,
  },
  pillLabelActive: {
    color: CYAN,
  },
  placeholderCard: {
    marginHorizontal: Spacing.md,
    width: 'auto',
    alignSelf: 'stretch',
  },
  placeholderInner: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    minHeight: 120,
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
