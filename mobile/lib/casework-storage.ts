import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  CaseworkAttachment,
  CaseworkMessage,
  CaseworkStatus,
  CaseworkTicket,
} from '@/types/casework';

const STORAGE_KEY = '@driverhub_casework';

export async function getStoredTickets(): Promise<CaseworkTicket[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function setStoredTickets(tickets: CaseworkTicket[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
}

export async function addTicket(ticket: CaseworkTicket): Promise<void> {
  const tickets = await getStoredTickets();
  tickets.unshift(ticket);
  await setStoredTickets(tickets);
}

export async function updateTicket(
  ticketId: string,
  update: Partial<Pick<CaseworkTicket, 'status' | 'messages' | 'updatedAt'>>
): Promise<CaseworkTicket | null> {
  const tickets = await getStoredTickets();
  const i = tickets.findIndex((t) => t.id === ticketId);
  if (i < 0) return null;
  tickets[i] = { ...tickets[i], ...update };
  await setStoredTickets(tickets);
  return tickets[i];
}

export async function addMessageToTicket(
  ticketId: string,
  message: CaseworkMessage
): Promise<void> {
  const tickets = await getStoredTickets();
  const t = tickets.find((x) => x.id === ticketId);
  if (!t) return;
  t.messages = t.messages ?? [];
  t.messages.push(message);
  t.updatedAt = new Date().toISOString();
  await setStoredTickets(tickets);
}
