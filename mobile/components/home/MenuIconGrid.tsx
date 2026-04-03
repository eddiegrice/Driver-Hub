import type { Href } from 'expo-router';
import { StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';

import { FrostedGlassView } from '@/components/FrostedGlassView';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = NeoGlass.cardBorder;
const SMOKED_OVERLAY = 'rgba(255, 255, 255, 0.03)';

export type MenuGridItem = {
  route: Href;
  label: string;
  icon: IconSymbolName;
  premium?: boolean;
  /** Association dashboard: replaces default placeholder body text. */
  description?: string;
  /** Association dashboard: non-navigating tile (tap does nothing). */
  comingSoon?: boolean;
};

type Props = {
  /** When omitted, no in-box section header row (use {@link MenuSectionEyebrow} above the grid). */
  title?: string;
  items: MenuGridItem[];
  itemsPerRow: number;
  isMemberActive: boolean;
  onNavigate: (route: Href) => void;
  onPremiumBlocked: () => void;
};

/** Uppercase label with horizontal lines (same look as the in-grid header in {@link MenuIconGrid}). */
export function MenuSectionEyebrow({
  label,
  style,
  /** Side segments grow to the content edges (same span as a full-width rule in the parent). */
  wideSideLines,
}: {
  label: string;
  /** Merged onto the row wrapper (e.g. `{ marginBottom: 0 }` before a full-width rule). */
  style?: StyleProp<ViewStyle>;
  wideSideLines?: boolean;
}) {
  const lineStyle = wideSideLines ? styles.sectionHeaderLineFull : styles.sectionHeaderLine;
  return (
    <View
      style={[
        styles.menuSectionHeader,
        wideSideLines && styles.menuSectionHeaderWide,
        style,
      ]}>
      <View style={lineStyle} />
      <ThemedText style={styles.menuSectionTitle}>{label}</ThemedText>
      <View style={lineStyle} />
    </View>
  );
}

export function MenuIconGrid({
  title,
  items,
  itemsPerRow,
  isMemberActive,
  onNavigate,
  onPremiumBlocked,
}: Props) {
  const rows: MenuGridItem[][] = items.reduce<MenuGridItem[][]>((acc, item, i) => {
    if (i % itemsPerRow === 0) acc.push([]);
    acc[acc.length - 1].push(item);
    return acc;
  }, []);

  return (
    <View style={styles.menuBoxOuter}>
      <View style={[styles.menuBox, { borderColor: LIGHT_EDGE }]}>
        <FrostedGlassView
          borderRadius={Radius.lg - 1}
          intensity={12}
          overlayColor={SMOKED_OVERLAY}
          style={styles.menuBoxFrosted}
        >
          {title ? (
            <View style={styles.menuSectionHeader}>
              <View style={styles.sectionHeaderLine} />
              <ThemedText style={styles.menuSectionTitle}>{title}</ThemedText>
              <View style={styles.sectionHeaderLine} />
            </View>
          ) : null}
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.menuRow}>
              {row.map(({ route, label, icon, premium }) => (
                <TouchableOpacity
                  key={`${route}-${label}`}
                  activeOpacity={0.8}
                  style={styles.menuItem}
                  onPress={() => {
                    if (premium && !isMemberActive) {
                      onPremiumBlocked();
                      return;
                    }
                    onNavigate(route);
                  }}
                >
                  <View style={styles.menuIconWrap}>
                    <View style={styles.menuIconInner}>
                      <IconSymbol name={icon} size={28} color="#FFFFFF" style={styles.menuIconNudge} />
                    </View>
                    {premium ? (
                      <IconSymbol name="star.fill" size={16} color="#FFD166" style={styles.premiumStar} />
                    ) : null}
                  </View>
                  <ThemedText style={styles.menuItemLabel} numberOfLines={2}>
                    {label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </FrostedGlassView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuBoxOuter: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  menuBox: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuBoxFrosted: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  menuSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    alignSelf: 'center',
  },
  menuSectionHeaderWide: {
    alignSelf: 'stretch',
    width: '100%',
  },
  sectionHeaderLine: {
    flex: 1,
    maxWidth: 72,
    height: 1,
    backgroundColor: NeoGlass.stroke,
  },
  sectionHeaderLineFull: {
    flex: 1,
    height: 1,
    backgroundColor: NeoGlass.stroke,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  menuIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    shadowColor: '#00CCFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 4,
    position: 'relative',
  },
  menuIconInner: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconNudge: {
    transform: [{ translateY: 2 }],
  },
  menuItemLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
  },
  premiumStar: {
    position: 'absolute',
    top: -4,
    right: -3,
  },
});
