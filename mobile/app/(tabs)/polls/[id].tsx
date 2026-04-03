import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePolls } from '@/context/PollsContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { scrollContentGutter } from '@/constants/scrollLayout';
import { NeoGlass, Radius } from '@/constants/theme';
import type { Poll, PollAnswer, PollQuestion, PollResultsMember } from '@/types/polls';
import { formatDateTimeLocalForDisplay } from '@/types/member';
import {
  isPollClosedForMember,
  isPollOpenForMember,
  isPollResultsPublished,
} from '@/types/polls';

/** Matches admin / polls CTAs (e.g. primary save). */
const SUBMIT_CYAN = '#00CCFF';

/**
 * Stack content sits below the global AppHeader (which already applies safe-area top inset).
 * Do not add `insets.top` here — that doubled the status bar gap on poll / results screens.
 */
function PollMemberScrollShell({ children }: { children: ReactNode }) {
  const backgroundColor = useThemeColor({}, 'background');
  return (
    <View style={[shellStyles.flex, { backgroundColor }]}>
      <ScrollView
        style={shellStyles.flex}
        contentContainerStyle={scrollContentGutter}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const shellStyles = StyleSheet.create({
  flex: { flex: 1 },
});

function PollDetailInner() {
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const router = useRouter();
  const { getPoll, ensurePollLoaded, getMyResponse, submitResponse, getResults, polls } = usePolls();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loadingPoll, setLoadingPoll] = useState(true);
  const myResponse = id ? getMyResponse(id) : null;

  const [answers, setAnswers] = useState<Record<string, string[] | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<PollResultsMember | null>(null);

  const tintColor = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    if (!id) {
      setPoll(null);
      setLoadingPoll(false);
      return;
    }
    const cached = getPoll(id);
    if (cached) {
      setPoll(cached);
      setLoadingPoll(false);
      return;
    }
    setLoadingPoll(true);
    void ensurePollLoaded(id).then((p) => {
      setPoll(p);
      setLoadingPoll(false);
    });
  }, [id, getPoll, ensurePollLoaded]);

  useEffect(() => {
    if (!id) return;
    const c = getPoll(id);
    if (c) setPoll(c);
  }, [id, getPoll, polls]);

  const closed = poll ? isPollClosedForMember(poll) : false;
  const open = poll ? isPollOpenForMember(poll) : false;
  const published = poll ? isPollResultsPublished(poll) : false;

  useEffect(() => {
    if (!id || !closed || !published) {
      setResults(null);
      return;
    }
    void getResults(id).then(setResults);
  }, [id, closed, published, getResults]);

  const handleSelectOption = useCallback((questionId: string, optionId: string, multiple: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      const arr = Array.isArray(current) ? current : current ? [current] : [];
      if (multiple) {
        const next = arr.includes(optionId) ? arr.filter((x) => x !== optionId) : [...arr, optionId];
        return { ...prev, [questionId]: next };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  }, []);

  const handleTextAnswer = useCallback((questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const buildAnswersPayload = useCallback((): PollAnswer[] | null => {
    if (!poll) return null;
    const out: PollAnswer[] = [];
    for (const q of poll.questions) {
      const val = answers[q.id];
      if (q.type === 'number') {
        const raw = typeof val === 'string' ? val.trim() : '';
        const n = parseFloat(raw.replace(',', '.'));
        if (!Number.isFinite(n)) return null;
        out.push({ questionId: q.id, numberValue: n });
        continue;
      }
      if (q.type === 'text') {
        const t = typeof val === 'string' ? val.trim() : '';
        if (!t) return null;
        out.push({ questionId: q.id, freeText: t });
        continue;
      }
      const optionIds = Array.isArray(val) ? val : val ? [val] : [];
      if (optionIds.length === 0) return null;
      const selectedWriteIn = q.options.find((o) => o.isWriteInSlot && optionIds.includes(o.id));
      const wiRaw = answers[`${q.id}_writein`];
      const wiStr = typeof wiRaw === 'string' ? wiRaw.trim() : '';
      const writeInText =
        selectedWriteIn && q.allowWriteIn ? (wiStr.length > 0 ? wiStr : undefined) : undefined;
      if (selectedWriteIn && q.allowWriteIn && !writeInText) return null;
      out.push({
        questionId: q.id,
        optionIds,
        writeInText: writeInText || undefined,
      });
    }
    return out;
  }, [poll, answers]);

  const handleSubmit = useCallback(async () => {
    if (!poll || !id) return;
    const payload = buildAnswersPayload();
    if (!payload) {
      Alert.alert('Answer required', 'Please answer every question.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await submitResponse(id, payload);
      if (error) {
        Alert.alert('Error', error);
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }, [poll, id, buildAnswersPayload, submitResponse]);

  if (loadingPoll) {
    return (
      <PollMemberScrollShell>
        <ThemedView style={styles.container}>
          <ThemedText>Loading…</ThemedText>
        </ThemedView>
      </PollMemberScrollShell>
    );
  }

  if (!id || !poll) {
    return (
      <PollMemberScrollShell>
        <ThemedView style={styles.container}>
          <ThemedText>Poll not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText type="link">Go back</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </PollMemberScrollShell>
    );
  }

  if (closed && !published) {
    return (
      <PollMemberScrollShell>
        <ThemedView style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">{poll.title}</ThemedText>
          <ThemedText style={styles.meta}>Closed {formatDateTimeLocalForDisplay(poll.closeAt)}</ThemedText>
          <ThemedView style={[styles.glassTile, { backgroundColor: cardBg }]}>
            <ThemedText type="defaultSemiBold">Results are tabulating</ThemedText>
            <ThemedText style={styles.thankYouText}>Please check back later.</ThemedText>
          </ThemedView>
        </ThemedView>
      </PollMemberScrollShell>
    );
  }

  if (closed && published) {
    return (
      <PollMemberScrollShell>
        <ThemedView style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">{poll.title}</ThemedText>
          <ThemedText style={styles.meta}>Closed {formatDateTimeLocalForDisplay(poll.closeAt)}</ThemedText>
          <ThemedText type="subtitle" style={styles.resultsTitle}>
            {poll.kind === 'survey' ? 'Survey Results' : 'Poll Results'}
          </ThemedText>
          {!results ? (
            <ThemedText style={styles.noResults}>Loading results…</ThemedText>
          ) : (
            results.questions
              .filter((rq) => poll.kind !== 'survey' || rq.options.length > 0)
              .map((rq: PollResultsMember['questions'][number]) => (
                <ThemedView
                  key={rq.questionId}
                  style={[styles.glassTile, styles.resultBlock, { backgroundColor: cardBg }]}>
                  <ThemedText type="defaultSemiBold">{rq.prompt}</ThemedText>
                  {rq.options.length === 0 ? (
                    <ThemedText style={styles.mutedSmall}>
                      Written or numeric answers are not shown here to protect privacy.
                    </ThemedText>
                  ) : (
                    <View style={styles.resultOptions}>
                      {rq.options.map((opt) => (
                        <ThemedView key={opt.optionId} style={styles.resultRow}>
                          <ThemedText style={styles.resultLabel}>{opt.label}</ThemedText>
                          <ThemedText style={styles.resultPct}>{opt.percent}%</ThemedText>
                          <View style={[styles.resultBarBg, { backgroundColor: borderColor }]}>
                            <View
                              style={[styles.resultBarFill, { width: `${opt.percent}%`, backgroundColor: tintColor }]}
                            />
                          </View>
                        </ThemedView>
                      ))}
                    </View>
                  )}
                </ThemedView>
              ))
          )}
        </ThemedView>
      </PollMemberScrollShell>
    );
  }

  if (!open) {
    return (
      <PollMemberScrollShell>
        <ThemedView style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">{poll.title}</ThemedText>
          <ThemedText style={styles.meta}>
            This {poll.kind === 'survey' ? 'survey' : 'poll'} is not open yet.
          </ThemedText>
        </ThemedView>
      </PollMemberScrollShell>
    );
  }

  if (myResponse || submitted) {
    return (
      <PollMemberScrollShell>
        <ThemedView style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">{poll.title}</ThemedText>
          <ThemedView style={[styles.glassTile, { backgroundColor: cardBg }]}>
            <ThemedText type="defaultSemiBold">Thank you</ThemedText>
            <ThemedText style={styles.thankYouText}>Your response has been recorded anonymously.</ThemedText>
            <ThemedText style={styles.resultsHint}>
              Return when the {poll.kind === 'survey' ? 'survey' : 'poll'} closes to view the results.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </PollMemberScrollShell>
    );
  }

  return (
    <PollMemberScrollShell>
      <ThemedView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ThemedText type="link">← Back</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title">{poll.title}</ThemedText>
        {poll.description ? <ThemedText style={styles.description}>{poll.description}</ThemedText> : null}
        <ThemedText style={styles.meta}>Closes {formatDateTimeLocalForDisplay(poll.closeAt)}</ThemedText>

        <ScrollView
          style={styles.questions}
          contentContainerStyle={styles.questionsContent}
          scrollEnabled={false}>
          {poll.questions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              value={answers[q.id]}
              writeInValue={
                typeof answers[`${q.id}_writein`] === 'string' ? (answers[`${q.id}_writein`] as string) : ''
              }
              onSelectOption={handleSelectOption}
              onTextAnswer={handleTextAnswer}
              onWriteInChange={(qid, t) => setAnswers((p) => ({ ...p, [`${qid}_writein`]: t }))}
              tintColor={tintColor}
              cardBg={cardBg}
              textColor={textColor}
              borderColor={borderColor}
              backgroundColor={backgroundColor}
            />
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: SUBMIT_CYAN }]}
          onPress={() => void handleSubmit()}
          disabled={submitting}>
          <ThemedText style={styles.submitButtonText}>{submitting ? 'Submitting…' : 'Submit'}</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </PollMemberScrollShell>
  );
}

export default function PollDetailScreen() {
  return (
    <AssociationMembershipGate title="Polls and Surveys">
      <PollDetailInner />
    </AssociationMembershipGate>
  );
}

function QuestionBlock({
  question,
  value,
  writeInValue,
  onSelectOption,
  onTextAnswer,
  onWriteInChange,
  tintColor,
  cardBg,
  textColor,
  borderColor,
  backgroundColor,
}: {
  question: PollQuestion;
  value: string[] | string | undefined;
  writeInValue: string;
  onSelectOption: (qId: string, optId: string, multiple: boolean) => void;
  onTextAnswer: (qId: string, text: string) => void;
  onWriteInChange: (qId: string, text: string) => void;
  tintColor: string;
  cardBg: string;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
}) {
  const optionRowInsetBg = useThemeColor(
    { light: 'rgba(15, 23, 42, 0.07)', dark: 'rgba(255, 255, 255, 0.08)' },
    'background'
  );
  const selectedIds = Array.isArray(value) ? value : value ? [value] : [];
  const textVal = typeof value === 'string' ? value : '';
  const multiline = question.dbType === 'text_long';

  if (question.type === 'number') {
    return (
      <ThemedView style={[styles.glassTile, styles.questionGlassTile, { backgroundColor: cardBg }]}>
        <ThemedText type="defaultSemiBold">{question.questionText}</ThemedText>
        <TextInput
          style={[styles.textInput, { color: textColor, backgroundColor, borderColor }]}
          value={textVal}
          onChangeText={(t) => onTextAnswer(question.id, t)}
          placeholder="Enter a number"
          placeholderTextColor={borderColor}
          keyboardType="decimal-pad"
        />
      </ThemedView>
    );
  }

  if (question.type === 'text') {
    return (
      <ThemedView style={[styles.glassTile, styles.questionGlassTile, { backgroundColor: cardBg }]}>
        <ThemedText type="defaultSemiBold">{question.questionText}</ThemedText>
        <TextInput
          style={[styles.textInput, multiline && styles.textInputTall, { color: textColor, backgroundColor, borderColor }]}
          value={textVal}
          onChangeText={(t) => onTextAnswer(question.id, t)}
          placeholder="Your answer"
          placeholderTextColor={borderColor}
          multiline={multiline}
          textAlignVertical="top"
        />
      </ThemedView>
    );
  }

  const showWriteIn =
    question.allowWriteIn &&
    question.options.some((o) => o.isWriteInSlot && selectedIds.includes(o.id));

  const multiple = question.type === 'multiple';

  return (
    <ThemedView style={[styles.glassTile, styles.questionGlassTile, { backgroundColor: cardBg }]}>
      <ThemedText type="defaultSemiBold">{question.questionText}</ThemedText>
      {multiple ? (
        <ThemedText style={styles.multiSelectHint}>You can select more than one answer.</ThemedText>
      ) : null}
      <ThemedView style={styles.options}>
        {question.options.map((opt) => {
          const selected = selectedIds.includes(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionRow,
                { backgroundColor: optionRowInsetBg },
                selected && { borderColor: tintColor, borderWidth: 2 },
              ]}
              onPress={() => onSelectOption(question.id, opt.id, multiple)}>
              {/* Plain View: ThemedView forces theme background and made checkbox squares read as solid black. */}
              <View
                style={[
                  multiple ? styles.checkboxOuter : styles.radioOuter,
                  { borderColor: tintColor, backgroundColor: 'transparent' },
                ]}>
                {selected ? (
                  <View
                    style={[
                      multiple ? styles.checkboxInner : styles.radioInner,
                      { backgroundColor: tintColor },
                    ]}
                  />
                ) : null}
              </View>
              <ThemedText style={styles.optionText}>{opt.text}</ThemedText>
            </TouchableOpacity>
          );
        })}
      </ThemedView>
      {showWriteIn ? (
        <TextInput
          style={[styles.textInput, { color: textColor, backgroundColor, borderColor }]}
          value={writeInValue}
          onChangeText={(t) => onWriteInChange(question.id, t)}
          placeholder="Please specify"
          placeholderTextColor={borderColor}
        />
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  backRow: {
    marginBottom: 4,
  },
  meta: {
    fontSize: 14,
    opacity: 0.7,
  },
  description: {
    opacity: 0.9,
  },
  questions: {
    flexGrow: 0,
  },
  questionsContent: {
    gap: 16,
    paddingBottom: 4,
  },
  /** Live poll / survey: cyan edge + padding; inner rhythm slightly looser than compact glass tiles. */
  questionGlassTile: {
    gap: 12,
  },
  multiSelectHint: {
    fontSize: 13,
    opacity: 0.72,
    lineHeight: 18,
  },
  options: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  /** Multiple-choice: square outline vs circular radio. */
  checkboxOuter: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  optionText: {
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 44,
  },
  textInputTall: {
    minHeight: 100,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    fontWeight: '600',
    fontSize: 16,
    color: '#000',
  },
  /** Cyan-tinted border to match Neo glass cards (e.g. {@link GlassCard}). */
  glassTile: {
    padding: 20,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    gap: 8,
  },
  thankYouText: {
    opacity: 0.9,
  },
  resultsHint: {
    fontSize: 14,
    opacity: 0.7,
  },
  resultsTitle: {
    marginTop: 16,
  },
  mutedSmall: {
    fontSize: 13,
    opacity: 0.75,
  },
  resultBlock: {
    padding: 16,
    marginTop: 12,
    gap: 12,
  },
  resultOptions: {
    gap: 24,
  },
  resultRow: {
    gap: 6,
  },
  resultLabel: {
    fontSize: 15,
  },
  resultPct: {
    fontSize: 14,
    opacity: 0.8,
  },
  resultBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    opacity: 0.3,
  },
  resultBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  noResults: {
    opacity: 0.7,
    marginTop: 12,
  },
});
