import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import {
  fetchMyPollResponseSummaries,
  fetchPollInstrumentById,
  fetchPollsForMember,
  getPollPublicResultsRpc,
  submitPollResponseRpc,
} from '@/lib/polls-supabase';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Poll, PollAnswer, PollResponse, PollResultsMember } from '@/types/polls';
import { isPollClosedForMember, isPollOpenForMember } from '@/types/polls';

type PollsContextValue = {
  polls: Poll[];
  isLoading: boolean;
  refreshPolls: () => Promise<void>;
  getPoll: (id: string) => Poll | undefined;
  /** Loads from server if missing from cache (e.g. deep link). */
  ensurePollLoaded: (id: string) => Promise<Poll | null>;
  getMyResponse: (pollId: string) => PollResponse | null;
  submitResponse: (pollId: string, answers: PollAnswer[]) => Promise<{ error: string | null }>;
  getResults: (pollId: string) => Promise<PollResultsMember | null>;
  openPolls: Poll[];
  closedPolls: Poll[];
  openSurveys: Poll[];
  closedSurveys: Poll[];
};

const PollsContext = createContext<PollsContextValue | null>(null);

export function PollsProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [submissionMap, setSubmissionMap] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const refreshPolls = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !session?.user) {
      setPolls([]);
      setSubmissionMap(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const [{ polls: list, error: listErr }, summaries] = await Promise.all([
      fetchPollsForMember(supabase),
      fetchMyPollResponseSummaries(supabase),
    ]);

    if (listErr) {
      setPolls([]);
    } else {
      setPolls(list);
    }
    setSubmissionMap(summaries);
    setIsLoading(false);
  }, [session?.user]);

  useEffect(() => {
    void refreshPolls();
  }, [refreshPolls]);

  const getPoll = useCallback((id: string) => polls.find((p) => p.id === id), [polls]);

  const ensurePollLoaded = useCallback(
    async (id: string) => {
      const existing = polls.find((p) => p.id === id);
      if (existing) return existing;
      if (!supabase || !session?.user) return null;
      const { poll, error } = await fetchPollInstrumentById(supabase, id);
      if (error || !poll) return null;
      setPolls((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, poll]));
      return poll;
    },
    [polls, session?.user]
  );

  const getMyResponse = useCallback(
    (pollId: string): PollResponse | null => {
      const at = submissionMap.get(pollId);
      if (!at) return null;
      return { pollId, submittedAt: at, answers: [] };
    },
    [submissionMap]
  );

  const submitResponse = useCallback(
    async (pollId: string, answers: PollAnswer[]) => {
      if (!supabase || !session?.user) {
        return { error: 'Sign in required.' };
      }
      const { ok, error } = await submitPollResponseRpc(supabase, pollId, answers);
      if (!ok) return { error: error ?? 'Submit failed' };
      const submittedAt = new Date().toISOString();
      setSubmissionMap((prev) => new Map(prev).set(pollId, submittedAt));
      return { error: null };
    },
    [session?.user]
  );

  const getResults = useCallback(
    async (pollId: string): Promise<PollResultsMember | null> => {
      if (!supabase || !session?.user) return null;
      const { results, error } = await getPollPublicResultsRpc(supabase, pollId);
      if (error || !results) return null;
      return results;
    },
    [session?.user]
  );

  const openPolls = polls.filter((p) => p.kind === 'poll' && isPollOpenForMember(p));
  const closedPolls = polls.filter((p) => p.kind === 'poll' && isPollClosedForMember(p));
  const openSurveys = polls.filter((p) => p.kind === 'survey' && isPollOpenForMember(p));
  const closedSurveys = polls.filter((p) => p.kind === 'survey' && isPollClosedForMember(p));

  const value: PollsContextValue = {
    polls,
    isLoading,
    refreshPolls,
    getPoll,
    ensurePollLoaded,
    getMyResponse,
    submitResponse,
    getResults,
    openPolls,
    closedPolls,
    openSurveys,
    closedSurveys,
  };

  return <PollsContext.Provider value={value}>{children}</PollsContext.Provider>;
}

export function usePolls(): PollsContextValue {
  const ctx = useContext(PollsContext);
  if (!ctx) throw new Error('usePolls must be used inside PollsProvider');
  return ctx;
}
