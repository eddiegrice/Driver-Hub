import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { fetchTrafficSituations } from '@/lib/traffic-supabase';
import { supabase } from '@/lib/supabase';
import type { TrafficSituation } from '@/types/traffic';

type TrafficContextValue = {
  situations: TrafficSituation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getSituation: (id: string) => TrafficSituation | undefined;
};

const TrafficContext = createContext<TrafficContextValue | null>(null);

export function TrafficProvider({ children }: { children: React.ReactNode }) {
  const [situations, setSituations] = useState<TrafficSituation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const { situations: list, error: err } = await fetchTrafficSituations(supabase);
    setSituations(list);
    setError(err?.message ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getSituation = useCallback(
    (id: string) => situations.find((s) => s.id === id),
    [situations]
  );

  const value: TrafficContextValue = {
    situations,
    isLoading,
    error,
    refresh,
    getSituation,
  };

  return <TrafficContext.Provider value={value}>{children}</TrafficContext.Provider>;
}

export function useTraffic(): TrafficContextValue {
  const ctx = useContext(TrafficContext);
  if (!ctx) throw new Error('useTraffic must be used inside TrafficProvider');
  return ctx;
}
