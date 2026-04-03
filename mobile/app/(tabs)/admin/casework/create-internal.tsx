import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCasework } from '@/context/CaseworkContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { NeoGlass, Radius, Spacing } from '@/constants/theme';
import { CASEWORK_STATUSES, type CaseworkStatus, statusLabel } from '@/types/casework';

const SUBMIT_CYAN = '#00CCFF';

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
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');
  const modalSheetBg = useThemeColor({ light: '#f1f5f9', dark: '#14161c' }, 'surface');

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
    <AdminSubpageScaffold
      subsystemTitle="Internal case"
      backLabel="← Casework"
      onBackPress={() => router.back()}
      keyboardShouldPersistTaps="handled">
      <ThemedView style={styles.outer}>
        <ThemedView style={[styles.glassForm, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
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
            <ThemedText style={{ color: muted }}>▼</ThemedText>
          </Pressable>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: SUBMIT_CYAN }, submitting && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}>
            <ThemedText style={styles.submitBtnText}>
              {submitting ? 'Creating…' : 'Create internal case'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>

      <Modal visible={statusOpen} transparent animationType="fade" onRequestClose={() => setStatusOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setStatusOpen(false)} />
          <View style={styles.modalCenter} pointerEvents="box-none">
            <View style={[styles.modalSheet, { backgroundColor: modalSheetBg, borderColor: NeoGlass.cardBorder }]}>
              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                {CASEWORK_STATUSES.map((s) => (
                  <Pressable
                    key={s}
                    style={styles.modalRow}
                    onPress={() => {
                      setStatus(s);
                      setStatusOpen(false);
                    }}>
                    <ThemedText style={{ color: textColor }}>{statusLabel(s)}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  outer: { paddingBottom: Spacing.xxl },
  glassForm: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  label: { fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: 16 },
  area: { minHeight: 120, textAlignVertical: 'top' },
  drop: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { color: '#000', fontSize: 17, fontWeight: '600' },
  modalRoot: { flex: 1 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  modalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalSheet: {
    maxHeight: 360,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalScroll: { maxHeight: 360 },
  modalRow: { paddingVertical: 14, paddingHorizontal: Spacing.lg },
});
