import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  fetchMessagesPage,
  fetchReactionsForMessages,
  sendMessage as sendMessageApi,
  deleteMessage as deleteMessageApi,
  addReaction as addReactionApi,
  removeReaction as removeReactionApi,
  getRoomState,
  getMyChatState,
  updateMyChatState,
  setRoomLocked as setRoomLockedApi,
  messageRowToMessage,
  listChatBans,
  createChatBan,
  removeChatBan,
} from '@/lib/chat-supabase';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { ChatMessage, ChatRoomState, ReactionSummary } from '@/types/chat';
import { ROOM_ID_MAIN } from '@/types/chat';
import { useAuth } from '@/context/AuthContext';
import { useMember } from '@/context/MemberContext';

const PAGE_SIZE = 50;

type ChatContextValue = {
  messages: ChatMessage[];
  reactions: Record<string, ReactionSummary[]>;
  roomState: ChatRoomState | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  lastReadMessageId: string | null;
  sendMessage: (body: string, quotedMessageId?: string | null) => Promise<{ error: Error | null }>;
  deleteMessage: (messageId: string) => Promise<{ error: Error | null }>;
  addReaction: (messageId: string, emoji: string) => Promise<{ error: Error | null }>;
  removeReaction: (messageId: string, emoji: string) => Promise<{ error: Error | null }>;
  setRoomLocked: (isLocked: boolean, reason?: string | null) => Promise<{ error: Error | null }>;
  fetchMore: () => Promise<void>;
  refresh: () => Promise<void>;
  updateLastRead: (messageId: string | null) => Promise<void>;
  isMod: boolean;
  listBans: () => Promise<{ bans: { id: string; memberId: string; reason: string | null; expiresAt: string | null }[]; error: Error | null }>;
  createBan: (memberId: string, options?: { reason?: string | null; expiresAt?: string | null }) => Promise<{ error: Error | null }>;
  removeBan: (banId: string) => Promise<{ error: Error | null }>;
};

const ChatContext = createContext<ChatContextValue | null>(null);

