import type { SupabaseClient } from '@supabase/supabase-js';

import type { MemberProfile } from '@/types/member';
import { emptyMemberProfile } from '@/types/member';
import type {
  CaseworkAttachment,
  CaseworkMessage,
  CaseworkStatus,
  CaseworkTicket,
  CaseworkType,
} from '@/types/casework';

export const CASEWORK_BUCKET = 'casework-attachments';

type CaseRow = {
  id: string;
  member_id: string | null;
  case_type: string;
  subject: string;
  status: string;
  assigned_admin_id: string | null;
  closure_requested: boolean;
  opened_by_admin: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  case_id: string;
  author_member_id: string;
  body: string;
  created_at: string;
};

type AttachmentRow = {
  id: string;
  case_id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  byte_size: number | null;
};

type MemberSnapRow = {
  id: string;
  name: string | null;
  badge_number: string | null;
  badge_expiry: string | null;
  vehicle_registration: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  plate_number: string | null;
  plate_expiry: string | null;
  membership_number: string | null;
  subscription_started_at: string | null;
  membership_status: string | null;
  membership_expiry: string | null;
};

function dateSlice(d: string | null): string {
  if (!d || d.length < 10) return '';
  return d.slice(0, 10);
}

function profileFromMemberRow(row: MemberSnapRow | null | undefined): MemberProfile {
  if (!row) return emptyMemberProfile();
  const ms = row.membership_status;
  return {
    name: row.name ?? '',
    badgeNumber: row.badge_number ?? '',
    badgeExpiry: dateSlice(row.badge_expiry),
    vehicleRegistration: row.vehicle_registration ?? '',
    vehicleMake: row.vehicle_make ?? '',
    vehicleModel: row.vehicle_model ?? '',
    plateNumber: row.plate_number ?? '',
    plateExpiry: dateSlice(row.plate_expiry),
    membershipNumber: row.membership_number ?? '',
    subscriptionStartDate: dateSlice(row.subscription_started_at),
    membershipStatus:
      ms === 'active' || ms === 'expired' ? ms : 'pending',
    membershipExpiry: dateSlice(row.membership_expiry),
  };
}

function mapMessage(row: MessageRow, caseMemberId: string | null): CaseworkMessage {
  const isMember = caseMemberId !== null && row.author_member_id === caseMemberId;
  return {
    id: row.id,
    ticketId: row.case_id,
    sender: isMember ? 'member' : 'admin',
    authorMemberId: row.author_member_id,
    text: row.body,
    createdAt: row.created_at,
  };
}

function randomPathSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export async function hydrateCases(
  supabase: SupabaseClient,
  cases: CaseRow[]
): Promise<{ tickets: CaseworkTicket[]; error: Error | null }> {
  if (cases.length === 0) return { tickets: [], error: null };
  const caseIds = cases.map((c) => c.id);
  const memberIds = [...new Set(cases.map((c) => c.member_id).filter(Boolean) as string[])];
  const needIds = memberIds;

  const memberMap = new Map<string, MemberSnapRow>();
  if (needIds.length > 0) {
    const { data: members, error: me } = await supabase
      .from('members')
      .select(
        'id, name, badge_number, badge_expiry, vehicle_registration, vehicle_make, vehicle_model, plate_number, plate_expiry, membership_number, subscription_started_at, membership_status, membership_expiry'
      )
      .in('id', needIds);
    if (me) return { tickets: [], error: me };
    for (const m of members ?? []) {
      memberMap.set((m as MemberSnapRow).id, m as MemberSnapRow);
    }
  }

  const { data: msgs, error: msge } = await supabase
    .from('casework_messages')
    .select('*')
    .in('case_id', caseIds)
    .order('created_at', { ascending: true });
  if (msge) return { tickets: [], error: msge };

  const { data: atts, error: atte } = await supabase
    .from('casework_attachments')
    .select('*')
    .in('case_id', caseIds);
  if (atte) return { tickets: [], error: atte };

  const msgByCase = new Map<string, MessageRow[]>();
  for (const m of msgs ?? []) {
    const row = m as MessageRow;
    const arr = msgByCase.get(row.case_id) ?? [];
    arr.push(row);
    msgByCase.set(row.case_id, arr);
  }

  const attByCase = new Map<string, AttachmentRow[]>();
  for (const a of atts ?? []) {
    const row = a as AttachmentRow;
    const arr = attByCase.get(row.case_id) ?? [];
    arr.push(row);
    attByCase.set(row.case_id, arr);
  }

  const tickets: CaseworkTicket[] = [];
  for (const c of cases) {
    const snapRow = c.member_id ? memberMap.get(c.member_id) : undefined;
    const messages = (msgByCase.get(c.id) ?? []).map((m) => mapMessage(m, c.member_id));
    const rawAtts = attByCase.get(c.id) ?? [];
    const attachments: CaseworkAttachment[] = await Promise.all(
      rawAtts.map(async (a) => {
        const { data } = await supabase.storage
          .from(CASEWORK_BUCKET)
          .createSignedUrl(a.storage_path, 3600);
        return {
          id: a.id,
          uri: data?.signedUrl ?? '',
          name: a.file_name ?? undefined,
          mimeType: a.mime_type ?? undefined,
          storagePath: a.storage_path,
          byteSize: a.byte_size ?? undefined,
        };
      })
    );

    tickets.push({
      id: c.id,
      memberId: c.member_id,
      memberSnapshot: profileFromMemberRow(snapRow),
      type: c.case_type as CaseworkType,
      subject: c.subject,
      status: c.status as CaseworkStatus,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      messages,
      attachments,
      closureRequested: c.closure_requested,
      openedByAdmin: c.opened_by_admin,
      assignedAdminId: c.assigned_admin_id,
      assignedAdminName: undefined,
    });
  }

  return { tickets, error: null };
}

