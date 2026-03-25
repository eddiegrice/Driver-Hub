import { useEffect, useMemo, useState } from 'react';

import { getBridgeBannerDisplay } from '@/lib/bridge-display';
import { fetchBridgeStatus } from '@/lib/bridge-supabase';
import { supabase } from '@/lib/supabase';
import type { BridgeStatus } from '@/types/bridge';

export function useBridgeBanner(bridgeId: string = 'renfrew_bridge') {
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [bridgeError, setBridgeError] = useState<Error | null>(null);
  const [bridgeLoading, setBridgeLoading] = useState(true);
  const [bridgeClockTick, setBridgeClockTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBridgeLoading(true);
      const { status, error } = await fetchBridgeStatus(supabase, bridgeId);
      if (cancelled) return;
      setBridge(status);
      setBridgeError(error);
      setBridgeLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bridgeId]);

  useEffect(() => {
    const id = setInterval(() => setBridgeClockTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const bridgeBanner = useMemo(() => {
    if (bridgeLoading) {
      return { pillKind: 'unknown' as const, pillLabel: 'CHECKING…', warning: null };
    }
    return getBridgeBannerDisplay(bridge, !!bridgeError);
  }, [bridge, bridgeError, bridgeLoading, bridgeClockTick]);

  return { bridgeBanner, bridgeLoading };
}
