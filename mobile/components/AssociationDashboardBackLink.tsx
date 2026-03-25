import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

/**
 * Use only on **top-level** Association hub screens (e.g. news index, casework list, member e-card).
 * Nested routes (article detail, new request, poll detail, etc.) should use `router.back()` / “← Back to …”
 * so users return to the previous screen in the stack — same idea as admin hub vs admin sub-pages.
 */
export function AssociationDashboardBackLink() {
  const router = useRouter();
  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={() => router.push('/association')} hitSlop={12}>
        <ThemedText type="link">← Back to Association Dashboard</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: 0,
  },
});
