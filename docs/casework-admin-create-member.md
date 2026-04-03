```tsx
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useCasework } from '@/context/CaseworkContext';
import { searchMembersByName } from '@/lib/casework-supabase';
import { supabase } from '@/lib/supabase';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Radius, Spacing } from '@/constants/theme';
import type { CaseworkType } from '@/types/casework';
import { CASEWORK_TYPES } from '@/types/casework';

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

  const runSearch = useCallback(async () => {
    if (!supabase) return;
    const { rows, error } = await searchMembersByName(supabase, search);
    if (error) Alert.alert('Search failed', error.message);
    else setResults(rows);
  }, [search]);

  const pickImg = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (r.canceled || !r.assets?.length) return;
    setAttachments((p) => [
      ...p,
      ...r.assets!.map((a) => ({ uri: a.uri, name: a.fileName, mimeType: a.mimeType ?? 'image/jpeg' })),
    ]);
  }, []);

  const pickDoc = useCallback(async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    if (r.canceled) return;
    const assets =
      'assets' in r && Array.isArray(r.assets)
        ? r.assets
        : [{ uri: (r as { uri?: string }).uri!, name: (r as { name?: string }).name, mimeType: (r as { mimeType?: string }).mimeType }];
    setAttachments((p) => [...p, ...assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }))]);
  }, []);

  const submit = useCallback(async () => {
    if (!selected) {
      Alert.alert('Member required', 'Search and select a member.');
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
        subject: subject.trim(),
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
    <AdminSubpageScaffold subsystemTitle="Case for member" backLabel="← Casework" onBackPress={() => router.back()}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
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
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable style={styles.resRow} onPress={() => setSelected({ id: item.id, name: item.name })}>
                <ThemedText style={{ color: textColor }}>
                  {item.name} · {item.badgeNumber}
                </ThemedText>
              </Pressable>
            )}
          />
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
          <>
            <ThemedText style={styles.label}>Type</ThemedText>
            <Pressable
              onPress={() => setTypeOpen(true)}
              style={[styles.drop, { borderColor, backgroundColor: surfaceColor }]}>
              <ThemedText style={{ color: textColor }}>{type}</ThemedText>
            </Pressable>
            <Modal visible={typeOpen} transparent animationType="fade">
              <Pressable style={styles.modalBg} onPress={() => setTypeOpen(false)}>
                <ThemedView style={[styles.sheet, { backgroundColor: surfaceColor, borderColor }]}>
                  <ScrollView>
                    {CASEWORK_TYPES.map((t) => (
                      <Pressable
                        key={t}
                        style={styles.row}
                        onPress={() => {
                          setType(t);
                          setTypeOpen(false);
                        }}>
                        <ThemedText style={{ color: textColor }}>{t}</ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                </ThemedView>
              </Pressable>
            </Modal>

            <ThemedText style={styles.label}>Subject (optional)</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor, backgroundColor: surfaceColor }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Summary"
              placeholderTextColor={muted}
            />

            <ThemedText style={styles.label}>Opening message *</ThemedText>
            <TextInput
              style={[styles.input, styles.area, { color: textColor, borderColor, backgroundColor: surfaceColor }]}
              value={message}
              onChangeText={setMessage}
              multiline
              placeholder="What the member should see first…"
              placeholderTextColor={muted}
            />

            <View style={styles.attachRow}>
              <TouchableOpacity onPress={pickImg} style={styles.mini}>
                <ThemedText>+ Photo</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickDoc} style={styles.mini}>
                <ThemedText>+ Doc</ThemedText>
              </TouchableOpacity>
            </View>
            <View style={styles.thumbs}>
              {attachments.map((a) =>
                a.mimeType?.startsWith('image/') ? (
                  <Image key={a.uri} source={{ uri: a.uri }} style={styles.thumb} />
                ) : (
                  <View key={a.uri} style={[styles.thumb, styles.doc]}>
                    <ThemedText style={styles.docT} numberOfLines={2}>
                      {a.name}
                    </ThemedText>
                  </View>
                )
              )}
            </View>

            <PrimaryButton title={submitting ? 'Creating…' : 'Create case'} onPress={submit} disabled={submitting} fullWidth />
          </>
        ) : null}
      </ScrollView>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing.xxl, gap: Spacing.md },
  label: { fontWeight: '600', marginTop: Spacing.sm },
  searchRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  flex: { flex: 1 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, fontSize: 16 },
  area: { minHeight: 100, textAlignVertical: 'top' },
  searchBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: '#00CCFF' },
  searchBtnT: { color: '#0a1628', fontWeight: '700' },
  list: { maxHeight: 200, marginTop: Spacing.sm },
  resRow: { paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.15)' },
  selected: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  drop: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl },
  sheet: { maxHeight: 400, borderRadius: Radius.lg, borderWidth: 1 },
  row: { paddingVertical: 14, paddingHorizontal: Spacing.lg },
  attachRow: { flexDirection: 'row', gap: 10 },
  mini: { padding: Spacing.sm, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: 6 },
  doc: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', padding: 2 },
  docT: { fontSize: 9, textAlign: 'center' },
});
```
