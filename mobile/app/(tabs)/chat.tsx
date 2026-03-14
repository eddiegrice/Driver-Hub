import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { FrostedGlassView } from '@/components/FrostedGlassView';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useChat } from '@/context/ChatContext';
import { useMember } from '@/context/MemberContext';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Brand, FontSize, NeoGlass, Radius, Spacing } from '@/constants/theme';
import type { ChatMessage, ReactionSummary } from '@/types/chat';
import { CHAT_REACTION_EMOJIS } from '@/types/chat';

// -----------------------------------------------------------------------------
// Mock data for Phase 2 (no backend yet)
// -----------------------------------------------------------------------------
const MOCK_CURRENT_MEMBER_ID = 'current-user-id';

function mockMessages(): ChatMessage[] {
  const base: ChatMessage[] = [
    {
      id: '1',
      roomId: 'main',
      memberId: 'user-a',
      displayName: 'Alex',
      body: 'Hi everyone, hope you\'re all good.',
      quotedMessageId: null,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      roomId: 'main',
      memberId: 'user-b',
      displayName: 'Sam',
      body: 'All good here. Anyone at the rank this morning?',
      quotedMessageId: null,
      createdAt: new Date(Date.now() - 3000000).toISOString(),
    },
    {
      id: '3',
      roomId: 'main',
      memberId: MOCK_CURRENT_MEMBER_ID,
      displayName: 'You',
      body: 'I was there. Pretty busy.',
      quotedMessageId: null,
      createdAt: new Date(Date.now() - 2400000).toISOString(),
    },
    {
      id: '4',
      roomId: 'main',
      memberId: 'user-a',
      displayName: 'Alex',
      body: 'Thanks for the update.',
      quotedMessageId: '3',
      quotedMessage: {
        id: '3',
        roomId: 'main',
        memberId: MOCK_CURRENT_MEMBER_ID,
        displayName: 'You',
        body: 'I was there. Pretty busy.',
        quotedMessageId: null,
        createdAt: '',
      },
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: '5',
      roomId: 'main',
      memberId: 'user-b',
      displayName: 'Sam',
      body: 'See you next week 👍',
      quotedMessageId: null,
      createdAt: new Date(Date.now() - 600000).toISOString(),
    },
  ];
  return base;
}

