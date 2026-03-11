/**
 * Chat room types — single global room, messages with quoting and reactions.
 * Aligned with Supabase schema: chat_messages, chat_reactions.
 */

export type ChatMessage = {
  id: string;
  roomId: string;
  memberId: string;
  displayName: string;
  body: string;
  quotedMessageId: string | null;
  createdAt: string; // ISO
  /** Resolved quote for display (optional; may be undefined if quote not loaded) */
  quotedMessage?: ChatMessage | null;
};

export type ChatReaction = {
  id: string;
  messageId: string;
  memberId: string;
  emoji: string;
  createdAt: string;
};

/** Grouped reactions for display: emoji -> count (and who reacted, if needed) */
export type ReactionSummary = { emoji: string; count: number; memberIds: string[] };

export const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number];

export const ROOM_ID_MAIN = 'main';

/** Room state for lock/pause */
export type ChatRoomState = {
  roomId: string;
  isLocked: boolean;
  lockedReason: string | null;
};
