import type { SupabaseClient } from '@supabase/supabase-js';

import type {
  Poll,
  PollAnswer,
  PollKind,
  PollQuestion,
  PollQuestionTypeDb,
  PollResponse,
  PollResultsAdmin,
  PollResultsMember,
} from '@/types/polls';
import { dbTypeToUi } from '@/types/polls';

type InstrumentRow = {
  id: string;
  kind: PollKind;
  title: string;
  description: string;
  publish_at: string;
  close_at: string;
  archived_at: string | null;
  results_published_at: string | null;
};

type QuestionRow = {
  id: string;
  sort_order: number;
  prompt: string;
  question_type: PollQuestionTypeDb;
  allow_write_in: boolean;
  poll_question_options?: OptionRow[] | null;
};

type OptionRow = {
  id: string;
  sort_order: number;
  label: string;
  is_write_in_slot: boolean;
};

function sortBySortOrder<T extends { sort_order: number; id: string }>(rows: T[] | null | undefined): T[] {
  return [...(rows ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}

export function mapInstrumentToPoll(row: InstrumentRow, questions: QuestionRow[]): Poll {
  const qs = sortBySortOrder(questions).map((q): PollQuestion => {
    const opts = sortBySortOrder(q.poll_question_options ?? []).map((o) => ({
      id: o.id,
      text: o.label,
      isWriteInSlot: o.is_write_in_slot,
    }));
    return {
      id: q.id,
      questionText: q.prompt,
      dbType: q.question_type,
      type: dbTypeToUi(q.question_type),
      options: opts,
      allowWriteIn: q.allow_write_in,
    };
  });

  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description ?? '',
    publishAt: row.publish_at,
    closeAt: row.close_at,
    archivedAt: row.archived_at,
    resultsPublishedAt: row.results_published_at,
    questions: qs,
    isAnonymous: true,
  };
}

const INSTRUMENT_SELECT = `
  id, kind, title, description, publish_at, close_at, archived_at, results_published_at,
  poll_questions (
    id, sort_order, prompt, question_type, allow_write_in,
    poll_question_options ( id, sort_order, label, is_write_in_slot )
  )
`;

export async function fetchPollsForMember(
  client: SupabaseClient
): Promise<{ polls: Poll[]; error: Error | null }> {
  const { data, error } = await client
    .from('poll_instruments')
    .select(INSTRUMENT_SELECT)
    .order('close_at', { ascending: true });

  if (error) return { polls: [], error: new Error(error.message) };
  const polls = (data as unknown as (InstrumentRow & { poll_questions: QuestionRow[] | null })[]).map((row) =>
    mapInstrumentToPoll(row, row.poll_questions ?? [])
  );
  return { polls, error: null };
}

export async function fetchPollInstrumentById(
  client: SupabaseClient,
  id: string
): Promise<{ poll: Poll | null; error: Error | null }> {
  const { data, error } = await client
    .from('poll_instruments')
    .select(INSTRUMENT_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) return { poll: null, error: new Error(error.message) };
  if (!data) return { poll: null, error: null };
  const row = data as unknown as InstrumentRow & { poll_questions: QuestionRow[] | null };
  return { poll: mapInstrumentToPoll(row, row.poll_questions ?? []), error: null };
}

export async function fetchPollsForAdmin(
  client: SupabaseClient
): Promise<{ polls: Poll[]; error: Error | null }> {
  return fetchPollsForMember(client);
}

export async function fetchMemberHasResponse(
  client: SupabaseClient,
  instrumentId: string
): Promise<{ submitted: boolean; submittedAt: string | null; error: Error | null }> {
  const { data, error } = await client
    .from('poll_responses')
    .select('submitted_at')
    .eq('instrument_id', instrumentId)
    .maybeSingle();

  if (error) return { submitted: false, submittedAt: null, error: new Error(error.message) };
  if (!data) return { submitted: false, submittedAt: null, error: null };
  return { submitted: true, submittedAt: (data as { submitted_at: string }).submitted_at, error: null };
}

/** All current user's poll/survey submissions (RLS: own rows only). */
export async function fetchMyPollResponseSummaries(client: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await client.from('poll_responses').select('instrument_id, submitted_at');
  const m = new Map<string, string>();
  if (error || !data) return m;
  for (const row of data as { instrument_id: string; submitted_at: string }[]) {
    m.set(row.instrument_id, row.submitted_at);
  }
  return m;
}

function buildRpcAnswers(answers: PollAnswer[]): Record<string, unknown>[] {
  return answers.map((a) => ({
    question_id: a.questionId,
    option_ids: a.optionIds ?? [],
    text_value: a.freeText ?? null,
    number_value: a.numberValue ?? null,
    write_in_text: a.writeInText ?? null,
  }));
}

export async function submitPollResponseRpc(
  client: SupabaseClient,
  instrumentId: string,
  answers: PollAnswer[]
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await client.rpc('submit_poll_response', {
    p_instrument_id: instrumentId,
    p_answers: buildRpcAnswers(answers),
  });

  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string } | null;
  if (!row?.ok) return { ok: false, error: row?.error ?? 'Submit failed' };
  return { ok: true, error: null };
}