export async function fetchCaseworkCasesForMember(
  supabase: SupabaseClient,
  userId: string
): Promise<{ tickets: CaseworkTicket[]; error: Error | null }> {
  const { data: cases, error: e1 } = await supabase
    .from('casework_cases')
    .select('*')
    .eq('member_id', userId)
    .order('updated_at', { ascending: false });
  if (e1 || !cases) return { tickets: [], error: e1 ?? new Error('fetch cases') };
  return hydrateCases(supabase, cases as CaseRow[]);
}

export async function fetchCaseworkCasesForAdmin(
  supabase: SupabaseClient
): Promise<{ tickets: CaseworkTicket[]; error: Error | null }> {
  const { data: cases, error: e1 } = await supabase
    .from('casework_cases')
    .select('*')
    .order('updated_at', { ascending: false });
  if (e1 || !cases) return { tickets: [], error: e1 ?? new Error('fetch cases') };
  return hydrateCases(supabase, cases as CaseRow[]);
}

export async function refreshCaseworkTicket(
  supabase: SupabaseClient,
  caseId: string
): Promise<{ ticket: CaseworkTicket | null; error: Error | null }> {
  const { data: caseRow, error } = await supabase
    .from('casework_cases')
    .select('*')
    .eq('id', caseId)
    .maybeSingle();
  if (error || !caseRow) return { ticket: null, error: error ?? new Error('not found') };
  const { tickets, error: h } = await hydrateCases(supabase, [caseRow as CaseRow]);
  if (h) return { ticket: null, error: h };
  return { ticket: tickets[0] ?? null, error: null };
}

export async function searchMembersByName(
  supabase: SupabaseClient,
  q: string,
  limit = 30
): Promise<{ rows: { id: string; name: string; badgeNumber: string }[]; error: Error | null }> {
  const term = q.trim().replace(/%/g, '').replace(/_/g, '');
  if (term.length < 2) return { rows: [], error: null };
  const { data, error } = await supabase
    .from('members')
    .select('id, name, badge_number')
    .ilike('name', `%${term}%`)
    .limit(limit);
  if (error) return { rows: [], error };
  return {
    rows: (data ?? []).map((r: { id: string; name: string | null; badge_number: string | null }) => ({
      id: r.id,
      name: r.name ?? '',
      badgeNumber: r.badge_number ?? '',
    })),
    error: null,
  };
}

export async function uploadFileToCase(
  supabase: SupabaseClient,
  caseId: string,
  localUri: string,
  fileName: string,
  mimeType: string | undefined,
  uploadedBy: string,
  messageId: string | null
): Promise<{ error: Error | null }> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120);
  const path = `${caseId}/${randomPathSuffix()}_${safeName}`;

  const res = await fetch(localUri);
  const buf = await res.arrayBuffer();

  const { error: upErr } = await supabase.storage
    .from(CASEWORK_BUCKET)
    .upload(path, buf, {
      contentType: mimeType || 'application/octet-stream',
      upsert: false,
    });
  if (upErr) return { error: upErr };

  const { error: rowErr } = await supabase.from('casework_attachments').insert({
    case_id: caseId,
    message_id: messageId,
    storage_path: path,
    file_name: fileName,
    mime_type: mimeType ?? null,
    byte_size: buf.byteLength,
    uploaded_by: uploadedBy,
  });
  return { error: rowErr ?? null };
}
export async function createMemberCaseworkCase(
  supabase: SupabaseClient,
  userId: string,
  input: {
    type: CaseworkType;
    subject: string;
    message: string;
    attachments: { uri: string; name?: string; mimeType?: string }[];
  }
): Promise<{ ticket: CaseworkTicket | null; error: Error | null }> {
  const { data: caseRow, error: e1 } = await supabase
    .from('casework_cases')
    .insert({
      member_id: userId,
      case_type: input.type,
      subject: input.subject || input.type,
      status: 'case_open',
      created_by_id: userId,
      opened_by_admin: false,
    })
    .select()
    .single();
  if (e1 || !caseRow) return { ticket: null, error: e1 ?? new Error('insert case') };

  const cid = caseRow.id as string;

  const { error: e2 } = await supabase.from('casework_messages').insert({
    case_id: cid,
    author_member_id: userId,
    body: input.message.trim(),
  });
  if (e2) return { ticket: null, error: e2 };

  for (const att of input.attachments) {
    const { error: ue } = await uploadFileToCase(
      supabase,
      cid,
      att.uri,
      att.name ?? 'attachment',
      att.mimeType,
      userId,
      null
    );
    if (ue) return { ticket: null, error: ue };
  }

  const { tickets } = await hydrateCases(supabase, [caseRow as CaseRow]);
  return { ticket: tickets[0] ?? null, error: null };
}

