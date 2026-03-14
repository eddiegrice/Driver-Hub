/**
 * Minimal polished glass nav strip. Active tab: soft diffused purple glow behind icon.
 */
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { NeoAccent, NeoGlass, NeoText, Radius } from '@/constants/theme';

type TabIconName = 'house.fill' | 'person.crop.circle' | 'doc.text.magnifyingglass' | 'newspaper.fill' | 'checklist' | 'message.fill' | 'square.grid.2x2';

const ICON_MAP: Record<string, TabIconName> = {
  index: 'house.fill',
  profile: 'person.crop.circle',
  casework: 'doc.text.magnifyingglass',
  news: 'newspaper.fill',
  polls: 'checklist',
  chat: 'message.fill',
  more: 'square.grid.2x2',
};

export function GlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12), paddingTop: 12 }]}>
      <View style={styles.glass}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const iconName = ICON_MAP[route.name] ?? 'house.fill';

          const onPress = () => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            >
              {/* Glow behind active icon */}
              {isFocused && (
                <View style={styles.glowWrap}>
                  <LinearGradient
                    colors={[NeoAccent.purple[0], NeoAccent.purple[1]] as unknown as string[]}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={styles.glow}
                  />
                </View>
              )}
              <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
                <IconSymbol
                  name={iconName}
                  size={26}
                  color={isFocused ? NeoText.primary : NeoText.muted}
                />
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? NeoText.primary : NeoText.muted },
                ]}
                numberOfLines={1}
              >
                {options.title ?? route.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  glass: {
    flexDirection: 'row',
    backgroundColor: NeoGlass.navBar,
    borderRadius: Radius.cardLarge,
    borderTopWidth: 1,
    borderTopColor: NeoGlass.stroke,
    paddingHorizontal: 4,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  glowWrap: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -28,
    marginLeft: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  glow: {
    flex: 1,
    opacity: 0.45,
    borderRadius: 28,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(137, 48, 243, 0.25)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
