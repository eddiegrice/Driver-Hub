import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMember } from '@/context/MemberContext';
import { useThemeColor } from '@/hooks/use-theme-color';

export function NotActiveScreen() {
  const insets = useSafeAreaInsets();
  const { refreshMember } = useMember();

  const backgroundColor = useThemeColor({}, 'background');
  const textMuted = useThemeColor({}, 'textMuted');
  const errorColor = useThemeColor({}, 'error');
  const successColor = useThemeColor({}, 'success');

  const handleRefresh = () => {
    refreshMember();
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, Spacing.xxl) },
      ]}
      keyboardShouldPersistTaps="handled">
      <ThemedText type="title" style={styles.title}>
        Get access to DriverHub
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: textMuted }]}>
        Your DriverHub membership isn’t active yet. If you’ve already set up your direct debit on the website, please wait for confirmation or contact the office.
      </ThemedText>

      <View style={styles.block}>
        <ThemedText style={[styles.message, { color: errorColor }]}>
          Access to the app is limited to active DriverHub members.
        </ThemedText>
        <ThemedText style={[styles.hint, { color: textMuted }]}>
          If you’ve recently joined or updated your payment details, tap below to refresh your status. If your direct debit has failed or been cancelled, please contact the office to reactivate your membership.
        </ThemedText>
        <PrimaryButton title="Refresh status" onPress={handleRefresh} fullWidth />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  title: { marginBottom: Spacing.sm },
  subtitle: { marginBottom: Spacing.xxl, fontSize: 15, lineHeight: 22 },
  block: { marginBottom: Spacing.xxl },
  optionTitle: { fontSize: 17, fontWeight: '600', marginBottom: Spacing.xs },
  optionDesc: { fontSize: 14, lineHeight: 20, marginBottom: Spacing.md },
  message: { marginTop: Spacing.md, fontSize: 14 },
  hint: { marginTop: Spacing.sm, marginBottom: Spacing.md, fontSize: 13 },
});
