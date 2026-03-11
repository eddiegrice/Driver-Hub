/**
 * Polls/surveys/ballots. Created by admins; members only view and answer.
 * Results are hidden from members until the poll has closed.
 */
export type PollQuestionType = 'single' | 'multiple' | 'text';

export interface PollOption {
  id: string;
  text: string;
}

export interface PollQuestion {
  id: string;
  questionText: string;
  type: PollQuestionType;
  options: PollOption[]; // for single/multiple; empty for text
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  /** When members can start answering */
  startsAt: string; // ISO
  /** When poll closes; after this, members can see results */
  endsAt: string; // ISO
  questions: PollQuestion[];
  /** Optional: for ballots, responses may be anonymous */
  isAnonymous: boolean;
}

/** One member's submission for a poll */
export interface PollResponse {
  pollId: string;
  submittedAt: string; // ISO
  answers: PollAnswer[];
}

export interface PollAnswer {
  questionId: string;
  optionIds?: string[]; // for single (one id) or multiple
  freeText?: string;   // for text type
}

/** Results per question (only used after poll closes; from backend or stored) */
export interface PollResults {
  pollId: string;
  questionResults: Record<string, { optionId: string; count: number }[]>;
  totalResponses: number;
}

export function isPollOpen(poll: Poll): boolean {
  const now = Date.now();
  const start = new Date(poll.startsAt).getTime();
  const end = new Date(poll.endsAt).getTime();
  return now >= start && now <= end;
}

export function isPollClosed(poll: Poll): boolean {
  return new Date(poll.endsAt).getTime() < Date.now();
}
