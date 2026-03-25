import { Pressable, StyleSheet, View } from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { MenuSectionEyebrow } from '@/components/home/MenuIconGrid';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { FontSize, FontWeight, NeoText, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = 'rgba(255, 255, 255, 0.1)';
const CYAN = '#00CCFF';

const MANUAL_CREATE_LABEL = 'Manually Create a Casework Record';

function AdminCaseworkBody() {
  return (
    <View style={styles.body}>
      <View style={styles.createTileOuter}>
        <Pressable
          onPress={() => {}}
          style={({ pressed }) => [
            styles.createTileSurface,
            pressed && styles.createTileSurfacePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={MANUAL_CREATE_LABEL}
        >
          <ThemedText style={styles.createTileText} numberOfLines={2}>
            {MANUAL_CREATE_LABEL}
          </ThemedText>
        </Pressable>
      </View>

      <GlassCard
        sleek
        borderRadius={Radius.lg}
        borderColor={LIGHT_EDGE}
        contentStyle={styles.panelInner}
        style={styles.panelCard}
      >
        <View style={styles.panelHeaderWrap}>
          <MenuSectionEyebrow label="Active Cases" />
        </View>
        <ThemedText style={styles.noneText}>None</ThemedText>
      </GlassCard>

      <GlassCard
        sleek
        borderRadius={Radius.lg}
        borderColor={LIGHT_EDGE}
        contentStyle={styles.panelInner}
        style={styles.panelCard}
      >
        <View style={styles.panelHeaderWrap}>
          <MenuSectionEyebrow label="Closed Cases" />
        </View>
        <ThemedText style={styles.noneText}>None</ThemedText>
      </GlassCard>
    </View>
  );
}

export default function AdminCaseworkScreen() {
  return (
    <AdminSubpageScaffold subsystemTitle="Casework System">
      <AdminCaseworkBody />
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
  },
  panelCard: {
    marginHorizontal: Spacing.md,
    width: 'auto',
    alignSelf: 'stretch',
  },
  panelInner: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  panelHeaderWrap: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  noneText: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
    paddingVertical: Spacing.sm,
  },
  createTileOuter: {
    marginHorizontal: Spacing.xl,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  createTileSurface: {
    alignSelf: 'stretch',
    borderRadius: Radius.lg,
    backgroundColor: CYAN,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  createTileSurfacePressed: {
    backgroundColor: '#00B8E6',
  },
  createTileText: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: '#000000',
    textAlign: 'center',
    flexShrink: 1,
    width: '100%',
  },
});
