import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import {
  getMemberWithStatus,
  saveMemberToSupabase,
  type MemberStatus,
  type MemberWithStatusResult,
} from '@/lib/member-supabase';
import { getStoredMember, setStoredMember } from '@/lib/member-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { MemberProfile } from '@/types/member';
import { emptyMemberProfile } from '@/types/member';
import { useAuth } from '@/context/AuthContext';

type MemberContextValue = {
  member: MemberProfile;
  memberStatus: MemberStatus;
  isLoading: boolean;
  /** Last Supabase members fetch when signed in: ok, no visible row (often id mismatch), or request error. */
  memberLoadResult: 'idle' | 'ok' | 'no_row' | 'error';
  memberLoadErrorMessage: string | null;
  setMember: (profile: MemberProfile) => void;
  saveMember: (profile: MemberProfile) => Promise<void>;
  refreshMember: () => Promise<void>;
};

const MemberContext = createContext<MemberContextValue | null>(null);

const defaultMemberStatus: MemberStatus = {
  isActive: true,
  membershipStatus: 'active',
  isChatModerator: false,
  isAdmin: false,
};

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [member, setMemberState] = useState<MemberProfile>(() => emptyMemberProfile());
  const [memberStatus, setMemberStatus] = useState<MemberStatus>(() => defaultMemberStatus);
  const [isLoading, setIsLoading] = useState(true);
  const [memberLoadResult, setMemberLoadResult] = useState<'idle' | 'ok' | 'no_row' | 'error'>('idle');
  const [memberLoadErrorMessage, setMemberLoadErrorMessage] = useState<string | null>(null);

  const applyMemberResult = useCallback((result: MemberWithStatusResult) => {
    if (result.ok) {
      setMemberLoadResult('ok');
      setMemberLoadErrorMessage(null);
      setMemberState(result.profile);
      setMemberStatus(result.status);
      return;
    }
    if (result.error) {
      setMemberLoadResult('error');
      setMemberLoadErrorMessage(result.error.message);
    } else {
      setMemberLoadResult('no_row');
      setMemberLoadErrorMessage(null);
    }
    setMemberState(emptyMemberProfile());
    setMemberStatus({ isActive: false, membershipStatus: 'expired', isChatModerator: false, isAdmin: false });
  }, []);

  const refreshMember = useCallback(async () => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase && session?.user?.id) {
      const result = await getMemberWithStatus(supabase, session.user.id);
      applyMemberResult(result);
    } else {
      setMemberLoadResult('idle');
      setMemberLoadErrorMessage(null);
      const stored = await getStoredMember();
      setMemberState(stored ?? emptyMemberProfile());
      setMemberStatus(defaultMemberStatus);
    }
    setIsLoading(false);
  }, [session?.user?.id, applyMemberResult]);

  useEffect(() => {
    refreshMember();
  }, [refreshMember]);

  const setMember = useCallback((profile: MemberProfile) => {
    setMemberState(profile);
  }, []);

  const saveMember = useCallback(
    async (profile: MemberProfile) => {
      if (isSupabaseConfigured && supabase && session?.user?.id) {
        const { error } = await saveMemberToSupabase(supabase, session.user.id, profile);
        if (error) throw error;
        const result = await getMemberWithStatus(supabase, session.user.id);
        applyMemberResult(result);
        return;
      } else {
        await setStoredMember(profile);
      }
      setMemberState(profile);
    },
    [session?.user?.id, applyMemberResult]
  );

  const value: MemberContextValue = {
    member,
    memberStatus,
    isLoading,
    memberLoadResult,
    memberLoadErrorMessage,
    setMember,
    saveMember,
    refreshMember,
  };

  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

export function useMember(): MemberContextValue {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error('useMember must be used inside MemberProvider');
  return ctx;
}
