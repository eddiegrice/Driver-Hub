import type { Href } from 'expo-router';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
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
import { useAuth } from '@/context/AuthContext';
import { datesToIsoOrError } from '@/lib/poll-schedule-datetime';
import { createPollInstrument, type CreatePollQuestionInput } from '@/lib/polls-supabase';
import { supabase } from '@/lib/supabase';
import type { PollKind, PollQuestionTypeDb } from '@/types/polls';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

const CYAN = '#00CCFF';

const ADMIN_POLLS_LIST_HREF = '/admin/polls' as Href;
const ADMIN_POLLS_BACK_LABEL = '← Polls and Surveys System';

type QState = {
  prompt: string;
  questionType: PollQuestionTypeDb;
  allowWriteIn: boolean;
  options: { label: string; isWriteIn: boolean }[];
};

function defaultOptionsForPoll(): QState['options'] {
  return [
    { label: 'Yes', isWriteIn: false },
    { label: 'No', isWriteIn: false },
    { label: 'Maybe', isWriteIn: false },
  ];
}

function emptyQuestion(kind: PollKind): QState {
  if (kind === 'poll') {
    return { prompt: '', questionType: 'single_choice', allowWriteIn: false, options: defaultOptionsForPoll() };
  }
  return {
    prompt: '',
    questionType: 'single_choice',
    allowWriteIn: false,
    options: [
      { label: 'Option 1', isWriteIn: false },
      { label: 'Option 2', isWriteIn: false },
    ],
  };
}

function defaultPublishAt(): Date {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  return d;
}

function defaultCloseAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(17, 0, 0, 0);
  return d;
}

const QUESTION_TYPE_LABELS: { value: PollQuestionTypeDb; label: string }[] = [
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multiple_choice', label: 'Multiple choice' },
  { value: 'text_short', label: 'Short text' },
  { value: 'text_long', label: 'Long text' },
  { value: 'number', label: 'Number' },
];