function mockReactions(): Record<string, ReactionSummary> {
  return {
    '3': { emoji: '👍', count: 2, memberIds: ['user-a', 'user-b'] },
    '5': { emoji: '👍', count: 1, memberIds: ['user-a'] },
  };
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// -----------------------------------------------------------------------------
// Bubble component
// -----------------------------------------------------------------------------
const BUBBLE_BORDER = 'rgba(255, 255, 255, 0.1)';
const BUBBLE_GRADIENT_OWN = ['#00CCFF', '#040A4B'] as const;

function ChatBubble({
  message,
  reactionSummaries,
  isOwn,
  onLongPress,
}: {
  message: ChatMessage;
  reactionSummaries: ReactionSummary[];
  isOwn: boolean;
  onLongPress: () => void;
}) {
  const backgroundLight = isOwn ? 'transparent' : '#E2E8F0';
  const backgroundDark = isOwn ? 'transparent' : '#334155';
  const bubbleBg = useThemeColor(
    { light: backgroundLight, dark: backgroundDark },
    'surface'
  );
  const textColor = useThemeColor(
    { light: isOwn ? '#FFFFFF' : '#0F172A', dark: isOwn ? '#FFFFFF' : '#F1F5F9' },
    'text'
  );
  const mutedColor = useThemeColor(
    { light: isOwn ? 'rgba(255,255,255,0.85)' : '#64748B', dark: isOwn ? 'rgba(255,255,255,0.9)' : '#94A3B8' },
    'textMuted'
  );

  return (
    <Pressable
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.bubbleWrap,
        isOwn && styles.bubbleWrapOwn,
        pressed && styles.bubblePressed,
      ]}>
      <View style={[styles.bubble, { backgroundColor: isOwn ? 'transparent' : bubbleBg, borderColor: BUBBLE_BORDER }, isOwn && styles.bubbleOwn]}>
        {isOwn && (
          <LinearGradient
            colors={BUBBLE_GRADIENT_OWN as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.bubbleGradient]}
          />
        )}
        <View style={styles.bubbleContent}>
        <ThemedText style={[styles.senderName, { color: isOwn ? 'rgba(255,255,255,0.95)' : Brand.primary }]} numberOfLines={1}>
          {isOwn ? 'You' : message.displayName}
        </ThemedText>
        {message.quotedMessage && (
          <View style={[styles.quoteBarWrap, { backgroundColor: isOwn ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[styles.quoteBar, { borderLeftColor: isOwn ? 'rgba(255,255,255,0.6)' : Brand.primary }]}>
              <ThemedText style={[styles.quoteName, { color: mutedColor }]} numberOfLines={1}>
                {message.quotedMessage.displayName}
              </ThemedText>
              <ThemedText style={[styles.quoteSnippet, { color: mutedColor }]} numberOfLines={1}>
                {message.quotedMessage.body}
              </ThemedText>
            </View>
          </View>
        )}
        <ThemedText style={[styles.body, { color: textColor }]}>{message.body}</ThemedText>
        <View style={styles.footer}>
          <ThemedText style={[styles.time, { color: mutedColor }]}>
            {formatTime(message.createdAt)}
          </ThemedText>
        </View>
        {reactionSummaries.length > 0 && (
          <View style={styles.reactionsRow}>
            {reactionSummaries.map((s) => (
              <View key={s.emoji} style={[styles.reactionChip, { backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)' }]}>
                <ThemedText style={styles.reactionEmoji}>{s.emoji}</ThemedText>
                {s.count > 1 && (
                  <ThemedText style={[styles.reactionCount, { color: mutedColor }]}>{s.count}</ThemedText>
                )}
              </View>
            ))}
          </View>
        )}
        </View>
      </View>
    </Pressable>
  );
}

// -----------------------------------------------------------------------------
// Chat room screen
// -----------------------------------------------------------------------------
export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { member } = useMember();
  const chat = useChat();
  const useSupabase = isSupabaseConfigured && !!session?.user?.id;

  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedColor = useThemeColor({}, 'textMuted');
  const surfaceColor = useThemeColor({}, 'surface');

  const [mockMessagesState, setMockMessagesState] = useState<ChatMessage[]>(mockMessages);
  const [mockReactionsState, setMockReactionsState] = useState<Record<string, ReactionSummary>>(mockReactions);
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [modMenuVisible, setModMenuVisible] = useState(false);
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [liftModalVisible, setLiftModalVisible] = useState(false);
  const [bansList, setBansList] = useState<{ id: string; memberId: string; reason: string | null; expiresAt: string | null }[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const swipeableRefs = useRef<Record<string, { close: () => void }>>({});
  const inputRef = useRef<TextInput>(null);

  const messages = useSupabase ? chat.messages : mockMessagesState;
  const reactions = useSupabase ? chat.reactions : mockReactionsState;
  const isLocked = useSupabase ? (chat.roomState?.isLocked ?? false) : false;
  const isMod = useSupabase ? chat.isMod : false;
  const currentMemberId = useSupabase ? (session?.user?.id ?? '') : MOCK_CURRENT_MEMBER_ID;
  const displayName = member?.name?.trim() || 'You';

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    if (useSupabase) {
      await chat.sendMessage(trimmed, replyingTo?.id ?? null);
      setInputText('');
      setReplyingTo(null);
      return;
    }
    const newMsg: ChatMessage = {
      id: `mock-${Date.now()}`,
      roomId: 'main',
      memberId: MOCK_CURRENT_MEMBER_ID,
      displayName,
      body: trimmed,
      quotedMessageId: replyingTo?.id ?? null,
      quotedMessage: replyingTo ?? undefined,
      createdAt: new Date().toISOString(),
    };
    setMockMessagesState((prev) => [...prev, newMsg]);
    setInputText('');
    setReplyingTo(null);
  }, [inputText, replyingTo, displayName, useSupabase, chat]);

  const onReact = useCallback(
    (message: ChatMessage) => {
      const summaries = getReactionsForMessage(message.id);
      const hasReacted = (emoji: string) => summaries.some((s) => s.emoji === emoji && s.memberIds.includes(currentMemberId));
      if (useSupabase) {
        Alert.alert(
          'React',
          undefined,
          [
            ...CHAT_REACTION_EMOJIS.map((emoji) => ({
              text: `${emoji} ${hasReacted(emoji) ? '(remove)' : ''}`,
              onPress: () => (hasReacted(emoji) ? chat.removeReaction(message.id, emoji) : chat.addReaction(message.id, emoji)),
            })),
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        setMockReactionsState((prev) => {
          const key = message.id;
          const cur = prev[key];
          if (cur) {
            return { ...prev, [key]: { ...cur, count: cur.count + 1, memberIds: [...cur.memberIds, MOCK_CURRENT_MEMBER_ID] } };
          }
          return { ...prev, [key]: { emoji: '👍', count: 1, memberIds: [MOCK_CURRENT_MEMBER_ID] } };
        });
      }
    },
    [useSupabase, currentMemberId, getReactionsForMessage, chat]
  );

  const onAction = useCallback(
    async (message: ChatMessage, buttonIndex: number) => {
      if (buttonIndex === 0) onReact(message);
      else if (buttonIndex === 1 && isMod) {
        if (useSupabase) {
          await chat.deleteMessage(message.id);
        } else {
          setMockMessagesState((prev) => prev.filter((m) => m.id !== message.id));
          setMockReactionsState((prev) => {
            const next = { ...prev };
            delete next[message.id];
            return next;
          });
        }
      }
    },
    [isMod, useSupabase, chat, onReact]
  );

  const showActionSheet = useCallback(
    (message: ChatMessage) => {
      if (Platform.OS === 'ios') {
        const options = ['React', ...(isMod ? ['Delete message'] : []), 'Cancel'];
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: isMod ? 1 : undefined },
          (buttonIndex) => {
            if (buttonIndex !== undefined && buttonIndex < options.length - 1) {
              onAction(message, buttonIndex);
            }
          }
        );
      } else {
        Alert.alert(
          'Message',
          undefined,
          [
            { text: 'React', onPress: () => onAction(message, 0) },
            ...(isMod ? [{ text: 'Delete message', style: 'destructive' as const, onPress: () => onAction(message, 1) }] : []),
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    },
    [isMod, onAction]
  );

  const recentSenders = useMemo(() => {
    const seen = new Set<string>();
    const out: { memberId: string; displayName: string }[] = [];
    for (const m of messages) {
      if (m.memberId === currentMemberId) continue;
      if (seen.has(m.memberId)) continue;
      seen.add(m.memberId);
      out.push({ memberId: m.memberId, displayName: m.displayName || 'Member' });
    }
    return out.slice(0, 20);
  }, [messages, currentMemberId]);

  const showModMenu = useCallback(() => {
    const isLocked = useSupabase ? (chat.roomState?.isLocked ?? false) : false;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            isLocked ? 'Resume chat' : 'Pause chat',
            'Suspend member…',
            'Lift suspension…',
            'Cancel',
          ],
          cancelButtonIndex: 3,
        },
        (idx) => {
          if (idx === 0) {
            chat.setRoomLocked(!isLocked).then(() => setModMenuVisible(false));
          } else if (idx === 1) {
            setSuspendModalVisible(true);
          } else if (idx === 2) {
            chat.listBans().then(({ bans }) => {
              setBansList(bans);
              setLiftModalVisible(true);
            });
          }
        }
      );
    } else {
      Alert.alert(
        'Moderate chat',
        undefined,
        [
          { text: isLocked ? 'Resume chat' : 'Pause chat', onPress: () => chat.setRoomLocked(!isLocked) },
          { text: 'Suspend member…', onPress: () => setSuspendModalVisible(true) },
          { text: 'Lift suspension…', onPress: () => chat.listBans().then(({ bans }) => { setBansList(bans); setLiftModalVisible(true); }) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  }, [useSupabase, chat]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const getReactionsForMessage = useCallback(
    (messageId: string): ReactionSummary[] => {
      const r = reactions[messageId];
      if (Array.isArray(r)) return r;
      if (r && typeof r === 'object' && 'emoji' in r) return [r as ReactionSummary];
      return [];
    },
    [reactions]
  );

  const handleSwipeReply = useCallback((item: ChatMessage) => {
    Object.entries(swipeableRefs.current).forEach(([, ref]) => ref?.close());
    setReplyingTo(item);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <Swipeable
        ref={(r) => {
          if (r) swipeableRefs.current[item.id] = r;
        }}
        onSwipeableOpen={() => handleSwipeReply(item)}
        renderLeftActions={() => <View style={styles.swipeReplyStub} />}
        friction={2}
        leftThreshold={30}
      >
        <ChatBubble
          message={item}
          reactionSummaries={getReactionsForMessage(item.id)}
          isOwn={item.memberId === currentMemberId}
          onLongPress={() => showActionSheet(item)}
        />
      </Swipeable>
    ),
    [getReactionsForMessage, currentMemberId, showActionSheet, handleSwipeReply]
  );

  if (useSupabase && chat.isLoading && messages.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor }]}>
        <ActivityIndicator size="large" color={Brand.primary} />
        <ThemedText style={[styles.loadingText, { color: mutedColor }]}>Loading chat…</ThemedText>
      </View>
    );
  }

  const composerBottomPadding = Math.max(insets.bottom, Spacing.lg) + Spacing.sm;

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.chatContent}>
        <View style={styles.tabHeaderRow}>
          <View style={styles.tabHeaderFlex}>
            <TabScreenHeader title="Chat Group" />
          </View>
          {useSupabase && isMod && (
            <Pressable onPress={showModMenu} hitSlop={12} style={({ pressed }) => [styles.headerMenuBtn, pressed && styles.headerMenuBtnPressed]}>
              <ThemedText style={[styles.headerMenuBtnText, { color: textColor }]}>⋮</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Glass box container: margin so gradient shows around it */}
        <View style={styles.glassBoxOuter}>
          <View style={[styles.glassBox, { borderColor: BUBBLE_BORDER }]}>
            <FrostedGlassView borderRadius={Radius.lg - 1} style={styles.glassBoxFrosted}>
              {useSupabase && chat.error && (
                <View style={[styles.errorBar, { backgroundColor: surfaceColor, borderColor }]}>
                  <ThemedText style={styles.errorText}>{chat.error}</ThemedText>
                </View>
              )}

              {/* Message list - scrolls inside the glass box, stops above composer */}
              <FlatList
                data={messages}
                keyExtractor={(m) => m.id}
                renderItem={renderItem}
                contentContainerStyle={[styles.listContent, { paddingBottom: Spacing.lg }]}
                inverted
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                onEndReached={useSupabase && chat.hasMore ? chat.fetchMore : undefined}
                onEndReachedThreshold={0.3}
              />
            </FrostedGlassView>
          </View>
        </View>

        {/* Quote bar (when replying) - below glass box, above composer */}
        {replyingTo && (
          <View style={[styles.quoteBarComposer, { backgroundColor: surfaceColor, borderColor }]}>
            <View style={styles.quoteBarComposerInner}>
              <ThemedText style={[styles.quoteBarLabel, { color: mutedColor }]}>Replying to {replyingTo.displayName}</ThemedText>
              <ThemedText style={[styles.quoteBarSnippet, { color: textColor }]} numberOfLines={1}>{replyingTo.body}</ThemedText>
            </View>
            <Pressable onPress={() => setReplyingTo(null)} hitSlop={12}>
              <ThemedText style={[styles.quoteBarCancel, { color: Brand.primary }]}>Cancel</ThemedText>
            </Pressable>
          </View>
        )}

        {/* Composer - marginBottom: keyboardHeight moves it above keyboard (only source of shift, no gap) */}
        <View
          style={[
            styles.composer,
            {
              paddingBottom: composerBottomPadding,
              marginBottom: keyboardHeight,
              borderTopColor: borderColor,
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: textColor, backgroundColor: surfaceColor, borderColor }]}
            placeholder="Message…"
            placeholderTextColor={mutedColor}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!isLocked}
          />
          <Pressable
            onPress={handleSend}
            disabled={!inputText.trim() || isLocked}
            style={({ pressed }) => [
              styles.sendBtn,
              { backgroundColor: Brand.primary },
              (!inputText.trim() || isLocked) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}>
            <ThemedText style={styles.sendBtnLabel}>Send</ThemedText>
          </Pressable>
        </View>
      </View>

      {/* Mod: Suspend member modal */}
      <Modal visible={suspendModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSuspendModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: surfaceColor }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Suspend member</ThemedText>
            <ThemedText style={[styles.modalHint, { color: mutedColor }]}>Tap a recent sender to suspend from chat.</ThemedText>
            <ScrollView style={styles.modalList}>
              {recentSenders.length === 0 ? (
                <ThemedText style={[styles.modalEmpty, { color: mutedColor }]}>No other senders in this chat yet.</ThemedText>
              ) : (
                recentSenders.map(({ memberId, displayName }) => (
                  <Pressable
                    key={memberId}
                    style={({ pressed }) => [styles.modalRow, { borderColor }, pressed && styles.modalRowPressed]}
                    onPress={() => {
                      setSuspendModalVisible(false);
                      const durations = [
                        { label: '24 hours', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() },
                        { label: '7 days', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
                        { label: 'Indefinite', expiresAt: null as string | null },
                      ];
                      Alert.alert(
                        `Suspend ${displayName}?`,
                        'Choose duration',
                        [
                          ...durations.map((d) => ({
                            text: d.label,
                            onPress: () => {
                              chat.createBan(memberId, { expiresAt: d.expiresAt }).then(({ error }) => {
                                if (error) Alert.alert('Error', error.message);
                                else Alert.alert('Done', `${displayName} is suspended from chat.`);
                              });
                            },
                          })),
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}>
                    <ThemedText style={styles.modalRowText}>{displayName}</ThemedText>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable style={[styles.modalCancelBtn, { borderColor }]} onPress={() => setSuspendModalVisible(false)}>
              <ThemedText style={[styles.modalCancelText, { color: mutedColor }]}>Cancel</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Mod: Lift suspension modal */}
      <Modal visible={liftModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setLiftModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: surfaceColor }]} onPress={(e) => e.stopPropagation()}>
            <ThemedText type="subtitle" style={styles.modalTitle}>Lift suspension</ThemedText>
            <ThemedText style={[styles.modalHint, { color: mutedColor }]}>Tap a member to allow them back into chat.</ThemedText>
            <ScrollView style={styles.modalList}>
              {bansList.length === 0 ? (
                <ThemedText style={[styles.modalEmpty, { color: mutedColor }]}>No one is currently suspended.</ThemedText>
              ) : (
                bansList.map((ban) => {
                  const displayName = messages.find((m) => m.memberId === ban.memberId)?.displayName || 'Member';
                  return (
                    <Pressable
                      key={ban.id}
                      style={({ pressed }) => [styles.modalRow, { borderColor }, pressed && styles.modalRowPressed]}
                      onPress={() => {
                        Alert.alert('Lift suspension?', `Allow ${displayName} back into chat?`, [
                          { text: 'Lift', onPress: () => chat.removeBan(ban.id).then(({ error }) => { if (error) Alert.alert('Error', error.message); else { setLiftModalVisible(false); setBansList((prev) => prev.filter((b) => b.id !== ban.id)); } }) },
                          { text: 'Cancel', style: 'cancel' },
                        ]);
                      }}>
                      <ThemedText style={styles.modalRowText}>{displayName}</ThemedText>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
            <Pressable style={[styles.modalCancelBtn, { borderColor }]} onPress={() => setLiftModalVisible(false)}>
              <ThemedText style={[styles.modalCancelText, { color: mutedColor }]}>Close</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatContent: {
    flex: 1,
  },
  glassBoxOuter: {
    flex: 1,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    minHeight: 0,
  },
  glassBox: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  glassBoxFrosted: {
    flex: 1,
    minHeight: 0,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSize.body,
  },
  errorBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: '#DC2626',
  },
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabHeaderFlex: {
    flex: 1,
  },
  headerMenuBtn: {
    padding: Spacing.sm,
  },
  headerMenuBtnPressed: {
    opacity: 0.7,
  },
  headerMenuBtnText: {
    fontSize: 24,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  swipeReplyStub: {
    width: 60,
    marginBottom: Spacing.sm,
    backgroundColor: 'transparent',
  },
  bubbleWrap: {
    marginBottom: Spacing.sm,
    alignItems: 'flex-start',
    maxWidth: '85%',
  },
  bubbleWrapOwn: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubblePressed: {
    opacity: 0.9,
  },
  bubble: {
    borderRadius: 16,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    maxWidth: '100%',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  bubbleGradient: {
    borderRadius: 15,
  },
  bubbleContent: {
    position: 'relative',
  },
  bubbleOwn: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
  },
  senderName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginBottom: 2,
  },
  quoteBarWrap: {
    borderRadius: Radius.sm,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
  },
  quoteBar: {
    borderLeftWidth: 3,
    paddingLeft: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.sm,
  },
  quoteName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  quoteSnippet: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  body: {
    fontSize: 15,
    lineHeight: 15 * 1.4,
  },
  footer: {
    marginTop: Spacing.xs,
    alignItems: 'flex-end',
  },
  time: {
    fontSize: FontSize.xs,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: FontSize.xs,
  },
  quoteBarComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  quoteBarComposerInner: {
    flex: 1,
  },
  quoteBarLabel: {
    fontSize: FontSize.xs,
  },
  quoteBarSnippet: {
    fontSize: FontSize.sm,
    marginTop: 1,
  },
  quoteBarCancel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginLeft: Spacing.md,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
  },
  sendBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    justifyContent: 'center',
    minHeight: 36,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnPressed: {
    opacity: 0.85,
  },
  sendBtnLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '80%',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    marginBottom: Spacing.xs,
  },
  modalHint: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.lg,
  },
  modalList: {
    maxHeight: 280,
    marginBottom: Spacing.lg,
  },
  modalEmpty: {
    fontSize: FontSize.body,
    paddingVertical: Spacing.lg,
  },
  modalRow: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
  },
  modalRowPressed: {
    opacity: 0.8,
  },
  modalRowText: {
    fontSize: FontSize.body,
  },
  modalCancelBtn: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  modalCancelText: {
    fontSize: FontSize.body,
  },
});
