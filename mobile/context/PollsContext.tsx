import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  addResponse,
  ensurePollsSeeded,
  getStoredResponses,
  getStoredResults,
} from '@/lib/polls-storage';
import type { Poll, PollAnswer, PollResults, PollResponse } from '@/types/polls';
import { isPollClosed, isPollOpen } from '@/types/polls';

type PollsContextValue = {
  polls: Poll[];
  isLoading: boolean;
  refreshPolls: () => Promise<void>;
  getPoll: (id: string) => Poll | undefined;
  getMyResponse: (pollId: string) => PollResponse | null;
  submitResponse: (pollId: string, answers: PollAnswer[]) => Promise<void>;
  getResults: (pollId: string) => Promise<PollResults | null>;
  openPolls: Poll[];
  closedPolls: Poll[];
};

const PollsContext = createContext<PollsContextValue | null>(null);

export function PollsProvider({ children }: { children: React.ReactNode }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [responses, setResponses] = useState<Map<string, PollResponse>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const refreshPolls = useCallback(async () => {
    setIsLoading(true);
    const [list, resList] = await Promise.all([ensurePollsSeeded(), getStoredResponses()]);
    setPolls(list);
    setResponses(new Map(resList.map((r) => [r.pollId, r])));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshPolls();
  }, [refreshPolls]);

  const getPoll = useCallback((id: string) => polls.find((p) => p.id === id), [polls]);

  const getMyResponse = useCallback(
    (pollId: string) => responses.get(pollId) ?? null,
    [responses]
  );

  const submitResponse = useCallback(async (pollId: string, answers: PollAnswer[]) => {
    const response: PollResponse = {
      pollId,
      submittedAt: new Date().toISOString(),
      answers,
    };
    await addResponse(response);
    setResponses((prev) => new Map(prev).set(pollId, response));
  }, []);

  const getResults = useCallback(async (pollId: string): Promise<PollResults | null> => {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll || !isPollClosed(poll)) return null;
    return getStoredResults(pollId);
  }, [polls]);

  const openPolls = polls.filter(isPollOpen);
  const closedPolls = polls.filter(isPollClosed);

  const value: PollsContextValue = {
    polls,
    isLoading,
    refreshPolls,
    getPoll,
    getMyResponse,
    submitResponse,
    getResults,
    openPolls,
    closedPolls,
  };

  return <PollsContext.Provider value={value}>{children}</PollsContext.Provider>;
}

export function usePolls(): PollsContextValue {
  const ctx = useContext(PollsContext);
  if (!ctx) throw new Error('usePolls must be used inside PollsProvider');
  return ctx;
}
