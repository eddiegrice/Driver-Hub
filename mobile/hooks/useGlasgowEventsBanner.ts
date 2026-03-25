import { useEffect, useState } from 'react';

import { fetchGlasgowEventsForBanner } from '@/lib/events-supabase';
import { supabase } from '@/lib/supabase';
import type { GlasgowEventBannerRow } from '@/types/events';

export function useGlasgowEventsBanner() {
  const [eventsRows, setEventsRows] = useState<GlasgowEventBannerRow[]>([]);
  const [eventsError, setEventsError] = useState<Error | null>(null);
  const [eventsLoading, setEventsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEventsLoading(true);
      setEventsError(null);
      const { rows, error } = await fetchGlasgowEventsForBanner(supabase);
      if (cancelled) return;
      setEventsRows(rows);
      setEventsError(error);
      setEventsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { eventsRows, eventsLoading, eventsError };
}