export function PollInstrumentCreateForm({ kind }: { kind: PollKind }) {
  const router = useRouter();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publishAt, setPublishAt] = useState(defaultPublishAt);
  const [closeAt, setCloseAt] = useState(defaultCloseAt);
  const [questions, setQuestions] = useState<QState[]>(() => [emptyQuestion(kind)]);
  const [saving, setSaving] = useState(false);

  const addQuestion = useCallback(() => {
    setQuestions((q) => [...q, emptyQuestion(kind)]);
  }, [kind]);

  const removeQuestion = useCallback((idx: number) => {
    setQuestions((q) => (q.length <= 1 ? q : q.filter((_, i) => i !== idx)));
  }, []);

  const updateQuestion = useCallback((idx: number, patch: Partial<QState>) => {
    setQuestions((q) => q.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }, []);

  const addOption = useCallback((qIdx: number) => {
    setQuestions((q) =>
      q.map((row, i) =>
        i === qIdx
          ? { ...row, options: [...row.options, { label: '', isWriteIn: false }] }
          : row
      )
    );
  }, []);

  const updateOption = useCallback((qIdx: number, oIdx: number, label: string, isWriteIn: boolean) => {
    setQuestions((q) =>
      q.map((row, i) => {
        if (i !== qIdx) return row;
        const options = row.options.map((o, j) => (j === oIdx ? { label, isWriteIn } : o));
        return { ...row, options };
      })
    );
  }, []);

  const removeOption = useCallback((qIdx: number, oIdx: number) => {
    setQuestions((q) =>
      q.map((row, i) => {
        if (i !== qIdx) return row;
        if (row.options.length <= 2) return row;
        return { ...row, options: row.options.filter((_, j) => j !== oIdx) };
      })
    );
  }, []);

  const onSubmit = useCallback(async () => {
    if (!supabase) {
      Alert.alert('Error', 'Supabase is not configured.');
      return;
    }
    const schedule = datesToIsoOrError(publishAt, closeAt);
    if (!schedule.ok) {
      Alert.alert('Check dates', schedule.message);
      return;
    }
    if (!title.trim()) {
      Alert.alert('Title required', '');
      return;
    }

    const built: CreatePollQuestionInput[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        Alert.alert('Question required', `Question ${i + 1} needs text.`);
        return;
      }
      const qt = kind === 'poll' ? 'single_choice' : q.questionType;
      if (qt === 'single_choice' || qt === 'multiple_choice') {
        const opts = q.options.map((o) => ({ ...o, label: o.label.trim() })).filter((o) => o.label.length > 0);
        if (opts.length < 2) {
          Alert.alert('Options', `Question ${i + 1} needs at least two non-empty options.`);
          return;
        }
        if (opts.some((o) => o.isWriteIn) && !q.allowWriteIn) {
          Alert.alert('Write-in', `Enable "Allow write-in" for question ${i + 1} if you use an Other option.`);
          return;
        }
        built.push({
          prompt: q.prompt.trim(),
          questionType: qt,
          allowWriteIn: q.allowWriteIn,
          options: opts.map((o) => ({ label: o.label, isWriteInSlot: o.isWriteIn })),
        });
      } else {
        built.push({
          prompt: q.prompt.trim(),
          questionType: qt,
          allowWriteIn: false,
          options: [],
        });
      }
    }

    setSaving(true);
    try {
      const { id, error } = await createPollInstrument(
        supabase,
        {
          kind,
          title: title.trim(),
          description: description.trim(),
          publishAt: schedule.publishAt,
          closeAt: schedule.closeAt,
          questions: built,
        },
        user?.id ?? null
      );
      if (error || !id) {
        Alert.alert('Error', error?.message ?? 'Could not create.');
        return;
      }
      router.replace(`/admin/polls/${id}` as Href);
    } finally {
      setSaving(false);
    }
  }, [kind, title, description, publishAt, closeAt, questions, user?.id, router]);

  const subtitle = kind === 'poll' ? 'Create Poll' : 'Create Survey';

  return (
    <AdminSubpageScaffold
      subsystemTitle={subtitle}
      keyboardShouldPersistTaps="handled"
      backLabel={ADMIN_POLLS_BACK_LABEL}
      onBackPress={() => router.dismissTo(ADMIN_POLLS_LIST_HREF)}>
      <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
        <ThemedText style={styles.label}>Title</ThemedText>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Poll / survey title"
          placeholderTextColor={NeoText.muted}
        />

        <ThemedText style={styles.label}>Description (optional)</ThemedText>
        <TextInput
          style={[styles.input, styles.inputTall]}
          value={description}
          onChangeText={setDescription}
          placeholder="Shown to members"
          placeholderTextColor={NeoText.muted}
          multiline
        />

        <PollScheduleDateTimeFields
          publishAt={publishAt}
          closeAt={closeAt}
          onChangePublishAt={setPublishAt}
          onChangeCloseAt={setCloseAt}
        />

        {questions.map((q, qi) => (
          <View key={qi} style={styles.qCard}>
            <View style={styles.qHead}>
              <ThemedText style={styles.qTitle}>Question {qi + 1}</ThemedText>
              {questions.length > 1 ? (
                <Pressable onPress={() => removeQuestion(qi)} hitSlop={8}>
                  <ThemedText type="link" style={styles.remove}>
                    Remove
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            <TextInput
              style={styles.input}
              value={q.prompt}
              onChangeText={(t) => updateQuestion(qi, { prompt: t })}
              placeholder="Question text"
              placeholderTextColor={NeoText.muted}
            />

            {kind === 'survey' ? (
              <View style={styles.typeRow}>
                {QUESTION_TYPE_LABELS.map((t) => {
                  const active = q.questionType === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() =>
                        updateQuestion(qi, {
                          questionType: t.value,
                          options:
                            t.value === 'single_choice' || t.value === 'multiple_choice'
                              ? q.options.length >= 2
                                ? q.options
                                : [
                                    { label: 'Option 1', isWriteIn: false },
                                    { label: 'Option 2', isWriteIn: false },
                                  ]
                              : [],
                        })
                      }
                      style={[styles.typeChip, active && styles.typeChipActive]}>
                      <ThemedText style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                        {t.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {(kind === 'poll' || q.questionType === 'single_choice' || q.questionType === 'multiple_choice') && (
              <>
                {kind === 'survey' && (q.questionType === 'single_choice' || q.questionType === 'multiple_choice') ? (
                  <Pressable
                    style={styles.writeInRow}
                    onPress={() => updateQuestion(qi, { allowWriteIn: !q.allowWriteIn })}>
                    <ThemedText style={styles.labelInline}>
                      Allow write-in (Other + text){q.allowWriteIn ? ' ✓' : ''}
                    </ThemedText>
                  </Pressable>
                ) : null}
                {q.options.map((o, oi) => (
                  <View key={oi} style={styles.optRow}>
                    <TextInput
                      style={[styles.input, styles.optInput]}
                      value={o.label}
                      onChangeText={(t) => updateOption(qi, oi, t, o.isWriteIn)}
                      placeholder={`Option ${oi + 1}`}
                      placeholderTextColor={NeoText.muted}
                    />
                    {kind === 'survey' && q.allowWriteIn ? (
                      <Pressable
                        style={styles.otherBtn}
                        onPress={() => updateOption(qi, oi, o.label, !o.isWriteIn)}>
                        <ThemedText style={styles.otherBtnText}>{o.isWriteIn ? 'Other ✓' : 'Mark Other'}</ThemedText>
                      </Pressable>
                    ) : null}
                    {q.options.length > 2 ? (
                      <Pressable onPress={() => removeOption(qi, oi)} hitSlop={8}>
                        <ThemedText type="link">×</ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
                <Pressable onPress={() => addOption(qi)} style={styles.addOpt}>
                  <ThemedText type="link">+ Add option</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        ))}

        <Pressable onPress={addQuestion} style={styles.addQ}>
          <ThemedText type="link">+ Add question</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={() => void onSubmit()}
          disabled={saving}>
          <ThemedText style={styles.saveBtnText}>{saving ? 'Saving…' : 'Create'}</ThemedText>
        </Pressable>
      </ScrollView>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  formScroll: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  labelInline: {
    fontSize: FontSize.sm,
    color: NeoText.secondary,
  },
  input: {
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    color: NeoText.primary,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  inputTall: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  half: {
    flex: 1,
  },
  row2: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  qCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: NeoGlass.stroke,
    gap: Spacing.sm,
  },
  qHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qTitle: {
    fontWeight: FontWeight.semibold,
    color: NeoText.primary,
  },
  remove: {
    fontSize: FontSize.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  typeChip: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
  },
  typeChipActive: {
    borderColor: CYAN,
    backgroundColor: 'rgba(0, 204, 255, 0.12)',
  },
  typeChipText: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
  typeChipTextActive: {
    color: CYAN,
    fontWeight: FontWeight.semibold,
  },
  writeInRow: {
    paddingVertical: Spacing.xs,
  },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optInput: {
    flex: 1,
  },
  otherBtn: {
    paddingHorizontal: Spacing.sm,
  },
  otherBtnText: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
  addOpt: {
    paddingVertical: Spacing.xs,
  },
  addQ: {
    marginTop: Spacing.md,
  },
  saveBtn: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xxl,
    backgroundColor: CYAN,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontWeight: FontWeight.semibold,
    color: '#000',
    fontSize: FontSize.bodyLarge,
  },
});
