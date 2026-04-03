import React, { useCallback, createContext, useContext, useEffect, useMemo, useState } from 'react';

import { usePathname } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useMember } from '@/context/MemberContext';
import {
  addCaseworkReplyWithOptionalAttachments,
  createAdminCaseForMember,
  createAdminInternalCase,
  createMemberCaseworkCase,
  fetchCaseworkCasesForAdmin,
  fetchCaseworkCasesForMember,
  refreshCaseworkTicket,
  requestCaseworkClosure,
  updateCaseworkCaseStatus,
} from '@/lib/casework-supabase';
import { supabase } from '@/lib/supabase';
import type { CaseworkStatus, CaseworkTicket, CaseworkType } from '@/types/casework';

type CreateTicketInput = {
  type: CaseworkType;
  subject: string;
  message: string;
  attachments: { uri: string; name?: string; mimeType?: string }[];
};

type CaseworkContextValue = {
  tickets: CaseworkTicket[];
  isLoading: boolean;
  remoteReady: boolean;
  refreshTickets: () => Promise<void>;
  refreshTicket: (id: string) => Promise<void>;
  getTicket: (id: string) => CaseworkTicket | undefined;
  createTicket: (input: CreateTicketInput) => Promise<CaseworkTicket | null>;
  addReply: (
    ticketId: string,
    text: string,
    attachments?: { uri: string; name?: string; mimeType?: string }[]
  ) => Promise<{ error: Error | null }>;
  requestClosure: (ticketId: string) => Promise<{ error: Error | null }>;
  setTicketStatus: (ticketId: string, status: CaseworkStatus) => Promise<{ error: Error | null }>;
  createInternalCase: (input: {
    title: string;
    casenotes: string;
    status: CaseworkStatus;
  }) => Promise<CaseworkTicket | null>;
  createCaseForMember: (
    targetMemberId: string,
    input: CreateTicketInput
  ) => Promise<CaseworkTicket | null>;
};

const CaseworkContext = createContext<CaseworkContextValue | null>(null);

export function CaseworkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { memberStatus } = useMember();
  const pathname = usePathname() ?? '';
  const adminCaseworkRoute =
    memberStatus.isAdmin && pathname.startsWith('/admin/casework');
  const [tickets, setTickets] = useState<CaseworkTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const remoteReady = Boolean(supabase && user?.id);

  const refreshTickets = useCallback(async () => {
    if (!supabase || !user?.id) {
      setTickets([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      if (adminCaseworkRoute) {
        const { tickets: list, error } = await fetchCaseworkCasesForAdmin(supabase);
        if (!error) setTickets(list);
      } else {
        const { tickets: list, error } = await fetchCaseworkCasesForMember(supabase, user.id);
        if (!error) setTickets(list);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, adminCaseworkRoute]);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  useEffect(() => {
    if (!supabase || !user?.id) return;

    const channel = supabase
      .channel('casework-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'casework_cases' },
        () => {
          void refreshTickets();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'casework_messages' },
        () => {
          void refreshTickets();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'casework_attachments' },
        () => {
          void refreshTickets();
        }
      )
      .subscribe();

    return () => {
      if (supabase) void supabase.removeChannel(channel);
    };
  }, [supabase, user?.id, refreshTickets]);

  const getTicket = useCallback(
    (id: string) => tickets.find((t) => t.id === id),
    [tickets]
  );

  const refreshTicket = useCallback(
    async (id: string) => {
      if (!supabase) return;
      const { ticket, error } = await refreshCaseworkTicket(supabase, id);
      if (error || !ticket) return;
      setTickets((prev) => {
        const i = prev.findIndex((t) => t.id === id);
        if (i < 0) return [ticket, ...prev];
        const next = [...prev];
        next[i] = ticket;
        return next;
      });
    },
    []
  );

  const createTicket = useCallback(
    async (input: CreateTicketInput): Promise<CaseworkTicket | null> => {
      if (!supabase || !user?.id) return null;
      const { ticket, error } = await createMemberCaseworkCase(supabase, user.id, input);
      if (error || !ticket) return null;
      setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
      return ticket;
    },
    [user?.id]
  );

  const addReply = useCallback(
    async (
      ticketId: string,
      text: string,
      attachments?: { uri: string; name?: string; mimeType?: string }[]
    ) => {
      if (!supabase || !user?.id) return { error: new Error('Not signed in') };
      const trimmed = text.trim();
      const atts = attachments ?? [];
      if (!trimmed && atts.length === 0) return { error: new Error('Empty') };
      const body = trimmed || '(Attachment)';
      const { error } = await addCaseworkReplyWithOptionalAttachments(
        supabase,
        ticketId,
        user.id,
        body,
        atts
      );
      if (!error) await refreshTickets();
      return { error };
    },
    [user?.id, refreshTickets]
  );

  const requestClosure = useCallback(
    async (ticketId: string) => {
      if (!supabase) return { error: new Error('No supabase') };
      const { error } = await requestCaseworkClosure(supabase, ticketId);
      if (!error) await refreshTickets();
      return { error };
    },
    [refreshTickets]
  );

  const setTicketStatus = useCallback(
    async (ticketId: string, status: CaseworkStatus) => {
      if (!supabase) return { error: new Error('No supabase') };
      const { error } = await updateCaseworkCaseStatus(supabase, ticketId, status);
      if (!error) await refreshTickets();
      return { error };
    },
    [refreshTickets]
  );

  const createInternalCase = useCallback(
    async (input: { title: string; casenotes: string; status: CaseworkStatus }) => {
      if (!supabase || !user?.id) return null;
      const { ticket, error } = await createAdminInternalCase(supabase, user.id, input);
      if (error || !ticket) return null;
      setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
      return ticket;
    },
    [user?.id]
  );

  const createCaseForMember = useCallback(
    async (targetMemberId: string, input: CreateTicketInput) => {
      if (!supabase || !user?.id) return null;
      const { ticket, error } = await createAdminCaseForMember(
        supabase,
        user.id,
        targetMemberId,
        input
      );
      if (error || !ticket) return null;
      setTickets((prev) => [ticket, ...prev.filter((t) => t.id !== ticket.id)]);
      return ticket;
    },
    [user?.id]
  );

  const value = useMemo(
    (): CaseworkContextValue => ({
      tickets,
      isLoading,
      remoteReady,
      refreshTickets,
      refreshTicket,
      getTicket,
      createTicket,
      addReply,
      requestClosure,
      setTicketStatus,
      createInternalCase,
      createCaseForMember,
    }),
    [
      tickets,
      isLoading,
      remoteReady,
      refreshTickets,
      refreshTicket,
      getTicket,
      createTicket,
      addReply,
      requestClosure,
      setTicketStatus,
      createInternalCase,
      createCaseForMember,
    ]
  );

  return <CaseworkContext.Provider value={value}>{children}</CaseworkContext.Provider>;
}

export function useCasework(): CaseworkContextValue {
  const ctx = useContext(CaseworkContext);
  if (!ctx) throw new Error('useCasework must be used inside CaseworkProvider');
  return ctx;
}
