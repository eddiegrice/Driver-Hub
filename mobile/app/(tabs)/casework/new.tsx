import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { useCasework } from '@/context/CaseworkContext';
import { useMember } from '@/context/MemberContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Radius, Spacing } from '@/constants/theme';
import type { CaseworkAttachment, CaseworkType } from '@/types/casework';
import { CASEWORK_TYPES } from '@/types/casework';

function NewCaseworkInner() {
  const router = useRouter();
  const { member } = useMember();
  const { createTicket } = useCasework();
  const [type, setType] = useState<CaseworkType>(CASEWORK_TYPES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<CaseworkAttachment[]>([]);
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
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const newAttachments: CaseworkAttachment[] = result.assets.map((a, i) => ({
      id: `att-${Date.now()}-${i}`,
      uri: a.uri,
      name: a.fileName ?? undefined,
      mimeType: a.mimeType ?? undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleSubmit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('Message required', 'Please enter your message.');
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createTicket({
        memberSnapshot: { ...member },
        type,
        subject: subject.trim() || type,
        status: 'sent_pending',
        messages: [
          {
            id: `msg-${Date.now()}`,
            ticketId: '',
            sender: 'member',
            text: trimmed,
            createdAt: new Date().toISOString(),
          },
        ],
        attachments,
      });
      router.replace(`/casework/${ticket.id}`);
    } catch {
      Alert.alert('Error', 'Could not create request. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [type, subject, message, attachments, member, createTicket, router]);

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#F8FAFC', dark: '#0F172A' }} headerImage={null}>
      <ThemedView style={styles.container}>
        <ThemedText type="title">New request</ThemedText>
        <ThemedText style={styles.helperText}>
          Your profile details will be sent with this request so we can help you quickly.
        </ThemedText>

        <ThemedText style={styles.label}>Type of support</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
          {CASEWORK_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, type === t && { backgroundColor: tintColor }]}
              onPress={() => setType(t)}>
              <ThemedText style={[styles.typeChipText, type === t && { color: '#FFFFFF' }]}>
                {t}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

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

        <ThemedText style={styles.label}>Attach photos</ThemedText>
        <TouchableOpacity style={[styles.attachButton, { borderColor }]} onPress={pickImage}>
          <ThemedText style={styles.attachButtonText}>+ Add photo(s)</ThemedText>
        </TouchableOpacity>
        {attachments.length > 0 && (
          <ThemedView style={styles.thumbs}>
            {attachments.map((a) => (
              <ThemedView key={a.id} style={styles.thumbWrap}>
                <Image source={{ uri: a.uri }} style={styles.thumb} />
                <TouchableOpacity
                  style={styles.removeThumb}
                  onPress={() => removeAttachment(a.id)}>
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
  container: {
    gap: 16,
  },
  helperText: {
    opacity: 0.8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  typeRow: {
    marginHorizontal: -Spacing.xxxl,
    paddingHorizontal: Spacing.xxxl,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  typeChipText: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: 17,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  attachButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  attachButtonText: {
    opacity: 0.8,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
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
  removeThumbText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
  },
});
