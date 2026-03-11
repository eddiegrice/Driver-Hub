import React, { useCallback, createContext, useContext, useEffect, useState } from 'react';

import {
  addTicket as addTicketStorage,
  addMessageToTicket,
  getStoredTickets,
  setStoredTickets,
  updateTicket as updateTicketStorage,
} from '@/lib/casework-storage';
import type {
  CaseworkMessage,
  CaseworkStatus,
  CaseworkTicket,
} from '@/types/casework';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

type CaseworkContextValue = {
  tickets: CaseworkTicket[];
  isLoading: boolean;
  refreshTickets: () => Promise<void>;
  getTicket: (id: string) => CaseworkTicket | undefined;
  createTicket: (ticket: Omit<CaseworkTicket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CaseworkTicket>;
  addMessage: (ticketId: string, sender: string, text: string) => Promise<void>;
  setTicketStatus: (ticketId: string, status: CaseworkStatus) => Promise<void>;
};

const CaseworkContext = createContext<CaseworkContextValue | null>(null);

export function CaseworkProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<CaseworkTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshTickets = useCallback(async () => {
    setIsLoading(true);
    const list = await getStoredTickets();
    setTickets(list);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  const getTicket = useCallback(
    (id: string) => tickets.find((t) => t.id === id),
    [tickets]
  );

  const createTicket = useCallback(
    async (
      t: Omit<CaseworkTicket, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<CaseworkTicket> => {
      const now = new Date().toISOString();
      const id = `ticket-${generateId()}`;
      const messages = (t.messages ?? []).map((m) => ({ ...m, ticketId: id }));
      const ticket: CaseworkTicket = {
        ...t,
        id,
        createdAt: now,
        updatedAt: now,
        messages,
        attachments: t.attachments ?? [],
      };
      await addTicketStorage(ticket);
      setTickets((prev) => [ticket, ...prev]);
      return ticket;
    },
    []
  );

  const addMessage = useCallback(async (ticketId: string, sender: string, text: string) => {
    const msg: CaseworkMessage = {
      id: `msg-${generateId()}`,
      ticketId,
      sender,
      text,
      createdAt: new Date().toISOString(),
    };
    await addMessageToTicket(ticketId, msg);
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? { ...t, messages: [...(t.messages ?? []), msg], updatedAt: msg.createdAt }
          : t
      )
    );
  }, []);

  const setTicketStatus = useCallback(async (ticketId: string, status: CaseworkStatus) => {
    const updated = await updateTicketStorage(ticketId, {
      status,
      updatedAt: new Date().toISOString(),
    });
    if (updated) {
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status, updatedAt: updated.updatedAt } : t))
      );
    }
  }, []);

  const value: CaseworkContextValue = {
    tickets,
    isLoading,
    refreshTickets,
    getTicket,
    createTicket,
    addMessage,
    setTicketStatus,
  };

  return (
    <CaseworkContext.Provider value={value}>{children}</CaseworkContext.Provider>
  );
}

export function useCasework(): CaseworkContextValue {
  const ctx = useContext(CaseworkContext);
  if (!ctx) throw new Error('useCasework must be used inside CaseworkProvider');
  return ctx;
}
