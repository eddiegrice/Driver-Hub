import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCasework } from '@/context/CaseworkContext';
import { scrollContentGutter } from '@/constants/scrollLayout';
import { NeoGlass, Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { CaseworkType } from '@/types/casework';
import { CASEWORK_TYPES } from '@/types/casework';

const SUBMIT_CYAN = '#00CCFF';

type PendingAtt = { uri: string; name?: string; mimeType?: string };

function NewCaseworkInner() {
  const router = useRouter();
  const { createTicket, remoteReady } = useCasework();
  const [type, setType] = useState<CaseworkType>(CASEWORK_TYPES[0]);
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<PendingAtt[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pageBg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const surfaceColor = useThemeColor({}, 'surface');
  const mutedColor = useThemeColor({}, 'textMuted');
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');
  const modalSheetBg = useThemeColor({ light: '#f1f5f9', dark: '#14161c' }, 'surface');

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    const next: PendingAtt[] = result.assets.map((a) => ({
      uri: a.uri,
      name: a.fileName ?? undefined,
      mimeType: a.mimeType ?? 'image/jpeg',
    }));
    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const next: PendingAtt[] = result.assets.map((a) => ({
      uri: a.uri,
      name: a.name ?? undefined,
      mimeType: a.mimeType ?? undefined,
    }));
    setAttachments((prev) => [...prev, ...next]);
  }, []);

  const removeAttachment = useCallback((uri: string) => {
    setAttachments((prev) => prev.filter((a) => a.uri !== uri));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!remoteReady) {
      Alert.alert('Unavailable', 'Sign in with Supabase configured to use casework.');
      return;
    }
    const subjectTrim = subject.trim();
    if (!subjectTrim) {
      Alert.alert('Subject required', 'Please enter a subject for your request.');
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('Message required', 'Please enter your message.');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({
        type,
        subject: subjectTrim,
        message: trimmed,
        attachments,
      });
      if (!ticket) {
        Alert.alert('Error', 'Could not create request. Try again.');
        return;
      }
      router.replace(`/casework/${ticket.id}`);
    } finally {
      setSubmitting(false);
    }
  }, [type, subject, message, attachments, createTicket, router, remoteReady]);

  return (
    <View style={[styles.screen, { backgroundColor: pageBg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={scrollContentGutter}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ThemedView style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back to list</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">New Casework Request</ThemedText>

          <ThemedView style={[styles.glassForm, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
            <ThemedText style={styles.label}>Type of support</ThemedText>
            <Pressable
              onPress={() => setTypeMenuOpen(true)}
              style={[styles.dropdown, { borderColor, backgroundColor: surfaceColor }]}>
              <ThemedText style={{ color: textColor }}>{type}</ThemedText>
              <ThemedText style={{ color: mutedColor }}>▼</ThemedText>
            </Pressable>

            <ThemedText style={styles.label}>Subject *</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: surfaceColor, borderColor }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="Short summary"
              placeholderTextColor={mutedColor}
            />

            <ThemedText style={styles.label}>Message *</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea, { color: textColor, backgroundColor: surfaceColor, borderColor }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue or question..."
              placeholderTextColor={mutedColor}
              multiline
              numberOfLines={4}
            />

            <ThemedText style={styles.label}>Attachments</ThemedText>
            <View style={styles.attachRow}>
              <TouchableOpacity style={[styles.attachBtn, { borderColor }]} onPress={pickImage}>
                <ThemedText style={styles.attachBtnText}>Photos</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.attachBtn, { borderColor }]} onPress={pickDocument}>
                <ThemedText style={styles.attachBtnText}>Documents</ThemedText>
              </TouchableOpacity>
            </View>
            {attachments.length > 0 && (
              <ThemedView style={styles.thumbs}>
                {attachments.map((a) => (
                  <ThemedView key={a.uri} style={styles.thumbWrap}>
                    {a.mimeType?.startsWith('image/') ? (
                      <Image source={{ uri: a.uri }} style={styles.thumb} />
                    ) : (
                      <View style={[styles.thumb, styles.docThumb]}>
                        <ThemedText style={styles.docThumbText} numberOfLines={2}>
                          {a.name ?? 'File'}
                        </ThemedText>
                      </View>
                    )}
                    <TouchableOpacity style={styles.removeThumb} onPress={() => removeAttachment(a.uri)}>
                      <ThemedText style={styles.removeThumbText}>×</ThemedText>
                    </TouchableOpacity>
                  </ThemedView>
                ))}
              </ThemedView>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: SUBMIT_CYAN }, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}>
              <ThemedText style={styles.submitBtnText}>{submitting ? 'Sending…' : 'Send request'}</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      </ScrollView>

      <Modal visible={typeMenuOpen} transparent animationType="fade" onRequestClose={() => setTypeMenuOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTypeMenuOpen(false)} />
          <View style={styles.modalCenter} pointerEvents="box-none">
            <View style={[styles.modalSheet, { backgroundColor: modalSheetBg, borderColor: NeoGlass.cardBorder }]}>
              <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                {CASEWORK_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setType(t);
                      setTypeMenuOpen(false);
                    }}
                    style={styles.modalRow}>
                    <ThemedText style={{ color: textColor }}>{t}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function NewCaseworkScreen() {
  return (
    <AssociationMembershipGate title="Casework and Support">
      <NewCaseworkInner />
    </AssociationMembershipGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  container: { gap: 16 },
  backRow: { marginBottom: 4 },
  glassForm: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 4,
  },
  label: { fontSize: 14, fontWeight: '600', marginTop: 12 },
  dropdown: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  modalRoot: {
    flex: 1,
  },
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
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 17,
    marginTop: 6,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  attachBtn: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  attachBtnText: { opacity: 0.85 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  docThumb: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  docThumbText: { fontSize: 10, textAlign: 'center' },
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
    marginTop: 20,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { color: '#000', fontSize: 17, fontWeight: '600' },
});
