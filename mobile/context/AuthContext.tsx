import * as Linking from 'expo-linking';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

/** Deep link the app uses for magic link callback (must match Supabase Redirect URLs). */
export const AUTH_REDIRECT_SCHEME = 'mobile://auth/callback';

function parseTokensFromUrl(url: string): { access_token?: string; refresh_token?: string } | null {
  const hash = url.includes('#') ? url.split('#')[1] : '';
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const access_token = params.get('access_token') ?? undefined;
  const refresh_token = params.get('refresh_token') ?? undefined;
  if (access_token && refresh_token) return { access_token, refresh_token };
  return null;
}

async function createSessionFromUrl(url: string): Promise<boolean> {
  if (!supabase) return false;
  const tokens = parseTokensFromUrl(url);
  if (!tokens) return false;
  const { error } = await supabase.auth.setSession({
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
  });
  return !error;
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isSupabaseConfigured: boolean;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  verifyEmailCode: (email: string, code: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSession(null);
      setIsLoading(false);
      return;
    }
    try {
      const { data: { session: s } } = await supabase.auth.getSession();
      setSession(s);
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();

    if (!isSupabaseConfigured || !supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    const handleDeepLink = async (event: { url: string }) => {
      if (event.url.startsWith(AUTH_REDIRECT_SCHEME)) {
        await createSessionFromUrl(event.url);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url && url.startsWith(AUTH_REDIRECT_SCHEME)) {
        createSessionFromUrl(url).then(() => refreshSession());
      }
    });

    const sub = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.unsubscribe();
      sub.remove();
    };
  }, [refreshSession]);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: AUTH_REDIRECT_SCHEME },
    });
    return { error: error ?? null };
  }, []);

  const verifyEmailCode = useCallback(async (email: string, code: string) => {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase not configured') };
    }
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'email',
    });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
    setSession(null);
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isLoading,
    isSupabaseConfigured,
    signInWithEmail,
    verifyEmailCode,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
