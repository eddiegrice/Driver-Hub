/**
 * Polls & surveys (unified). DB-backed via Supabase; member UI is always anonymous.
 */

export type PollKind = 'poll' | 'survey';

/** Stored in Supabase `poll_questions.question_type`. */
export type PollQuestionTypeDb =
  | 'single_choice'
  | 'multiple_choice'
  | 'text_short'
  | 'text_long'
  | 'number';

/** UI / legacy shape for question rendering. */
export type PollQuestionTypeUi = 'single' | 'multiple' | 'text' | 'number';

export interface PollOption {
  id: string;
  text: string;
  /** Survey: "Other" row — requires `writeInText` when selected if `allowWriteIn`. */
  isWriteInSlot?: boolean;
}

export interface PollQuestion {
  id: string;
  questionText: string;
  /** Derived from DB for rendering (radio vs checkbox vs inputs). */
  type: PollQuestionTypeUi;
  dbType: PollQuestionTypeDb;
  options: PollOption[];
  allowWriteIn: boolean;
}

export interface Poll {
  id: string;
  kind: PollKind;
  title: string;
  description: string;
  publishAt: string;
  closeAt: string;
  archivedAt: string | null;
  resultsPublishedAt: string | null;
  questions: PollQuestion[];
  /** Always true for member-facing copy; responses still keyed by user in DB for audit. */
  isAnonymous: true;
}

export interface PollAnswer {
  questionId: string;
  optionIds?: string[];
  freeText?: string;
  numberValue?: number;
  writeInText?: string;
}

export interface PollResponse {
  pollId: string;
  submittedAt: string;
  answers: PollAnswer[];
}

/** Member-visible results: percentages only; no totals or counts. */
export interface PollResultsMember {
  questions: Array<{
    questionId: string;
    prompt: string;
    questionType: PollQuestionTypeDb | string;
    options: Array<{ optionId: string; label: string; percent: number }>;
  }>;
}

/** Admin aggregates (counts + sample text/numbers). */
export interface PollResultsAdmin {
  instrumentId: string;
  totalResponses: number;
  questions: unknown[];
}

export function dbTypeToUi(t: PollQuestionTypeDb): PollQuestionTypeUi {
  if (t === 'single_choice') return 'single';
  if (t === 'multiple_choice') return 'multiple';
  if (t === 'number') return 'number';
  return 'text';
}

/** Not yet visible to members (publish time in the future). */
export function isPollScheduled(poll: Poll): boolean {
  if (poll.archivedAt) return false;
  return new Date(poll.publishAt).getTime() > Date.now();
}

/** Open = published, not yet closed, visible to members (RLS already filters archived). */
export function isPollOpenForMember(poll: Poll): boolean {
  const now = Date.now();
  if (new Date(poll.publishAt).getTime() > now) return false;
  if (new Date(poll.closeAt).getTime() <= now) return false;
  return true;
}

/** Closed for member list: past close, was published. */
export function isPollClosedForMember(poll: Poll): boolean {
  const now = Date.now();
  if (new Date(poll.publishAt).getTime() > now) return false;
  return new Date(poll.closeAt).getTime() <= now;
}

export function isPollResultsPublished(poll: Poll): boolean {
  return poll.resultsPublishedAt != null && poll.resultsPublishedAt.length > 0;
}

/** @deprecated Use isPollOpenForMember */
export function isPollOpen(poll: Poll): boolean {
  return isPollOpenForMember(poll);
}

/** @deprecated Use isPollClosedForMember */
export function isPollClosed(poll: Poll): boolean {
  return isPollClosedForMember(poll);
}
