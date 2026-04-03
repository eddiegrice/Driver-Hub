import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCasework } from '@/context/CaseworkContext';
import { searchMembersByName } from '@/lib/casework-supabase';
import { supabase } from '@/lib/supabase';
import { useThemeColor } from '@/hooks/use-theme-color';
import { NeoGlass, Radius, Spacing } from '@/constants/theme';
import type { CaseworkType } from '@/types/casework';
import { CASEWORK_TYPES } from '@/types/casework';

const SUBMIT_CYAN = '#00CCFF';

export default function AdminCreateMemberCaseScreen() {
  const router = useRouter();
  const { createCaseForMember } = useCasework();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<{ id: string; name: string; badgeNumber: string }[]>([]);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const [type, setType] = useState<CaseworkType>(CASEWORK_TYPES[0]);
  const [typeOpen, setTypeOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<{ uri: string; name?: string; mimeType?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const surfaceColor = useThemeColor({}, 'surface');
  const muted = useThemeColor({}, 'textMuted');
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');
  const modalSheetBg = useThemeColor({ light: '#f1f5f9', dark: '#14161c' }, 'surface');

  const runSearch = useCallback(async () => {
    if (!supabase) return;
    const { rows, error } = await searchMembersByName(supabase, search);
    if (error) Alert.alert('Search failed', error.message);
    else setResults(rows);
  }, [search]);

  const removeAttachment = useCallback((uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
  }, []);

  const pickImg = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to attach images.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (r.canceled || !r.assets?.length) return;
    setAttachments((p) => [
      ...p,
      ...r.assets!.map((a) => ({
        uri: a.uri,
        name: a.fileName != null ? a.fileName : undefined,
        mimeType: a.mimeType ?? 'image/jpeg',
      })),
    ]);
  }, []);

  const pickDoc = useCallback(async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    if (r.canceled) return;
    const assets =
      'assets' in r && Array.isArray(r.assets)
        ? r.assets
        : [{ uri: (r as { uri?: string }).uri!, name: (r as { name?: string }).name, mimeType: (r as { mimeType?: string }).mimeType }];
    setAttachments((p) => [
      ...p,
      ...assets.map((a) => ({
        uri: a.uri,
        name: a.name != null ? a.name : undefined,
        mimeType: a.mimeType != null ? a.mimeType : undefined,
      })),
    ]);
  }, []);

  const submit = useCallback(async () => {
    if (!selected) {
      Alert.alert('Member required', 'Search and select a member.');
      return;
    }
    const subj = subject.trim();
    if (!subj) {
      Alert.alert('Subject required', 'Please enter a subject for this case.');
      return;
    }
    const msg = message.trim();
    if (!msg) {
      Alert.alert('Message required', 'Enter an opening message for the case.');
      return;
    }
    setSubmitting(true);
    try {
      const t = await createCaseForMember(selected.id, {
        type,
        subject: subj,
        message: msg,
        attachments,
      });
      if (!t) Alert.alert('Error', 'Could not create case.');
      else router.replace(`/admin/casework/${t.id}` as Href);
    } finally {
      setSubmitting(false);
    }
  }, [selected, type, subject, message, attachments, createCaseForMember, router]);

  return (
    <AdminSubpageScaffold
      subsystemTitle="Case for member"
      backLabel="← Casework"
      onBackPress={() => router.back()}
      keyboardShouldPersistTaps="handled">
      <View style={styles.page}>
        <ThemedText style={styles.label}>Find member by name</ThemedText>
        <View style={styles.searchRow}>
          <TextInput
            style={[styles.input, styles.flex, { color: textColor, borderColor, backgroundColor: surfaceColor }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Name…"
            placeholderTextColor={muted}
          />
          <TouchableOpacity onPress={runSearch} style={styles.searchBtn}>
            <ThemedText style={styles.searchBtnT}>Search</ThemedText>
          </TouchableOpacity>
        </View>

        {results.length > 0 && !selected ? (
          <View style={styles.resultsBlock}>
            {results.map((item) => (
              <Pressable
                key={item.id}
                style={styles.resRow}
                onPress={() => setSelected({ id: item.id, name: item.name })}>
                <ThemedText style={{ color: textColor }}>
                  {item.name} · {item.badgeNumber}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selected ? (
          <ThemedView style={styles.selected}>
            <ThemedText type="defaultSemiBold">Selected: {selected.name}</ThemedText>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <ThemedText type="link">Change</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : null}

        {selected ? (
          <ThemedView style={[styles.glassForm, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
            <ThemedText style={styles.labelFlat}>Type</ThemedText>
            <Pressable
              onPress={() => setTypeOpen(true)}
              style={[styles.drop, { borderColor, backgroundColor: surfaceColor }]}>
              <ThemedText style={{ color: textColor }}>{type}</ThemedText>
              <ThemedText style={{ color: muted }}>▼</ThemedText>
            </Pressable>

            <ThemedText style={styles.labelFlat}>Subject *</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor, backgroundColor: surfaceColor }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary"
              placeholderTextColor={muted}
            />

            <ThemedText style={styles.labelFlat}>Opening message *</ThemedText>
            <TextInput
              style={[styles.input, styles.area, { color: textColor, borderColor, backgroundColor: surfaceColor }]}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="What the member should see first…"
              placeholderTextColor={muted}
            />

            <View style={styles.attachRow}>
              <TouchableOpacity style={[styles.attachBtn, { borderColor }]} onPress={pickImg}>
                <ThemedText style={styles.attachBtnText}>Add Photos</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.attachBtn, { borderColor }]} onPress={pickDoc}>
                <ThemedText style={styles.attachBtnText}>Add Documents</ThemedText>
              </TouchableOpacity>
            </View>
            {attachments.length > 0 ? (
              <View style={styles.pendingThumbs}>
                {attachments.map((a) => (
                  <ThemedView key={a.uri} style={styles.pendingThumbWrap}>
                    {a.mimeType?.startsWith('image/') ? (
                      <Image source={{ uri: a.uri }} style={styles.pendingThumb} />
                    ) : (
                      <View style={[styles.pendingThumb, styles.pendingDocThumb]}>
                        <ThemedText style={styles.pendingDocThumbText} numberOfLines={2}>
                          {a.name ?? 'File'}
                        </ThemedText>
                      </View>
                    )}
                    <TouchableOpacity style={styles.removeThumb} onPress={() => removeAttachment(a.uri)}>
                      <ThemedText style={styles.removeThumbText}>×</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                ))}
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: SUBMIT_CYAN }, submitting && styles.submitBtnDisabled]}
              onPress={submit}
              disabled={submitting}
              activeOpacity={0.85}>
              <ThemedText style={styles.submitBtnText}>{submitting ? 'Creating…' : 'Create case'}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        ) : null}
      </View>

      <Modal visible={typeOpen} transparent animationType="fade" onRequestClose={() => setTypeOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTypeOpen(false)} />
          <View style={styles.modalCenter} pointerEvents="box-none">
            <View style={[styles.modalSheet, { backgroundColor: modalSheetBg, borderColor: NeoGlass.cardBorder }]}>
              {CASEWORK_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={styles.modalRow}
                  onPress={() => {
                    setType(t);
                    setTypeOpen(false);
                  }}>
                  <ThemedText style={{ color: textColor }}>{t}</ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  page: { paddingBottom: Spacing.xxl, gap: Spacing.md },
  label: { fontWeight: '600', marginTop: Spacing.sm },
  labelFlat: { fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: 16 },
  area: { minHeight: 100, textAlignVertical: 'top' },
  searchBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: SUBMIT_CYAN },
  searchBtnT: { color: '#0a1628', fontWeight: '700' },
  resultsBlock: { marginTop: Spacing.sm, gap: 0 },
  resRow: { paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  selected: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  glassForm: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  drop: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attachRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  attachBtn: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  attachBtnText: { opacity: 0.85 },
  pendingThumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pendingThumbWrap: { position: 'relative' },
  pendingThumb: { width: 72, height: 72, borderRadius: 8 },
  pendingDocThumb: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  pendingDocThumbText: { fontSize: 10, textAlign: 'center' },
  removeThumb: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeThumbText: { color: '#fff', fontSize: 18, lineHeight: 20 },
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
    maxHeight: 400,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalRow: { paddingVertical: 14, paddingHorizontal: Spacing.lg },
});
