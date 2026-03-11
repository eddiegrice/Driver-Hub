import type { SupabaseClient } from '@supabase/supabase-js';

import type { ChatMessage, ChatRoomState, ReactionSummary } from '@/types/chat';
import { ROOM_ID_MAIN } from '@/types/chat';

/** DB row shape for chat_messages */
type ChatMessageRow = {
  id: string;
  room_id: string;
  member_id: string;
  display_name: string;
  body: string;
  quoted_message_id: string | null;
  created_at: string;
};

/** DB row shape for chat_reactions */
type ChatReactionRow = {
  id: string;
  message_id: string;
  member_id: string;
  emoji: string;
  created_at: string;
};

/** DB row shape for chat_room_state */
type ChatRoomStateRow = {
  room_id: string;
  is_locked: boolean;
  locked_reason: string | null;
  updated_at: string;
};

/** DB row shape for chat_member_state */
type ChatMemberStateRow = {
  member_id: string;
  last_read_message_id: string | null;
  last_read_at: string | null;
};

export function messageRowToMessage(row: ChatMessageRow, quoted?: ChatMessage | null): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    memberId: row.member_id,
    displayName: row.display_name,
    body: row.body,
    quotedMessageId: row.quoted_message_id,
    createdAt: row.created_at,
    quotedMessage: quoted ?? undefined,
  };
}

export type FetchMessagesOptions = {
  roomId?: string;
  before?: string; // message id
  after?: string;  // message id
  limit?: number;
};

/**
 * Fetch a page of messages. Results ordered by created_at desc (newest first).
 * For "inverted" list we want newest at bottom, so client typically reverses or uses as-is for FlatList inverted.
 */
export async function fetchMessagesPage(
  supabase: SupabaseClient,
  options: FetchMessagesOptions = {}
): Promise<{ messages: ChatMessage[]; error: Error | null }> {
  const roomId = options.roomId ?? ROOM_ID_MAIN;
  const limit = options.limit ?? 50;

  let query = supabase
    .from('chat_messages')
    .select('id, room_id, member_id, display_name, body, quoted_message_id, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (options.before) {
    const { data: row } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('id', options.before)
      .single();
    const cursorAt = (row as { created_at: string } | null)?.created_at;
    if (cursorAt) {
      query = query.lt('created_at', cursorAt);
    }
  }
  if (options.after) {
    const { data: row } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('id', options.after)
      .single();
    const cursorAt = (row as { created_at: string } | null)?.created_at;
    if (cursorAt) {
      query = query.gt('created_at', cursorAt);
    }
  }

  const { data: rows, error } = await query;

  if (error) {
    return { messages: [], error };
  }

  const raw = (rows ?? []) as ChatMessageRow[];
  const quotedIds = [...new Set(raw.map((r) => r.quoted_message_id).filter(Boolean))] as string[];
  let quotedMap: Record<string, ChatMessage> = {};
  if (quotedIds.length > 0) {
    const { data: quotedRows } = await supabase
      .from('chat_messages')
      .select('id, room_id, member_id, display_name, body, quoted_message_id, created_at')
      .in('id', quotedIds);
    const quotedList = (quotedRows ?? []) as ChatMessageRow[];
    quotedMap = Object.fromEntries(
      quotedList.map((r) => [r.id, messageRowToMessage(r)])
    );
  }

  const messages = raw.map((r) =>
    messageRowToMessage(r, r.quoted_message_id ? quotedMap[r.quoted_message_id] : null)
  );

  return { messages, error: null };
}

/**
 * Fetch reactions for a set of message ids. Returns one ReactionSummary per (messageId, emoji).
 * Key is messageId; value is array of summaries (one per emoji type).
 */
export async function fetchReactionsForMessages(
  supabase: SupabaseClient,
  messageIds: string[]
): Promise<Record<string, ReactionSummary[]>> {
  if (messageIds.length === 0) return {};

  const { data: rows, error } = await supabase
    .from('chat_reactions')
    .select('message_id, member_id, emoji')
    .in('message_id', messageIds);

  if (error || !rows) return {};

  const byMessageAndEmoji: Record<string, Record<string, string[]>> = {};
  for (const r of rows as { message_id: string; member_id: string; emoji: string }[]) {
    const key = r.message_id;
    if (!byMessageAndEmoji[key]) byMessageAndEmoji[key] = {};
    if (!byMessageAndEmoji[key][r.emoji]) byMessageAndEmoji[key][r.emoji] = [];
    if (!byMessageAndEmoji[key][r.emoji].includes(r.member_id)) {
      byMessageAndEmoji[key][r.emoji].push(r.member_id);
    }
  }

  const result: Record<string, ReactionSummary[]> = {};
  for (const [msgId, emojiToIds] of Object.entries(byMessageAndEmoji)) {
    result[msgId] = Object.entries(emojiToIds).map(([emoji, memberIds]) => ({
      emoji,
      count: memberIds.length,
      memberIds,
    }));
  }
  return result;
}

