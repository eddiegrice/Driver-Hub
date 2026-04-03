import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import {
  Alert,
  Image,
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
import { NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { isClosedStatus, statusLabel } from '@/types/casework';
import { formatDateForDisplay } from '@/types/member';

const SUBMIT_CYAN = '#00CCFF';
/** Traffic-style data tiles (incidents list cards). */
const THREAD_BUBBLE_BORDER = 'rgba(140, 180, 255, 0.7)';
const THREAD_BUBBLE_BG = 'rgba(40, 80, 200, 0.18)';

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

  const pageBg = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');
  const replyInputBg = useThemeColor(
    { light: 'rgba(15, 23, 42, 0.07)', dark: 'rgba(255, 255, 255, 0.1)' },
    'background'
  );

  const removeReplyAttachment = useCallback((uri: string) => {
    setReplyAttachments((prev) => prev.filter((a) => a.uri !== uri));
  }, []);

  const pickReplyImage = useCallback(async () => {
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
    setReplyAttachments((prev) => [
      ...prev,
      ...result.assets!.map((a) => ({
        uri: a.uri,
        name: a.fileName != null ? a.fileName : undefined,
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
      ...assets.map((a) => ({
        uri: a.uri,
        name: a.name != null ? a.name : undefined,
        mimeType: a.mimeType != null ? a.mimeType : undefined,
      })),
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

  const shell = (children: ReactNode) => (
    <View style={[styles.screen, { backgroundColor: pageBg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={scrollContentGutter}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );

  if (!id || !ticket) {
    return shell(
      <ThemedView style={styles.container}>
        <ThemedText>Request not found.</ThemedText>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText type="link">Go back</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const messages = ticket.messages ?? [];
  const closed = isClosedStatus(ticket.status);

  return shell(
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
        <ThemedText type="link">← Back to list</ThemedText>
      </TouchableOpacity>

      <ThemedView style={[styles.headerCard, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
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
      <View style={styles.thread}>
        {messages.length === 0 ? (
          <ThemedText style={styles.emptyThread}>No messages yet.</ThemedText>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                styles.bubbleTraffic,
                msg.sender === 'member' ? styles.bubbleMember : styles.bubbleAdmin,
              ]}>
              <ThemedText style={styles.bubbleText} selectable>
                {msg.text}
              </ThemedText>
              <ThemedText style={styles.bubbleMeta}>
                {msg.sender === 'member' ? 'You' : 'Club'} ·{' '}
                {formatDateForDisplay(msg.createdAt.slice(0, 10))} {msg.createdAt.slice(11, 16)}
              </ThemedText>
            </View>
          ))
        )}
      </View>

      {!closed ? (
        <ThemedView style={[styles.glassForm, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
          <TextInput
            style={[
              styles.input,
              { color: textColor, backgroundColor: replyInputBg, borderColor: NeoGlass.cardBorder },
            ]}
            value={reply}
            onChangeText={setReply}
            placeholder="Type your message..."
            placeholderTextColor={NeoText.muted}
            multiline
          />
          <View style={styles.attachRow}>
            <TouchableOpacity style={[styles.attachBtn, { borderColor }]} onPress={pickReplyImage}>
              <ThemedText style={styles.attachBtnText}>Add Photos</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.attachBtn, { borderColor }]} onPress={pickReplyDoc}>
              <ThemedText style={styles.attachBtnText}>Add Documents</ThemedText>
            </TouchableOpacity>
          </View>
          {replyAttachments.length > 0 ? (
            <ThemedView style={styles.pendingThumbs}>
              {replyAttachments.map((a) => (
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
                  <TouchableOpacity style={styles.removeThumb} onPress={() => removeReplyAttachment(a.uri)}>
                    <ThemedText style={styles.removeThumbText}>×</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ))}
            </ThemedView>
          ) : null}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: SUBMIT_CYAN }, sending && styles.sendButtonDisabled]}
            onPress={handleSendReply}
            disabled={sending || (!reply.trim() && replyAttachments.length === 0)}
            activeOpacity={0.85}>
            <ThemedText style={styles.sendButtonText}>{sending ? 'Sending…' : 'Send'}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <ThemedText style={styles.meta}>This case is closed. Contact the office if you need to reopen it.</ThemedText>
      )}

      {ticket.attachments && ticket.attachments.length > 0 ? (
        <ThemedView style={[styles.attachmentsGlass, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
          <ThemedText type="subtitle">Attachments</ThemedText>
          <View style={styles.caseThumbs}>
            {ticket.attachments.map((a) => (
              <Pressable key={a.id} onPress={() => openAttachment(a.uri)}>
                {a.mimeType?.startsWith('image/') && a.uri ? (
                  <Image source={{ uri: a.uri }} style={styles.caseThumb} />
                ) : (
                  <View style={[styles.caseThumb, styles.caseDocThumb]}>
                    <ThemedText style={styles.caseDocLabel} numberOfLines={2}>
                      {a.name ?? 'Open file'}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        </ThemedView>
      ) : null}

      {!closed && !ticket.closureRequested ? (
        <TouchableOpacity
          onPress={handleRequestClosure}
          disabled={closureSubmitting}
          style={styles.closureLinkWrap}
          hitSlop={12}>
          <ThemedText type="link" style={styles.closureLink}>
            {closureSubmitting ? 'Sending…' : 'Request case closure'}
          </ThemedText>
        </TouchableOpacity>
      ) : null}
    </ThemedView>
  );
}

export default function CaseworkDetailScreen() {
  return (
    <AssociationMembershipGate title="Casework and Support">
      <CaseworkDetailInner />
    </AssociationMembershipGate>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  container: { gap: 16 },
  backRow: { marginBottom: 8 },
  headerCard: {
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 4,
  },
  subject: { opacity: 0.9 },
  meta: { fontSize: 14, opacity: 0.7 },
  banner: { marginTop: 8, fontSize: 13, opacity: 0.9 },
  thread: { gap: 12, minHeight: 80 },
  emptyThread: { opacity: 0.7 },
  bubble: { padding: 12, maxWidth: '85%' },
  bubbleTraffic: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: THREAD_BUBBLE_BORDER,
    backgroundColor: THREAD_BUBBLE_BG,
  },
  bubbleMember: { alignSelf: 'flex-end' },
  bubbleAdmin: { alignSelf: 'flex-start' },
  bubbleText: { fontSize: 15 },
  bubbleMeta: { fontSize: 12, color: NeoText.muted, marginTop: 4 },
  glassForm: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  attachRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
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
  sendButton: {
    marginTop: Spacing.lg,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.55 },
  sendButtonText: { fontWeight: '600', fontSize: 16, color: '#000' },
  closureLinkWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  closureLink: { fontSize: 15 },
  attachmentsGlass: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  caseThumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caseThumb: { width: 80, height: 80, borderRadius: 8 },
  caseDocThumb: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  caseDocLabel: { fontSize: 11, textAlign: 'center' },
});
