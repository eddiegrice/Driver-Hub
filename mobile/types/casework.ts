/**
 * Casework types — backed by Supabase (see docs/casework-schema.sql).
 */
import type { MemberProfile } from './member';

export const CASEWORK_STATUSES = [
  'case_open',
  'investigating',
  'actioning',
  'closed_no_resolution',
  'closed_resolved',
] as const;
export type CaseworkStatus = (typeof CASEWORK_STATUSES)[number];

export const CASEWORK_TYPES = [
  'PHDL (Badge) Issue',
  'PHCL (Plate) Issue',
  'Medical Related',
  'Cars and Inspections',
  'Hearings and Enforcement',
  'Something Else',
] as const;
export type CaseworkType = (typeof CASEWORK_TYPES)[number];

export interface CaseworkAttachment {
  id: string;
  uri: string;
  name?: string;
  mimeType?: string;
  storagePath?: string;
  byteSize?: number;
}

export interface CaseworkMessage {
  id: string;
  ticketId: string;
  sender: 'member' | 'admin';
  authorMemberId: string;
  text: string;
  createdAt: string;
}

export interface CaseworkTicket {
  id: string;
  memberId: string | null;
  memberSnapshot: MemberProfile;
  type: CaseworkType;
  subject: string;
  status: CaseworkStatus;
  createdAt: string;
  updatedAt: string;
  messages: CaseworkMessage[];
  attachments: CaseworkAttachment[];
  closureRequested: boolean;
  openedByAdmin: boolean;
  assignedAdminId: string | null;
  assignedAdminName?: string;
}

export function statusLabel(status: CaseworkStatus): string {
  const map: Record<CaseworkStatus, string> = {
    case_open: 'Case Open',
    investigating: 'Investigating',
    actioning: 'Actioning',
    closed_no_resolution: 'Closed - No Resolution',
    closed_resolved: 'Closed - Resolved',
  };
  return map[status] ?? status;
}

export const CLOSED_STATUSES: CaseworkStatus[] = ['closed_no_resolution', 'closed_resolved'];

export function isClosedStatus(s: CaseworkStatus): boolean {
  return CLOSED_STATUSES.includes(s);
}
