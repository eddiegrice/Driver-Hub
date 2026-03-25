import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { fetchMemberAdminFlag } from '@/lib/member-supabase';

type Props = {
  children: ReactNode;
};

/**
 * Server-verified admin gate: re-checks `members.is_admin` on each focus.
 * Non-admins are sent home; children only render after Supabase confirms admin.
 */
export function AdminAccessGate({ children }: Props) {
  const router = useRouter();
  const { session } = useAuth();
  const [phase, setPhase] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const userId = session?.user?.id;
        if (!isSupabaseConfigured || !userId) {
          if (!cancelled) setPhase('denied');
          return;
        }
        if (!cancelled) setPhase('checking');
        const { isAdmin, error } = await fetchMemberAdminFlag(supabase, userId);
        if (cancelled) return;
        if (error || !isAdmin) {
          setPhase('denied');
          return;
        }
        setPhase('allowed');
      })();

      return () => {
        cancelled = true;
      };
    }, [session?.user?.id])
  );

  useEffect(() => {
    if (phase !== 'denied') return;
    router.replace('/');
  }, [phase, router]);

  if (phase === 'checking') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#B24BF3" />
      </View>
    );
  }

  if (phase === 'denied') {
    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