export async function sendMessage(
  supabase: SupabaseClient,
  memberId: string,
  displayName: string,
  body: string,
  quotedMessageId?: string | null
): Promise<{ message: ChatMessage | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: ROOM_ID_MAIN,
      member_id: memberId,
      display_name: displayName,
      body: body.trim(),
      quoted_message_id: quotedMessageId ?? null,
    })
    .select('id, room_id, member_id, display_name, body, quoted_message_id, created_at')
    .single();

  if (error) return { message: null, error };
  const row = data as ChatMessageRow;
  return { message: messageRowToMessage(row), error: null };
}

export async function deleteMessage(
  supabase: SupabaseClient,
  messageId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('chat_messages').delete().eq('id', messageId);
  return { error: error ?? null };
}

export async function addReaction(
  supabase: SupabaseClient,
  messageId: string,
  memberId: string,
  emoji: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('chat_reactions').insert({
    message_id: messageId,
    member_id: memberId,
    emoji,
  });
  return { error: error ?? null };
}

export async function removeReaction(
  supabase: SupabaseClient,
  messageId: string,
  memberId: string,
  emoji: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('chat_reactions')
    .delete()
    .eq('message_id', messageId)
    .eq('member_id', memberId)
    .eq('emoji', emoji);
  return { error: error ?? null };
}

export async function getRoomState(
  supabase: SupabaseClient,
  roomId: string = ROOM_ID_MAIN
): Promise<{ state: ChatRoomState | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('chat_room_state')
    .select('room_id, is_locked, locked_reason')
    .eq('room_id', roomId)
    .single();

  if (error || !data) {
    return { state: null, error };
  }
  const row = data as ChatRoomStateRow;
  return {
    state: {
      roomId: row.room_id,
      isLocked: row.is_locked,
      lockedReason: row.locked_reason,
    },
    error: null,
  };
}

/** Ensure room state row exists; then update. Caller must be moderator. */
export async function setRoomLocked(
  supabase: SupabaseClient,
  roomId: string,
  isLocked: boolean,
  lockedReason?: string | null
): Promise<{ error: Error | null }> {
  const { error: upsertErr } = await supabase
    .from('chat_room_state')
    .upsert(
      { room_id: roomId, is_locked: isLocked, locked_reason: lockedReason ?? null, updated_at: new Date().toISOString() },
      { onConflict: 'room_id' }
    );
  return { error: upsertErr ?? null };
}

export async function getMyChatState(
  supabase: SupabaseClient,
  memberId: string
): Promise<{ lastReadMessageId: string | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('chat_member_state')
    .select('last_read_message_id')
    .eq('member_id', memberId)
    .single();

  if (error && error.code !== 'PGRST116') return { lastReadMessageId: null, error };
  const row = data as ChatMemberStateRow | null;
  return { lastReadMessageId: row?.last_read_message_id ?? null, error: null };
}

export async function updateMyChatState(
  supabase: SupabaseClient,
  memberId: string,
  lastReadMessageId: string | null
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('chat_member_state').upsert(
    {
      member_id: memberId,
      last_read_message_id: lastReadMessageId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: 'member_id' }
  );
  return { error: error ?? null };
}

/** Moderator only: list active chat bans. */
export async function listChatBans(
  supabase: SupabaseClient
): Promise<{ bans: { id: string; memberId: string; reason: string | null; expiresAt: string | null }[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('chat_bans')
    .select('id, member_id, reason, expires_at')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (error) return { bans: [], error };
  const rows = (data ?? []) as { id: string; member_id: string; reason: string | null; expires_at: string | null }[];
  return {
    bans: rows.map((r) => ({ id: r.id, memberId: r.member_id, reason: r.reason, expiresAt: r.expires_at })),
    error: null,
  };
}

/** Moderator only: create a chat ban. */
export async function createChatBan(
  supabase: SupabaseClient,
  memberId: string,
  options?: { reason?: string | null; expiresAt?: string | null }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('chat_bans').insert({
    member_id: memberId,
    reason: options?.reason ?? null,
    expires_at: options?.expiresAt ?? null,
  });
  return { error: error ?? null };
}

/** Moderator only: remove a chat ban (lift suspension). */
export async function removeChatBan(supabase: SupabaseClient, banId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('chat_bans').delete().eq('id', banId);
  return { error: error ?? null };
}