const defaultRoomState: ChatRoomState = { roomId: ROOM_ID_MAIN, isLocked: false, lockedReason: null };

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { member, memberStatus } = useMember();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionSummary[]>>({});
  const [roomState, setRoomState] = useState<ChatRoomState | null>(defaultRoomState);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [oldestFetchedId, setOldestFetchedId] = useState<string | null>(null);

  const userId = session?.user?.id ?? null;
  const displayName = member?.name?.trim() || 'Member';
  const isMod = memberStatus.isChatModerator;

  const loadInitial = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const [msgRes, stateRes, readRes] = await Promise.all([
      fetchMessagesPage(supabase, { roomId: ROOM_ID_MAIN, limit: PAGE_SIZE }),
      getRoomState(supabase),
      getMyChatState(supabase, userId),
    ]);
    if (msgRes.error) {
      setError(msgRes.error.message);
      setMessages([]);
      setHasMore(false);
    } else {
      setMessages(msgRes.messages);
      setOldestFetchedId(msgRes.messages.length > 0 ? msgRes.messages[msgRes.messages.length - 1]?.id ?? null : null);
      setHasMore(msgRes.messages.length === PAGE_SIZE);
      const ids = msgRes.messages.map((m) => m.id);
      const reactMap = await fetchReactionsForMessages(supabase, ids);
      setReactions(reactMap);
    }
    if (stateRes.state) setRoomState(stateRes.state);
    if (readRes.lastReadMessageId !== undefined) setLastReadMessageId(readRes.lastReadMessageId);
    setIsLoading(false);
  }, [userId]);

  const fetchMore = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !hasMore || !oldestFetchedId) return;
    const { messages: next, error: err } = await fetchMessagesPage(supabase, {
      roomId: ROOM_ID_MAIN,
      before: oldestFetchedId,
      limit: PAGE_SIZE,
    });
    if (err) return;
    if (next.length === 0) {
      setHasMore(false);
      return;
    }
    setMessages((prev) => [...prev, ...next]);
    setOldestFetchedId(next[next.length - 1]?.id ?? null);
    setHasMore(next.length === PAGE_SIZE);
    const ids = next.map((m) => m.id);
    const reactMap = await fetchReactionsForMessages(supabase, ids);
    setReactions((r) => ({ ...r, ...reactMap }));
  }, [hasMore, oldestFetchedId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // Realtime: subscribe to chat_messages and chat_reactions for the main room
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !userId) return;

    const client = supabase;
    const channel = client
      .channel(`chat:${ROOM_ID_MAIN}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${ROOM_ID_MAIN}` },
        (payload) => {
          const row = payload.new as { id: string; room_id: string; member_id: string; display_name: string; body: string; quoted_message_id: string | null; created_at: string };
          const msg = messageRowToMessage(row);
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const quoted = msg.quotedMessageId ? prev.find((m) => m.id === msg.quotedMessageId) : undefined;
            const msgWithQuote = quoted ? { ...msg, quotedMessage: quoted } : msg;
            return [msgWithQuote, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${ROOM_ID_MAIN}` },
        (payload) => {
          const old = payload.old as { id: string };
          if (old?.id) {
            setMessages((prev) => prev.filter((m) => m.id !== old.id));
            setReactions((r) => {
              const next = { ...r };
              delete next[old.id];
              return next;
            });
          }
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_reactions' }, async (payload) => {
        const row = payload.new as { message_id: string; member_id: string; emoji: string };
        if (!row?.message_id) return;
        setReactions((prev) => {
          const list = prev[row.message_id] ?? [];
          const existing = list.find((x) => x.emoji === row.emoji);
          if (existing) {
            if (existing.memberIds.includes(row.member_id)) return prev;
            const newList = list.map((x) =>
              x.emoji === row.emoji ? { ...x, count: x.count + 1, memberIds: [...x.memberIds, row.member_id] } : x
            );
            return { ...prev, [row.message_id]: newList };
          }
          return { ...prev, [row.message_id]: [...list, { emoji: row.emoji, count: 1, memberIds: [row.member_id] }] };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_reactions' }, (payload) => {
        const old = payload.old as { message_id: string; member_id: string; emoji: string };
        if (!old?.message_id) return;
        setReactions((prev) => {
          const list = prev[old.message_id] ?? [];
          const newList = list
            .map((x) =>
              x.emoji === old.emoji
                ? { ...x, memberIds: x.memberIds.filter((id) => id !== old.member_id), count: x.memberIds.filter((id) => id !== old.member_id).length }
                : x
            )
            .filter((x) => x.count > 0);
          if (newList.length === 0) {
            const next = { ...prev };
            delete next[old.message_id];
            return next;
          }
          return { ...prev, [old.message_id]: newList };
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_room_state', filter: `room_id=eq.${ROOM_ID_MAIN}` }, (payload) => {
        const row = payload.new as { room_id: string; is_locked: boolean; locked_reason: string | null } | null;
        if (row) setRoomState({ roomId: row.room_id, isLocked: row.is_locked, lockedReason: row.locked_reason });
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId]);

  const refresh = useCallback(() => loadInitial(), [loadInitial]);

  const listBans = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return { bans: [], error: new Error('Not configured') };
    return listChatBans(supabase);
  }, []);

  const createBan = useCallback(
    async (memberId: string, options?: { reason?: string | null; expiresAt?: string | null }) => {
      if (!isSupabaseConfigured || !supabase) return { error: new Error('Not configured') };
      return createChatBan(supabase, memberId, options);
    },
    []
  );

  const removeBan = useCallback(
    async (banId: string) => {
      if (!isSupabaseConfigured || !supabase) return { error: new Error('Not configured') };
      return removeChatBan(supabase, banId);
    },
    []
  );

  const sendMessage = useCallback(
    async (body: string, quotedMessageId?: string | null) => {
      if (!isSupabaseConfigured || !supabase || !userId) return { error: new Error('Not configured') };
      const { message, error: err } = await sendMessageApi(supabase, userId, displayName, body, quotedMessageId);
      if (err) return { error: err };
      if (message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          const quoted = message.quotedMessageId ? prev.find((m) => m.id === message.quotedMessageId) : undefined;
          const msgWithQuote = quoted ? { ...message, quotedMessage: quoted } : message;
          return [msgWithQuote, ...prev];
        });
      }
      return { error: null };
    },
    [userId, displayName]
  );

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!isSupabaseConfigured || !supabase) return { error: new Error('Not configured') };
    const { error: err } = await deleteMessageApi(supabase, messageId);
    if (err) return { error: err };
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setReactions((r) => {
      const next = { ...r };
      delete next[messageId];
      return next;
    });
    return { error: null };
  }, []);

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!isSupabaseConfigured || !supabase || !userId) return { error: new Error('Not configured') };
      const { error: err } = await addReactionApi(supabase, messageId, userId, emoji);
      if (err) return { error: err };
      setReactions((prev) => {
        const list = prev[messageId] ?? [];
        const existing = list.find((x) => x.emoji === emoji);
        if (existing) {
          if (existing.memberIds.includes(userId)) return prev;
          const newList = list.map((x) =>
            x.emoji === emoji ? { ...x, count: x.count + 1, memberIds: [...x.memberIds, userId] } : x
          );
          return { ...prev, [messageId]: newList };
        }
        return { ...prev, [messageId]: [...list, { emoji, count: 1, memberIds: [userId] }] };
      });
      return { error: null };
    },
    [userId]
  );

  const removeReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!isSupabaseConfigured || !supabase || !userId) return { error: new Error('Not configured') };
      const { error: err } = await removeReactionApi(supabase, messageId, userId, emoji);
      if (err) return { error: err };
      setReactions((prev) => {
        const list = prev[messageId] ?? [];
        const newList = list
          .map((x) =>
            x.emoji === emoji
              ? { ...x, memberIds: x.memberIds.filter((id) => id !== userId), count: x.memberIds.filter((id) => id !== userId).length }
              : x
          )
          .filter((x) => x.count > 0);
        if (newList.length === 0) {
          const next = { ...prev };
          delete next[messageId];
          return next;
        }
        return { ...prev, [messageId]: newList };
      });
      return { error: null };
    },
    [userId]
  );

  const setRoomLocked = useCallback(async (isLocked: boolean, reason?: string | null) => {
    if (!isSupabaseConfigured || !supabase) return { error: new Error('Not configured') };
    const { error: err } = await setRoomLockedApi(supabase, ROOM_ID_MAIN, isLocked, reason);
    if (err) return { error: err };
    setRoomState((s) => (s ? { ...s, isLocked, lockedReason: reason ?? null } : null));
    return { error: null };
  }, []);

  const updateLastRead = useCallback(
    async (messageId: string | null) => {
      if (!isSupabaseConfigured || !supabase || !userId) return;
      setLastReadMessageId(messageId);
      await updateMyChatState(supabase, userId, messageId);
    },
    [userId]
  );

  const value: ChatContextValue = {
    messages,
    reactions,
    roomState,
    isLoading,
    error,
    hasMore,
    lastReadMessageId,
    sendMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    setRoomLocked,
    fetchMore,
    refresh,
    updateLastRead,
    isMod,
    listBans,
    createBan,
    removeBan,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
