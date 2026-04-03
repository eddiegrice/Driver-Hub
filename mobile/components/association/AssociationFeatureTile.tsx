import type { Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { MenuGridItem } from '@/components/home/MenuIconGrid';
import { ThemedText } from '@/components/themed-text';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

const LIGHT_EDGE = NeoGlass.cardBorder;

const PLACEHOLDER_COPY = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';

type Props = {
  item: MenuGridItem;
  isMemberActive: boolean;
  onNavigate: (route: Href) => void;
  onPremiumBlocked: () => void;
};

export function AssociationFeatureTile({
  item,
  isMemberActive,
  onNavigate,
  onPremiumBlocked,
}: Props) {
  const { route, label, icon, premium, description, comingSoon } = item;

  const handlePress = () => {
    if (comingSoon) return;
    if (premium && !isMemberActive) {
      onPremiumBlocked();
      return;
    }
    onNavigate(route);
  };

  const bodyText = description ?? PLACEHOLDER_COPY;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.pressWrap, !comingSoon && pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: comingSoon }}
    >
      <GlassCard
        sleek
        borderRadius={Radius.lg}
        borderColor={LIGHT_EDGE}
        contentStyle={styles.cardInner}
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <ThemedText style={styles.tileTitle}>{label}</ThemedText>
            <ThemedText style={styles.blurb} numberOfLines={4}>
              {bodyText}
            </ThemedText>
          </View>
          <View style={styles.iconWrap}>
            <View style={styles.iconInner}>
              <IconSymbol name={icon} size={40} color="#FFFFFF" style={styles.iconNudge} />
            </View>
            {premium ? (
              <IconSymbol name="star.fill" size={18} color="#FFD166" style={styles.premiumStar} />
            ) : null}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressWrap: {
    width: '100%',
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    width: '100%',
  },
  cardInner: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  leftCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.md,
  },
  tileTitle: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
    marginBottom: Spacing.sm,
  },
  blurb: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
    lineHeight: 20,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#00CCFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 5,
  },
  iconInner: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconNudge: {
    transform: [{ translateY: 2 }],
  },
  premiumStar: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});
