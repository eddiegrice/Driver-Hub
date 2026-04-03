```tsx
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useCasework } from '@/context/CaseworkContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Radius, Spacing } from '@/constants/theme';
import { CASEWORK_STATUSES, type CaseworkStatus, statusLabel } from '@/types/casework';

export default function AdminCreateInternalCaseScreen() {
  const router = useRouter();
  const { createInternalCase } = useCasework();
  const [title, setTitle] = useState('');
  const [casenotes, setCasenotes] = useState('');
  const [status, setStatus] = useState<CaseworkStatus>('case_open');
  const [statusOpen, setStatusOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const surfaceColor = useThemeColor({}, 'surface');
  const muted = useThemeColor({}, 'textMuted');

  const submit = useCallback(async () => {
    if (!title.trim() || !casenotes.trim()) {
      Alert.alert('Required', 'Enter title and casenotes.');
      return;
    }
    setSubmitting(true);
    try {
      const t = await createInternalCase({ title: title.trim(), casenotes: casenotes.trim(), status });
      if (!t) Alert.alert('Error', 'Could not create case.');
      else router.replace(`/admin/casework/${t.id}` as Href);
    } finally {
      setSubmitting(false);
    }
  }, [title, casenotes, status, createInternalCase, router]);

  return (
    <AdminSubpageScaffold subsystemTitle="Internal case" backLabel="← Casework" onBackPress={() => router.back()}>
      <ThemedView style={styles.gap}>
        <ThemedText style={styles.label}>Title *</ThemedText>
        <TextInput
          style={[styles.input, { color: textColor, borderColor, backgroundColor: surfaceColor }]}
          value={title}
          onChangeText={setTitle}
          placeholder="Short title"
          placeholderTextColor={muted}
        />
        <ThemedText style={styles.label}>Casenotes *</ThemedText>
        <TextInput
          style={[styles.input, styles.area, { color: textColor, borderColor, backgroundColor: surfaceColor }]}
          value={casenotes}
          onChangeText={setCasenotes}
          multiline
          placeholder="Notes…"
          placeholderTextColor={muted}
        />
        <ThemedText style={styles.label}>Status</ThemedText>
        <Pressable
          onPress={() => setStatusOpen(true)}
          style={[styles.drop, { borderColor, backgroundColor: surfaceColor }]}>
          <ThemedText style={{ color: textColor }}>{statusLabel(status)}</ThemedText>
        </Pressable>
        <Modal visible={statusOpen} transparent animationType="fade">
          <Pressable style={styles.modalBg} onPress={() => setStatusOpen(false)}>
            <ThemedView style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}>
              <ScrollView>
                {CASEWORK_STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    style={styles.row}
                    onPress={() => {
                      setStatus(s);
                      setStatusOpen(false);
                    }}>
                    <ThemedText style={{ color: textColor }}>{statusLabel(s)}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </ThemedView>
          </Pressable>
        </Modal>
        <PrimaryButton title={submitting ? 'Creating…' : 'Create internal case'} onPress={submit} disabled={submitting} fullWidth />
      </ThemedView>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.md, paddingBottom: Spacing.xxl },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: 16 },
  area: { minHeight: 120, textAlignVertical: 'top' },
  drop: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl },
  sheet: { maxHeight: 360, borderRadius: Radius.lg, borderWidth: 1 },
  row: { paddingVertical: 14, paddingHorizontal: Spacing.lg },
});
```
