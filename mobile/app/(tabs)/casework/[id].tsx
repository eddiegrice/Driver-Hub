import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { useCasework } from '@/context/CaseworkContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { statusLabel } from '@/types/casework';
import { formatDateForDisplay } from '@/types/member';

function CaseworkDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTicket, addMessage } = useCasework();
  const ticket = id ? getTicket(id) : undefined;
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');
  const buttonBg = useThemeColor({}, 'tint');
  const buttonTextColor = colorScheme === 'dark' ? '#111' : '#fff';
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');

  const handleSendReply = useCallback(async () => {
    const text = reply.trim();
    if (!text || !id) return;
    setSending(true);
    try {
      await addMessage(id, 'member', text);
      setReply('');
    } finally {
      setSending(false);
    }
  }, [id, reply, addMessage]);

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
                  style={[
                    styles.bubbleText,
                    msg.sender === 'member' && { color: buttonTextColor },
                  ]}
                  selectable>
                  {msg.text}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.bubbleMeta,
                    msg.sender === 'member' && { color: buttonTextColor, opacity: 0.8 },
                  ]}>
                  {msg.sender === 'member' ? 'You' : 'Club'} · {formatDateForDisplay(msg.createdAt.slice(0, 10))} {msg.createdAt.slice(11, 16)}
                </ThemedText>
              </ThemedView>
            ))
          )}
        </ThemedView>

        <ThemedText style={styles.replyLabel}>Add a reply</ThemedText>
        <TextInput
          style={[styles.input, { color: textColor, backgroundColor, borderColor }]}
          value={reply}
          onChangeText={setReply}
          placeholder="Type your message..."
          placeholderTextColor={borderColor}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: buttonBg }]}
          onPress={handleSendReply}
          disabled={sending || !reply.trim()}>
          <ThemedText style={[styles.sendButtonText, { color: buttonTextColor }]}>
            {sending ? 'Sending…' : 'Send'}
          </ThemedText>
        </TouchableOpacity>

        {ticket.attachments && ticket.attachments.length > 0 && (
          <>
            <ThemedText type="subtitle" style={styles.attachmentsTitle}>Attachments</ThemedText>
            <ThemedView style={styles.thumbs}>
              {ticket.attachments.map((a) => (
                <Image key={a.id} source={{ uri: a.uri }} style={styles.thumb} />
              ))}
            </ThemedView>
          </>
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
  container: {
    gap: 16,
  },
  backRow: {
    marginBottom: 8,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    gap: 4,
  },
  subject: {
    opacity: 0.9,
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  thread: {
    gap: 12,
    minHeight: 80,
  },
  emptyThread: {
    opacity: 0.7,
  },
  bubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  bubbleMember: {
    alignSelf: 'flex-end',
  },
  bubbleAdmin: {
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: 15,
  },
  bubbleMeta: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  replyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  sendButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  sendButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
  attachmentsTitle: {
    marginTop: 16,
  },
  thumbs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
});
