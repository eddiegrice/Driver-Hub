```tsx
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { isClosedStatus, statusLabel } from '@/types/casework';
import { formatDateForDisplay } from '@/types/member';

function CaseworkDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTicket, addReply, requestClosure, refreshTickets } = useCasework();
  const ticket = id ? getTicket(id) : undefined;
  const [reply, setReply] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<{ uri: string; name?: string; mimeType?: string }[]>(
    []
  );
  const [sending, setSending] = useState(false);
  const [closureSubmitting, setClosureSubmitting] = useState(false);

  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');
  const buttonBg = useThemeColor({}, 'tint');
  const buttonTextColor = colorScheme === 'dark' ? '#111' : '#fff';
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');

  const pickReplyImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;
    setReplyAttachments((prev) => [
      ...prev,
      ...result.assets!.map((a) => ({
        uri: a.uri,
        name: a.fileName,
        mimeType: a.mimeType ?? 'image/jpeg',
      })),
    ]);
  }, []);

  const pickReplyDoc = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const assets =
      'assets' in result && Array.isArray(result.assets)
        ? result.assets
        : [{ uri: (result as { uri?: string }).uri!, name: (result as { name?: string }).name, mimeType: (result as { mimeType?: string }).mimeType }];
    setReplyAttachments((prev) => [
      ...prev,
      ...assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType })),
    ]);
  }, []);

  const handleSendReply = useCallback(async () => {
    if (!id) return;
    const text = reply.trim();
    if (!text && replyAttachments.length === 0) return;
    setSending(true);
    try {
      const { error } = await addReply(id, text, replyAttachments);
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      setReply('');
      setReplyAttachments([]);
      await refreshTickets();
    } finally {
      setSending(false);
    }
  }, [id, reply, replyAttachments, addReply, refreshTickets]);

  const handleRequestClosure = useCallback(async () => {
    if (!id) return;
    setClosureSubmitting(true);
    try {
      const { error } = await requestClosure(id);
      if (error) Alert.alert('Error', error.message);
      else Alert.alert('Requested', 'The team has been asked to close this case when appropriate.');
    } finally {
      setClosureSubmitting(false);
    }
  }, [id, requestClosure]);

  const openAttachment = useCallback(async (uri: string) => {
    if (!uri) return;
    await WebBrowser.openBrowserAsync(uri);
  }, []);

  if (!id || !ticket) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
        <ThemedView style={styles.container}>
          <ThemedText>Request not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText type="link">Go back</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  const messages = ticket.messages ?? [];
  const closed = isClosedStatus(ticket.status);

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
      <ThemedView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ThemedText type="link">← Back to list</ThemedText>
        </TouchableOpacity>

        <ThemedView style={[styles.card, { backgroundColor: cardBg }]}>
          <ThemedText type="defaultSemiBold">{ticket.type}</ThemedText>
          <ThemedText style={styles.subject}>{ticket.subject}</ThemedText>
          <ThemedText style={styles.meta}>
            {statusLabel(ticket.status)} · {formatDateForDisplay(ticket.createdAt.slice(0, 10))}
          </ThemedText>
          {ticket.closureRequested ? (
            <ThemedText style={styles.banner}>Closure requested — waiting for staff.</ThemedText>
          ) : null}
        </ThemedView>

        <ThemedText type="subtitle">Conversation</ThemedText>
        <ThemedView style={styles.thread}>
          {messages.length === 0 ? (
            <ThemedText style={styles.emptyThread}>No messages yet.</ThemedText>
          ) : (
            messages.map((msg) => (
              <ThemedView
                key={msg.id}
                style={[
                  styles.bubble,
                  msg.sender === 'member' ? styles.bubbleMember : styles.bubbleAdmin,
                  { backgroundColor: msg.sender === 'member' ? buttonBg : cardBg },
                ]}>
                <ThemedText
                  style={[styles.bubbleText, msg.sender === 'member' && { color: buttonTextColor }]}
                  selectable>
                  {msg.text}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.bubbleMeta,
                    msg.sender === 'member' && { color: buttonTextColor, opacity: 0.8 },
                  ]}>
                  {msg.sender === 'member' ? 'You' : 'Club'} ·{' '}
                  {formatDateForDisplay(msg.createdAt.slice(0, 10))} {msg.createdAt.slice(11, 16)}
                </ThemedText>
              </ThemedView>
            ))
          )}
        </ThemedView>

        {ticket.attachments && ticket.attachments.length > 0 ? (
          <>
            <ThemedText type="subtitle" style={styles.attachmentsTitle}>
              Attachments
            </ThemedText>
            <ThemedView style={styles.thumbs}>
              {ticket.attachments.map((a) => (
                <Pressable key={a.id} onPress={() => openAttachment(a.uri)}>
                  {a.mimeType?.startsWith('image/') && a.uri ? (
                    <Image source={{ uri: a.uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.docThumb]}>
                      <ThemedText style={styles.docLabel} numberOfLines={2}>
                        {a.name ?? 'Open file'}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              ))}
            </ThemedView>
          </>
        ) : null}

        {!closed ? (
          <>
            <ThemedText style={styles.replyLabel}>Add a reply</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor, borderColor }]}
              value={reply}
              onChangeText={setReply}
              placeholder="Type your message..."
              placeholderTextColor={borderColor}
              multiline
            />
            <View style={styles.replyAttachRow}>
              <TouchableOpacity onPress={pickReplyImage} style={styles.smallAttach}>
                <ThemedText style={styles.smallAttachText}>+ Photo</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickReplyDoc} style={styles.smallAttach}>
                <ThemedText style={styles.smallAttachText}>+ Document</ThemedText>
              </TouchableOpacity>
            </View>
            {replyAttachments.length > 0 ? (
              <ThemedText style={styles.meta}>{replyAttachments.length} file(s) attached to next send</ThemedText>
            ) : null}
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: buttonBg }]}
              onPress={handleSendReply}
              disabled={sending || (!reply.trim() && replyAttachments.length === 0)}>
              <ThemedText style={[styles.sendButtonText, { color: buttonTextColor }]}>
                {sending ? 'Sending…' : 'Send'}
              </ThemedText>
            </TouchableOpacity>

            {!ticket.closureRequested ? (
              <PrimaryButton
                title={closureSubmitting ? 'Sending…' : 'Request case closure'}
                onPress={handleRequestClosure}
                disabled={closureSubmitting}
                fullWidth
              />
            ) : null}
          </>
        ) : (
          <ThemedText style={styles.meta}>This case is closed. Contact the office if you need to reopen it.</ThemedText>
        )}
      </ThemedView>
    </ParallaxScrollView>
  );
}

export default function CaseworkDetailScreen() {
  return (
    <AssociationMembershipGate title="Casework">
      <CaseworkDetailInner />
    </AssociationMembershipGate>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  backRow: { marginBottom: 8 },
  card: { padding: 16, borderRadius: 12, gap: 4 },
  subject: { opacity: 0.9 },
  meta: { fontSize: 14, opacity: 0.7 },
  banner: { marginTop: 8, fontSize: 13, opacity: 0.9 },
  thread: { gap: 12, minHeight: 80 },
  emptyThread: { opacity: 0.7 },
  bubble: { padding: 12, borderRadius: 12, maxWidth: '85%', alignSelf: 'flex-start' },
  bubbleMember: { alignSelf: 'flex-end' },
  bubbleAdmin: { alignSelf: 'flex-start' },
  bubbleText: { fontSize: 15 },
  bubbleMeta: { fontSize: 12, opacity: 0.7, marginTop: 4 },
  replyLabel: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  replyAttachRow: { flexDirection: 'row', gap: 10 },
  smallAttach: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  smallAttachText: { fontSize: 13 },
  sendButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  sendButtonText: { fontWeight: '600', fontSize: 16 },
  attachmentsTitle: { marginTop: 16 },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 80, height: 80, borderRadius: 8 },
  docThumb: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  docLabel: { fontSize: 11, textAlign: 'center' },
});
```
