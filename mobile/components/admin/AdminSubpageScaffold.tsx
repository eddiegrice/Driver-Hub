import type { ReactNode } from 'react';
import type { ScrollViewProps } from 'react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminAreaHeader } from '@/components/admin/AdminAreaHeader';
import { HUB_SCROLL_BOTTOM_GAP } from '@/constants/mainBottomBar';
import { Spacing } from '@/constants/theme';

type Props = {
  subsystemTitle: string;
  children?: ReactNode;
  /** Override default back → `/admin` (e.g. nested news flows → `/admin/news`). */
  onBackPress?: () => void;
  backLabel?: string;
  refreshControl?: ScrollViewProps['refreshControl'];
  keyboardShouldPersistTaps?: ScrollViewProps['keyboardShouldPersistTaps'];
};

/** Shared chrome for admin subsystem screens (header + scroll body). */
export function AdminSubpageScaffold({
  subsystemTitle,
  children,
  onBackPress,
  backLabel,
  refreshControl,
  keyboardShouldPersistTaps,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.headerInset}>
        <AdminAreaHeader
          subsystemLabel={subsystemTitle}
          onBackPress={onBackPress}
          backLabel={backLabel}
        />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: (insets.bottom || 16) + HUB_SCROLL_BOTTOM_GAP },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerInset: {
    paddingHorizontal: Spacing.xl,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    flexGrow: 1,
  },
});
