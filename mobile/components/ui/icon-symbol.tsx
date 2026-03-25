// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.up': 'expand-less',
  'line.3.horizontal': 'menu',
  // PHD Matrix tab icons
  'person.crop.rectangle': 'badge',
  'person.crop.circle': 'person',
  'doc.text.magnifyingglass': 'description',
  'newspaper.fill': 'article',
  'checklist': 'checklist',
  'square.grid.2x2': 'apps',
  'message.fill': 'chat',
  // Menu placeholders
  'car.fill': 'traffic',
  'calendar': 'event',
  'dollarsign.circle': 'calculate',
  'creditcard.fill': 'card-membership',
  'folder.fill': 'folder',
  'poll': 'poll',
  'gavel.fill': 'gavel',
  'book.closed.fill': 'menu-book',
  'music.note': 'library-music',
  'soccerball': 'sports-soccer',
  'exclamationmark.triangle.fill': 'warning',
  'wrench.and.screwdriver': 'build',
  'calendar.badge.clock': 'schedule',
  'clock.fill': 'schedule',
  'chart.line.uptrend.xyaxis': 'show-chart',
  'signpost.left.fill': 'signpost',
  'map.fill': 'map',
  'person.3.fill': 'groups',
  'sparkles': 'auto-awesome',
  // Premium indicator overlay
  'star.fill': 'star',
} as const satisfies Record<string, MaterialIconName>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return (
    <MaterialIcons color={color} size={size} name={MAPPING[name] as MaterialIconName} style={style} />
  );
}
