import { ScrollView, StyleSheet, View } from 'react-native';

import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export default function DocsVaultScreen() {
  return (
    <View style={styles.screen}>
      <TabScreenHeader title="Docs Vault" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <ThemedText style={styles.placeholder}>
            Placeholder for future features. New functionality will appear here in later versions.
          </ThemedText>
        </ThemedView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  container: {
    gap: Spacing.xl,
  },
  placeholder: {
    opacity: 0.85,
    fontSize: 17,
  },
});
