import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { MembershipCard } from '@/components/MembershipCard';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { useMember } from '@/context/MemberContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { isSupabaseConfigured } from '@/lib/supabase';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { MemberProfile } from '@/types/member';

function FieldRow({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
}) {
  const textColor = useThemeColor({}, 'text');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');

  return (
    <>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <TextInput
        style={[
          styles.input,
          { color: textColor, backgroundColor: surfaceColor, borderColor },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={mutedColor}
      />
    </>
  );
}

export default function ProfileScreen() {
  const { signOut, session } = useAuth();
  const {
    member,
    memberStatus,
    isLoading,
    saveMember,
    refreshMember,
    memberLoadResult,
    memberLoadErrorMessage,
  } = useMember();
  const [form, setForm] = useState<MemberProfile>(member);
  const [saving, setSaving] = useState(false);
  const tintColor = useThemeColor({}, 'tint');
  const errorColor = useThemeColor({}, 'error');
  const mutedColor = useThemeColor({}, 'textMuted');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');

  useEffect(() => {
    setForm(member);
  }, [member]);

  const update = useCallback((key: keyof MemberProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await saveMember(form);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, saveMember]);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'You will need to sign in again to use the app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  }, [signOut]);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <TabScreenHeader title="Profile" />
        <ThemedView style={styles.centered}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Loading profile…</ThemedText>
        </ThemedView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TabScreenHeader title="Profile" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <MembershipCard
            name={form.name}
            membershipNumber={form.membershipNumber}
            status={memberStatus.membershipStatus}
            membershipExpiry={form.membershipExpiry}
          />

          {isSupabaseConfigured && (memberLoadResult === 'no_row' || memberLoadResult === 'error') ? (
            <ThemedView
              style={[
                styles.syncNotice,
                { backgroundColor: surfaceColor, borderColor },
              ]}>
              <ThemedText style={[styles.syncNoticeTitle, { color: errorColor }]}>
                {memberLoadResult === 'error' ? 'Could not load membership' : 'No membership record for this login'}
              </ThemedText>
              <ThemedText style={[styles.syncNoticeBody, { color: mutedColor }]}>
                {memberLoadResult === 'error'
                  ? memberLoadErrorMessage ?? 'Check your connection and try again.'
                  : 'The app only sees the row in Supabase where members.id equals your signed-in user id. If the table shows “active” under a different id, fix the row or use the matching account.'}
              </ThemedText>
              {session?.user?.id ? (
                <ThemedText style={styles.userIdMono} selectable>
                  Your user id:{'\n'}
                  {session.user.id}
                </ThemedText>
              ) : null}
              <PrimaryButton title="Retry" onPress={() => void refreshMember()} fullWidth />
            </ThemedView>
          ) : null}

          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Your details
          </ThemedText>
          <ThemedText style={styles.helperText}>
            Used for expiry reminders and to pre-fill casework requests.
          </ThemedText>

          <View style={styles.form}>
            <FieldRow label="Full name" value={form.name} onChangeText={(t) => update('name', t)} placeholder="As on licence" />
            <FieldRow label="Private hire badge number" value={form.badgeNumber} onChangeText={(t) => update('badgeNumber', t)} placeholder="Badge number" />
            <FieldRow label="Badge expiry" value={form.badgeExpiry} onChangeText={(t) => update('badgeExpiry', t)} placeholder="YYYY-MM-DD" />
            <FieldRow label="Vehicle registration" value={form.vehicleRegistration} onChangeText={(t) => update('vehicleRegistration', t)} placeholder="e.g. AB12 CDE" />
            <FieldRow label="Vehicle make" value={form.vehicleMake} onChangeText={(t) => update('vehicleMake', t)} placeholder="e.g. Toyota" />
            <FieldRow label="Vehicle model" value={form.vehicleModel} onChangeText={(t) => update('vehicleModel', t)} placeholder="e.g. Prius" />
            <FieldRow label="Private hire plate number" value={form.plateNumber} onChangeText={(t) => update('plateNumber', t)} placeholder="Plate number" />
            <FieldRow label="Plate expiry" value={form.plateExpiry} onChangeText={(t) => update('plateExpiry', t)} placeholder="YYYY-MM-DD" />
          </View>

          <PrimaryButton
            title={saving ? 'Saving…' : 'Save profile'}
            onPress={handleSave}
            disabled={saving}
            fullWidth
          />

          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOutPressable, pressed && styles.signOutPressed]}
            accessibilityRole="button"
            accessibilityLabel="Sign out">
            <ThemedText style={[styles.signOutLabel, { color: errorColor }]}>Sign out</ThemedText>
          </Pressable>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    opacity: 0.8,
  },
  container: {
    gap: Spacing.xl,
  },
  sectionTitle: {
    marginTop: Spacing.sm,
  },
  helperText: {
    opacity: 0.85,
    fontSize: FontSize.body,
  },
  form: {
    gap: 0,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.body,
  },
  signOutPressable: {
    alignSelf: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  signOutPressed: {
    opacity: 0.7,
  },
  signOutLabel: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  syncNotice: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  syncNoticeTitle: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  syncNoticeBody: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  userIdMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    opacity: 0.9,
  },
});
