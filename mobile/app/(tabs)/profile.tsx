import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { MembershipCard } from '@/components/MembershipCard';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useMember } from '@/context/MemberContext';
import { useThemeColor } from '@/hooks/use-theme-color';
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
  const { member, isLoading, saveMember } = useMember();
  const [form, setForm] = useState<MemberProfile>(member);
  const [saving, setSaving] = useState(false);
  const tintColor = useThemeColor({}, 'tint');

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
            status={form.membershipStatus}
            membershipExpiry={form.membershipExpiry}
          />

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
});
