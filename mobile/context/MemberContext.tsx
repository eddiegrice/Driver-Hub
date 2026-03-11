import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { getMemberWithStatus, saveMemberToSupabase, type MemberStatus } from '@/lib/member-supabase';
import { getStoredMember, setStoredMember } from '@/lib/member-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { MemberProfile } from '@/types/member';
import { emptyMemberProfile } from '@/types/member';
import { useAuth } from '@/context/AuthContext';

type MemberContextValue = {
  member: MemberProfile;
  memberStatus: MemberStatus;
  isLoading: boolean;
  setMember: (profile: MemberProfile) => void;
  saveMember: (profile: MemberProfile) => Promise<void>;
  refreshMember: () => Promise<void>;
};

const MemberContext = createContext<MemberContextValue | null>(null);

const defaultMemberStatus: MemberStatus = { isActive: true, membershipStatus: 'active' };

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [member, setMemberState] = useState<MemberProfile>(() => emptyMemberProfile());
  const [memberStatus, setMemberStatus] = useState<MemberStatus>(() => defaultMemberStatus);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMember = useCallback(async () => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase && session?.user?.id) {
      const result = await getMemberWithStatus(supabase, session.user.id);
      if (result) {
        setMemberState(result.profile);
        setMemberStatus(result.status);
      } else {
        setMemberState(emptyMemberProfile());
        setMemberStatus({ isActive: false, membershipStatus: 'expired' });
      }
    } else {
      const stored = await getStoredMember();
      setMemberState(stored ?? emptyMemberProfile());
      setMemberStatus(defaultMemberStatus);
    }
    setIsLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    refreshMember();
  }, [refreshMember]);

  const setMember = useCallback((profile: MemberProfile) => {
    setMemberState(profile);
  }, []);

  const saveMember = useCallback(async (profile: MemberProfile) => {
    if (isSupabaseConfigured && supabase && session?.user?.id) {
      const { error } = await saveMemberToSupabase(supabase, session.user.id, profile);
      if (error) throw error;
    } else {
      await setStoredMember(profile);
    }
    setMemberState(profile);
  }, [session?.user?.id]);

  const value: MemberContextValue = {
    member,
    memberStatus,
    isLoading,
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