export async function getPollPublicResultsRpc(
  client: SupabaseClient,
  instrumentId: string
): Promise<{ results: PollResultsMember | null; error: string | null }> {
  const { data, error } = await client.rpc('get_poll_public_results', {
    p_instrument_id: instrumentId,
  });

  if (error) return { results: null, error: error.message };
  const row = data as { error?: string; questions?: unknown } | null;
  if (row?.error) return { results: null, error: row.error };
  const qs = (row?.questions as unknown[]) ?? [];
  const questions: PollResultsMember['questions'] = [];
  for (const q of qs) {
    const o = q as Record<string, unknown>;
    const optsRaw = (o.options as unknown[]) ?? [];
    const options = optsRaw.map((x) => {
      const r = x as Record<string, unknown>;
      return {
        optionId: String(r.option_id),
        label: String(r.label),
        percent: Number(r.percent) || 0,
      };
    });
    questions.push({
      questionId: String(o.question_id),
      prompt: String(o.prompt ?? ''),
      questionType: String(o.question_type ?? ''),
      options,
    });
  }
  return { results: { questions }, error: null };
}

export async function getPollAdminResultsRpc(
  client: SupabaseClient,
  instrumentId: string
): Promise<{ results: PollResultsAdmin | null; error: string | null }> {
  const { data, error } = await client.rpc('get_poll_admin_results', {
    p_instrument_id: instrumentId,
  });

  if (error) return { results: null, error: error.message };
  const row = data as Record<string, unknown> | null;
  if (row?.error) return { results: null, error: String(row.error) };
  return {
    results: {
      instrumentId: String(row?.instrument_id ?? instrumentId),
      totalResponses: Number(row?.total_responses ?? 0),
      questions: (row?.questions as unknown[]) ?? [],
    },
    error: null,
  };
}

export async function approvePollResultsRpc(
  client: SupabaseClient,
  instrumentId: string
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await client.rpc('approve_poll_results', { p_instrument_id: instrumentId });
  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string } | null;
  if (!row?.ok) return { ok: false, error: row?.error ?? 'Approve failed' };
  return { ok: true, error: null };
}

export async function archivePollInstrumentRpc(
  client: SupabaseClient,
  instrumentId: string
): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await client.rpc('archive_poll_instrument', { p_instrument_id: instrumentId });
  if (error) return { ok: false, error: error.message };
  const row = data as { ok?: boolean; error?: string } | null;
  if (!row?.ok) return { ok: false, error: row?.error ?? 'Archive failed' };
  return { ok: true, error: null };
}

export type CreatePollQuestionInput = {
  prompt: string;
  questionType: PollQuestionTypeDb;
  allowWriteIn: boolean;
  options: { label: string; isWriteInSlot: boolean }[];
};

export type CreatePollInstrumentInput = {
  kind: PollKind;
  title: string;
  description: string;
  publishAt: string;
  closeAt: string;
  questions: CreatePollQuestionInput[];
};

export async function createPollInstrument(
  client: SupabaseClient,
  input: CreatePollInstrumentInput,
  createdBy: string | null
): Promise<{ id: string | null; error: Error | null }> {
  const { data: inst, error: iErr } = await client
    .from('poll_instruments')
    .insert({
      kind: input.kind,
      title: input.title.trim(),
      description: input.description.trim(),
      publish_at: input.publishAt,
      close_at: input.closeAt,
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (iErr || !inst) return { id: null, error: new Error(iErr?.message ?? 'Insert failed') };

  const instrumentId = (inst as { id: string }).id;

  for (let qi = 0; qi < input.questions.length; qi++) {
    const q = input.questions[qi];
    const { data: qRow, error: qErr } = await client
      .from('poll_questions')
      .insert({
        instrument_id: instrumentId,
        sort_order: qi,
        prompt: q.prompt.trim(),
        question_type: q.questionType,
        allow_write_in: q.allowWriteIn,
      })
      .select('id')
      .single();

    if (qErr || !qRow) {
      await client.from('poll_instruments').delete().eq('id', instrumentId);
      return { id: null, error: new Error(qErr?.message ?? 'Question insert failed') };
    }

    const questionId = (qRow as { id: string }).id;
    const needsOptions = q.questionType === 'single_choice' || q.questionType === 'multiple_choice';
    if (needsOptions && q.options.length > 0) {
      const optRows = q.options.map((o, oi) => ({
        question_id: questionId,
        sort_order: oi,
        label: o.label.trim(),
        is_write_in_slot: o.isWriteInSlot,
      }));
      const { error: oErr } = await client.from('poll_question_options').insert(optRows);
      if (oErr) {
        await client.from('poll_instruments').delete().eq('id', instrumentId);
        return { id: null, error: new Error(oErr.message) };
      }
    }
  }

  return { id: instrumentId, error: null };
}

export type UpdatePollInstrumentMetaInput = {
  title: string;
  description: string;
  publishAt: string;
  closeAt: string;
};

export async function updatePollInstrumentMeta(
  client: SupabaseClient,
  instrumentId: string,
  input: UpdatePollInstrumentMetaInput
): Promise<{ error: Error | null }> {
  const { error } = await client
    .from('poll_instruments')
    .update({
      title: input.title.trim(),
      description: input.description.trim(),
      publish_at: input.publishAt,
      close_at: input.closeAt,
    })
    .eq('id', instrumentId);

  if (error) return { error: new Error(error.message) };
  return { error: null };
}
