/**
 * Casework (helpdesk) tickets and messages. Stored on device for now; later synced with backend.
 */
import type { MemberProfile } from './member';

export const CASEWORK_STATUSES = [
  'sent_pending',
  'being_reviewed',
  'being_actioned',
  'resolved',
  'closed',
] as const;
export type CaseworkStatus = (typeof CASEWORK_STATUSES)[number];

export const CASEWORK_TYPES = [
  'Badge / licence query',
  'Vehicle / plate query',
  'Compliance or suspension',
  'Other',
] as const;
export type CaseworkType = (typeof CASEWORK_TYPES)[number];

export interface CaseworkAttachment {
  id: string;
  uri: string;
  name?: string;
  mimeType?: string;
}

export interface CaseworkMessage {
  id: string;
  ticketId: string;
  /** 'member' | 'admin' - who sent it */
  sender: string;
  text: string;
  createdAt: string; // ISO
}

export interface CaseworkTicket {
  id: string;
  /** Snapshot of member profile when ticket was created (for admin context) */
  memberSnapshot: MemberProfile;
  type: CaseworkType;
  subject: string;
  status: CaseworkStatus;
  createdAt: string; // ISO
  updatedAt: string;
  messages: CaseworkMessage[];
  attachments: CaseworkAttachment[];
}

export function statusLabel(status: CaseworkStatus): string {
  const map: Record<CaseworkStatus, string> = {
    sent_pending: 'Sent / Pending',
    being_reviewed: 'Being reviewed',
    being_actioned: 'Being actioned',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return map[status] ?? status;
}
