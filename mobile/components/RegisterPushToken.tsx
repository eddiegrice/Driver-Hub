import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * When the user is signed in and active, register their device for push notifications
 * and save the token to Supabase (member_devices). Runs once per session.
 * Skipped in Expo Go (SDK 53+ removed push from Expo Go); we avoid loading expo-notifications at all there.
 */
export function RegisterPushToken() {
  const { session } = useAuth();
  const done = useRef(false);
  const isExpoGo = Constants.appOwnership === 'expo';

  useEffect(() => {
    if (isExpoGo || !isSupabaseConfigured || !session?.user?.id || done.current) return;
    const client = supabase;
    if (!client) return;
    done.current = true;
    const userId = session.user.id;
    import('@/lib/push-device-supabase').then(({ registerPushDevice }) =>
      registerPushDevice(client, userId)
    );
  }, [isExpoGo, session?.user?.id]);

  return null;
}