export async function createAdminInternalCase(
  supabase: SupabaseClient,
  adminMemberId: string,
  input: { title: string; casenotes: string; status: CaseworkStatus }
): Promise<{ ticket: CaseworkTicket | null; error: Error | null }> {
  const { data: caseRow, error: e1 } = await supabase
    .from('casework_cases')
    .insert({
      member_id: null,
      case_type: 'Something Else',
      subject: input.title.trim(),
      status: input.status,
      created_by_id: adminMemberId,
      opened_by_admin: true,
    })
    .select()
    .single();
  if (e1 || !caseRow) return { ticket: null, error: e1 ?? new Error('insert') };

  const cid = caseRow.id as string;
  const { error: e2 } = await supabase.from('casework_messages').insert({
    case_id: cid,
    author_member_id: adminMemberId,
    body: input.casenotes.trim(),
  });
  if (e2) return { ticket: null, error: e2 };

  const { tickets } = await hydrateCases(supabase, [caseRow as CaseRow]);
  return { ticket: tickets[0] ?? null, error: null };
}

export async function createAdminCaseForMember(
  supabase: SupabaseClient,
  adminMemberId: string,
  targetMemberId: string,
  input: {
    type: CaseworkType;
    subject: string;
    message: string;
    attachments: { uri: string; name?: string; mimeType?: string }[];
  }
): Promise<{ ticket: CaseworkTicket | null; error: Error | null }> {
  const { data: caseRow, error: e1 } = await supabase
    .from('casework_cases')
    .insert({
      member_id: targetMemberId,
      case_type: input.type,
      subject: input.subject.trim() || input.type,
      status: 'case_open',
      created_by_id: adminMemberId,
      opened_by_admin: true,
    })
    .select()
    .single();
  if (e1 || !caseRow) return { ticket: null, error: e1 ?? new Error('insert') };

  const cid = caseRow.id as string;
  const { error: e2 } = await supabase.from('casework_messages').insert({
    case_id: cid,
    author_member_id: adminMemberId,
    body: input.message.trim() || '(Case opened on your behalf)',
  });
  if (e2) return { ticket: null, error: e2 };

  for (const att of input.attachments) {
    const { error: ue } = await uploadFileToCase(
      supabase,
      cid,
      att.uri,
      att.name ?? 'attachment',
      att.mimeType,
      adminMemberId,
      null
    );
    if (ue) return { ticket: null, error: ue };
  }

  const { tickets } = await hydrateCases(supabase, [caseRow as CaseRow]);
  return { ticket: tickets[0] ?? null, error: null };
}

export async function addCaseworkMessage(
  supabase: SupabaseClient,
  caseId: string,
  authorMemberId: string,
  body: string
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('casework_messages')
    .insert({
      case_id: caseId,
      author_member_id: authorMemberId,
      body: body.trim(),
    })
    .select('id')
    .single();
  return { data, error: error ?? null };
}

export async function addCaseworkReplyWithOptionalAttachments(
  supabase: SupabaseClient,
  caseId: string,
  authorMemberId: string,
  body: string,
  attachments: { uri: string; name?: string; mimeType?: string }[]
): Promise<{ error: Error | null }> {
  const { data, error: e1 } = await addCaseworkMessage(supabase, caseId, authorMemberId, body || ' ');
  if (e1 || !data) return { error: e1 ?? new Error('message') };
  const mid = data.id;
  for (const att of attachments) {
    const { error: ue } = await uploadFileToCase(
      supabase,
      caseId,
      att.uri,
      att.name ?? 'attachment',
      att.mimeType,
      authorMemberId,
      mid
    );
    if (ue) return { error: ue };
  }
  return { error: null };
}

export async function updateCaseworkCaseStatus(
  supabase: SupabaseClient,
  caseId: string,
  status: CaseworkStatus
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from('casework_cases').update({ status }).eq('id', caseId);
  return { error: error ?? null };
}

export async function requestCaseworkClosure(
  supabase: SupabaseClient,
  caseId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.rpc('casework_request_closure', { p_case_id: caseId });
  return { error: error ?? null };
}

export async function clearCaseworkClosureFlag(
  supabase: SupabaseClient,
  caseId: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('casework_cases')
    .update({ closure_requested: false })
    .eq('id', caseId);
  return { error: error ?? null };
}

