import { useFocusEffect } from '@react-navigation/native';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { PollScheduleDateTimeFields } from '@/components/admin/PollScheduleDateTimeFields';
import { ThemedText } from '@/components/themed-text';
import { usePolls } from '@/context/PollsContext';
import {
  approvePollResultsRpc,
  archivePollInstrumentRpc,
  fetchPollInstrumentById,
  getPollAdminResultsRpc,
  updatePollInstrumentMeta,
} from '@/lib/polls-supabase';
import { datesToIsoOrError } from '@/lib/poll-schedule-datetime';
import { supabase } from '@/lib/supabase';
import type { Poll } from '@/types/polls';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import { formatDateForDisplay } from '@/types/member';
import { isPollClosedForMember, isPollResultsPublished, isPollScheduled } from '@/types/polls';

const CYAN = '#00CCFF';

const ADMIN_POLLS_LIST_HREF = '/admin/polls' as Href;
const ADMIN_POLLS_BACK_LABEL = '← Polls and Surveys System';

export default function AdminPollDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const { refreshPolls } = usePolls();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [resultsJson, setResultsJson] = useState<unknown>(null);
  const [loadingResults, setLoadingResults] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPublishAt, setEditPublishAt] = useState(() => new Date());
  const [editCloseAt, setEditCloseAt] = useState(() => new Date());
  const [savingMeta, setSavingMeta] = useState(false);

  const load = useCallback(async () => {
    if (!id || !supabase) {
      setPoll(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { poll: p, error } = await fetchPollInstrumentById(supabase, id);
    setPoll(error ? null : p);
    setLoading(false);
  }, [id]);

  const loadResults = useCallback(async () => {
    if (!id || !supabase) return;
    setLoadingResults(true);
    const { results, error } = await getPollAdminResultsRpc(supabase, id);
    if (!error && results) {
      setResultsJson(results);
    } else {
      setResultsJson(null);
    }
    setLoadingResults(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      if (id) void loadResults();
    }, [id, loadResults])
  );

  const onApprove = useCallback(async () => {
    if (!id || !supabase) return;
    setBusy(true);
    try {
      const { ok, error } = await approvePollResultsRpc(supabase, id);
      if (!ok) {
        Alert.alert('Error', error ?? 'Approve failed');
        return;
      }
      await load();
      await loadResults();
    } finally {
      setBusy(false);
    }
  }, [id, load, loadResults]);

  const onArchive = useCallback(async () => {
    if (!id || !supabase) return;
    Alert.alert('Archive', 'Hide this from member lists?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          if (!supabase) return;
          setBusy(true);
          try {
            const { ok, error } = await archivePollInstrumentRpc(supabase, id);
            if (!ok) {
              Alert.alert('Error', error ?? 'Archive failed');
              return;
            }
            router.replace('/admin/polls' as Href);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [id, router]);

  useEffect(() => {
    if (!poll) return;
    setEditTitle(poll.title);
    setEditDescription(poll.description);
    setEditPublishAt(new Date(poll.publishAt));
    setEditCloseAt(new Date(poll.closeAt));
  }, [poll]);

  const onSaveMeta = useCallback(async () => {
    if (!id || !supabase || !poll || poll.archivedAt || !isPollScheduled(poll)) return;
    const schedule = datesToIsoOrError(editPublishAt, editCloseAt);
    if (!schedule.ok) {
      Alert.alert('Check dates', schedule.message);
      return;
    }
    if (!editTitle.trim()) {
      Alert.alert('Title required', '');
      return;
    }
    setSavingMeta(true);
    try {
      const { error } = await updatePollInstrumentMeta(supabase, id, {
        title: editTitle,
        description: editDescription,
        publishAt: schedule.publishAt,
        closeAt: schedule.closeAt,
      });
      if (error) {
        Alert.alert('Error', error.message);
        return;
      }
      await load();
      await refreshPolls();
    } finally {
      setSavingMeta(false);
    }
  }, [
    id,
    poll,
    editTitle,
    editDescription,
    editPublishAt,
    editCloseAt,
    load,
    refreshPolls,
  ]);

  if (loading || !id) {
    return (
      <AdminSubpageScaffold
        subsystemTitle="Poll / Survey"
        backLabel={ADMIN_POLLS_BACK_LABEL}
        onBackPress={() => router.dismissTo(ADMIN_POLLS_LIST_HREF)}>
        <View style={styles.centered}>
          <ActivityIndicator color={CYAN} />
        </View>
      </AdminSubpageScaffold>
    );
  }

  if (!poll) {
    return (
      <AdminSubpageScaffold
        subsystemTitle="Poll / Survey"
        backLabel={ADMIN_POLLS_BACK_LABEL}
        onBackPress={() => router.dismissTo(ADMIN_POLLS_LIST_HREF)}>
        <ThemedText>Not found.</ThemedText>
      </AdminSubpageScaffold>
    );
  }

  const closed = isPollClosedForMember(poll);
  const published = isPollResultsPublished(poll);
  const scheduled = isPollScheduled(poll);
  const questions = (resultsJson as { questions?: unknown[] } | null)?.questions ?? [];

  return (
    <AdminSubpageScaffold
      subsystemTitle={poll.kind === 'survey' ? 'Survey' : 'Poll'}
      backLabel={ADMIN_POLLS_BACK_LABEL}
      onBackPress={() => router.dismissTo(ADMIN_POLLS_LIST_HREF)}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <ThemedText style={styles.title}>{poll.title}</ThemedText>
        <ThemedText style={styles.meta}>
          {poll.archivedAt ? 'Archived · ' : ''}
          Publish {formatDateForDisplay(poll.publishAt.slice(0, 10))} · Close{' '}
          {formatDateForDisplay(poll.closeAt.slice(0, 10))}
        </ThemedText>
        {scheduled ? (
          <ThemedText style={styles.badgeMuted}>Scheduled — not visible to members until publish time</ThemedText>
        ) : published ? (
          <ThemedText style={styles.badge}>Results published to members</ThemedText>
        ) : closed ? (
          <ThemedText style={styles.badgeMuted}>Closed — results not yet published</ThemedText>
        ) : (
          <ThemedText style={styles.badgeMuted}>Open for responses</ThemedText>
        )}

        {!poll.archivedAt && !scheduled ? (
          <ThemedText style={styles.editHint}>
            Title and schedule stay locked while the poll is open or after it has closed. Only scheduled instruments
            can be edited here.
          </ThemedText>
        ) : null}

        {scheduled && !poll.archivedAt ? (
          <View style={styles.editCard}>
            <ThemedText style={styles.sectionTitle}>Edit title, description &amp; schedule</ThemedText>
            <ThemedText style={styles.editHint}>Dates shown as DD-MM-YYYY (local). Use the pickers for date and time.</ThemedText>
            <ThemedText style={styles.inputLabel}>Title</ThemedText>
            <TextInput
              style={styles.textInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholderTextColor={NeoText.muted}
            />
            <ThemedText style={styles.inputLabel}>Description</ThemedText>
            <TextInput
              style={[styles.textInput, styles.textInputTall]}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              placeholderTextColor={NeoText.muted}
            />
            <PollScheduleDateTimeFields
              publishAt={editPublishAt}
              closeAt={editCloseAt}
              onChangePublishAt={setEditPublishAt}
              onChangeCloseAt={setEditCloseAt}
              publishLabel="Publish date / time"
              closeLabel="Close date / time"
            />
            <Pressable
              style={[styles.primaryBtn, (savingMeta || busy) && styles.btnDisabled]}
              onPress={() => void onSaveMeta()}
              disabled={savingMeta || busy}>
              <ThemedText style={styles.primaryBtnText}>{savingMeta ? 'Saving…' : 'Save changes'}</ThemedText>
            </Pressable>
          </View>
        ) : null}

        {closed && !published ? (
          <Pressable
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={() => void onApprove()}
            disabled={busy}>
            <ThemedText style={styles.primaryBtnText}>Publish results to members</ThemedText>
          </Pressable>
        ) : null}

        {!poll.archivedAt ? (
          <Pressable
            style={[styles.secondaryBtn, busy && styles.btnDisabled]}
            onPress={() => void onArchive()}
            disabled={busy}>
            <ThemedText style={styles.secondaryBtnText}>Archive</ThemedText>
          </Pressable>
        ) : null}

        <Pressable style={styles.linkBtn} onPress={() => void loadResults()} disabled={loadingResults}>
          <ThemedText type="link">{loadingResults ? 'Loading…' : 'Refresh admin statistics'}</ThemedText>
        </Pressable>

        <ThemedText style={styles.sectionTitle}>Admin statistics (counts + samples)</ThemedText>
        {loadingResults ? (
          <ActivityIndicator color={CYAN} style={styles.spinner} />
        ) : (
          questions.map((raw, i) => {
            const q = raw as Record<string, unknown>;
            const qType = String(q.question_type ?? '');
            const prompt = String(q.prompt ?? '');
            const total = Number(q.total_responses ?? 0);
            const opts = (q.options as Record<string, unknown>[] | undefined) ?? [];
            const texts = (q.text_answers as unknown[] | undefined) ?? [];
            const nums = (q.number_answers as unknown[] | undefined) ?? [];

            return (
              <View key={String(q.question_id ?? i)} style={styles.card}>
                <ThemedText style={styles.qPrompt}>{prompt}</ThemedText>
                <ThemedText style={styles.qMeta}>
                  {qType} · {total} response(s)
                </ThemedText>
                {opts.length > 0 ? (
                  <View style={styles.optBlock}>
                    {opts.map((o) => {
                      const pct = Number(o.percent ?? 0);
                      const cnt = Number(o.count ?? 0);
                      return (
                        <View key={String(o.option_id)} style={styles.resultRow}>
                          <ThemedText style={styles.optLabel}>{String(o.label)}</ThemedText>
                          <ThemedText style={styles.optStat}>
                            {cnt} votes · {pct}%
                          </ThemedText>
                          <View style={styles.barBg}>
                            <View style={[styles.barFill, { width: `${pct}%` }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
                {texts.length > 0 ? (
                  <View style={styles.sampleBlock}>
                    <ThemedText style={styles.sampleTitle}>Text responses (sample)</ThemedText>
                    {texts.slice(0, 8).map((t, j) => (
                      <ThemedText key={j} style={styles.sampleLine} numberOfLines={3}>
                        • {String(t)}
                      </ThemedText>
                    ))}
                  </View>
                ) : null}
                {nums.length > 0 ? (
                  <View style={styles.sampleBlock}>
                    <ThemedText style={styles.sampleTitle}>Numeric responses (sample)</ThemedText>
                    <ThemedText style={styles.sampleLine}>{nums.slice(0, 20).map(String).join(', ')}</ThemedText>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: Spacing.xxl * 2,
    alignItems: 'center',
  },
  body: {
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.bodyLarge,
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
  },
  meta: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
  },
  badge: {
    fontSize: FontSize.sm,
    color: CYAN,
    fontWeight: FontWeight.semibold,
  },
  badgeMuted: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
  },
  primaryBtn: {
    backgroundColor: CYAN,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryBtnText: {
    color: '#000',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.body,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: NeoText.primary,
    fontWeight: FontWeight.semibold,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  linkBtn: {
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    fontSize: FontSize.body,
    fontWeight: FontWeight.bold,
    color: NeoText.primary,
  },
  spinner: {
    marginVertical: Spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: NeoGlass.stroke,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  qPrompt: {
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
  },
  qMeta: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
  optBlock: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  resultRow: {
    gap: 4,
  },
  optLabel: {
    fontSize: FontSize.sm,
    color: NeoText.secondary,
  },
  optStat: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
  barBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: NeoGlass.stroke,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: CYAN,
    borderRadius: 4,
  },
  sampleBlock: {
    marginTop: Spacing.sm,
    gap: 4,
  },
  sampleTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: NeoText.muted,
  },
  sampleLine: {
    fontSize: FontSize.sm,
    color: NeoText.secondary,
  },
  editCard: {
    borderWidth: 1,
    borderColor: NeoGlass.stroke,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editHint: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
    marginTop: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    color: NeoText.primary,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  textInputTall: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
