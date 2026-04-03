```typescript
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

export async function updateCaseworkAssignedAdmin(
  supabase: SupabaseClient,
  caseId: string,
  assignedAdminId: string | null
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('casework_cases')
    .update({ assigned_admin_id: assignedAdminId })
    .eq('id', caseId);
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

export async function listAdminMembersForAssign(
  supabase: SupabaseClient
): Promise<{ rows: { id: string; name: string }[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('members')
    .select('id, name')
    .eq('is_admin', true)
    .order('name');
  if (error) return { rows: [], error };
  return {
    rows: (data ?? []).map((r: { id: string; name: string | null }) => ({
      id: r.id,
      name: r.name ?? '',
    })),
    error: null,
  };
}
```
