```tsx
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

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useCasework } from '@/context/CaseworkContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Radius, Spacing } from '@/constants/theme';
import type { CaseworkType } from '@/types/casework';
import { CASEWORK_TYPES } from '@/types/casework';

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

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const surfaceColor = useThemeColor({}, 'surface');
  const tintColor = useThemeColor({}, 'tint');
  const mutedColor = useThemeColor({}, 'textMuted');

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
    if (result.canceled) return;
    const assets = 'assets' in result && result.assets ? result.assets : [result];
    const next: PendingAtt[] = assets.map((a: { uri: string; name?: string; mimeType?: string }) => ({
      uri: a.uri,
      name: a.name,
      mimeType: a.mimeType,
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
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('Message required', 'Please enter your message.');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({
        type,
        subject: subject.trim(),
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
    <ParallaxScrollView headerBackgroundColor={{ light: '#F8FAFC', dark: '#0F172A' }} headerImage={null}>
      <ThemedView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ThemedText type="link">← Back to list</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title">New request</ThemedText>
        <ThemedText style={styles.helperText}>
          Your profile is stored on your membership record; staff can see it when handling your case.
        </ThemedText>

        <ThemedText style={styles.label}>Type of support</ThemedText>
        <Pressable
          onPress={() => setTypeMenuOpen(true)}
          style={[styles.dropdown, { borderColor, backgroundColor: surfaceColor }]}>
          <ThemedText style={{ color: textColor }}>{type}</ThemedText>
          <ThemedText style={{ color: mutedColor }}>▼</ThemedText>
        </Pressable>

        <Modal visible={typeMenuOpen} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setTypeMenuOpen(false)}>
            <ThemedView style={[styles.modalSheet, { backgroundColor: surfaceColor, borderColor }]}>
              <ScrollView style={styles.modalScroll}>
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
            </ThemedView>
          </Pressable>
        </Modal>

        <ThemedText style={styles.label}>Subject (optional)</ThemedText>
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

        <ThemedText style={styles.label}>Attachments (photos or documents)</ThemedText>
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

        <PrimaryButton
          title={submitting ? 'Sending…' : 'Send request'}
          onPress={handleSubmit}
          disabled={submitting}
          fullWidth
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

export default function NewCaseworkScreen() {
  return (
    <AssociationMembershipGate title="Casework">
      <NewCaseworkInner />
    </AssociationMembershipGate>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  backRow: { marginBottom: 4 },
  helperText: { opacity: 0.8 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  dropdown: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.xl,
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
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row', gap: 12 },
  attachBtn: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  attachBtnText: { opacity: 0.85 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
});
```
