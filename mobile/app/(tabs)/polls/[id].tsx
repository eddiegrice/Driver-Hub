import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePolls } from '@/context/PollsContext';
import { AssociationMembershipGate } from '@/components/AssociationMembershipGate';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import type { PollAnswer, PollQuestion } from '@/types/polls';
import { formatDateForDisplay } from '@/types/member';
import { isPollClosed } from '@/types/polls';

function PollDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getPoll, getMyResponse, submitResponse, getResults } = usePolls();
  const poll = id ? getPoll(id) : undefined;
  const myResponse = id ? getMyResponse(id) : null;

  const [answers, setAnswers] = useState<Record<string, string[] | string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<Awaited<ReturnType<typeof getResults>>>(null);

  const colorScheme = useColorScheme();
  const tintColor = useThemeColor({}, 'tint');
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');
  const buttonTextColor = colorScheme === 'dark' ? '#111' : '#fff';
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const backgroundColor = useThemeColor({}, 'background');

  const closed = poll ? isPollClosed(poll) : false;

  useEffect(() => {
    if (!id || !closed) return;
    getResults(id).then(setResults);
  }, [id, closed, getResults]);

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

  const handleSubmit = useCallback(async () => {
    if (!poll || !id) return;
    const pollAnswers: PollAnswer[] = poll.questions.map((q) => {
      const val = answers[q.id];
      if (q.type === 'text') {
        return { questionId: q.id, freeText: typeof val === 'string' ? val : '' };
      }
      const optionIds = Array.isArray(val) ? val : val ? [val] : [];
      return { questionId: q.id, optionIds };
    });
    const required = poll.questions.filter((q) => q.type !== 'text' && q.options.length > 0);
    const missing = required.some((q) => {
      const val = answers[q.id];
      const optionIds = Array.isArray(val) ? val : val ? [val] : [];
      return optionIds.length === 0;
    });
    if (missing) {
      Alert.alert('Answer required', 'Please answer all questions.');
      return;
    }
    setSubmitting(true);
    try {
      await submitResponse(id, pollAnswers);
      setSubmitted(true);
    } catch {
      Alert.alert('Error', 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [poll, id, answers, submitResponse]);

  if (!id || !poll) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
        <ThemedView style={styles.container}>
          <ThemedText>Poll not found.</ThemedText>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText type="link">Go back</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (closed) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
        <ThemedView style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back to polls</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">{poll.title}</ThemedText>
          <ThemedText style={styles.meta}>Closed {formatDateForDisplay(poll.endsAt.slice(0, 10))}</ThemedText>
          <ThemedText type="subtitle" style={styles.resultsTitle}>Results</ThemedText>
          {results ? (
            <>
              <ThemedText style={styles.totalResponses}>{results.totalResponses} responses</ThemedText>
              {poll.questions.map((q) => {
                const optionCounts = results.questionResults[q.id] ?? [];
                const total = optionCounts.reduce((s, x) => s + x.count, 0);
                return (
                  <ThemedView key={q.id} style={[styles.resultBlock, { backgroundColor: cardBg }]}>
                    <ThemedText type="defaultSemiBold">{q.questionText}</ThemedText>
                    {q.options.map((opt) => {
                      const row = optionCounts.find((r) => r.optionId === opt.id);
                      const count = row?.count ?? 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <ThemedView key={opt.id} style={styles.resultRow}>
                          <ThemedText style={styles.resultLabel}>{opt.text}</ThemedText>
                          <ThemedText style={styles.resultPct}>{pct}%</ThemedText>
                          <View style={[styles.resultBarBg, { backgroundColor: borderColor }]}>
                            <View
                              style={[styles.resultBarFill, { width: `${pct}%`, backgroundColor: tintColor }]}
                            />
                          </View>
                        </ThemedView>
                      );
                    })}
                  </ThemedView>
                );
              })}
            </>
          ) : (
            <ThemedText style={styles.noResults}>No results available.</ThemedText>
          )}
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  if (myResponse || submitted) {
    return (
      <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
        <ThemedView style={styles.container}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
            <ThemedText type="link">← Back to polls</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">{poll.title}</ThemedText>
          <ThemedView style={[styles.thankYouCard, { backgroundColor: cardBg }]}>
            <ThemedText type="defaultSemiBold">Thank you</ThemedText>
            <ThemedText style={styles.thankYouText}>
              {myResponse && !submitted
                ? "You've already responded to this poll."
                : 'Your response has been recorded.'}
            </ThemedText>
            <ThemedText style={styles.resultsHint}>
              Results will be visible when the poll closes.
            </ThemedText>
          </ThemedView>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView headerBackgroundColor={{ light: '#f4f4f4', dark: '#121212' }} headerImage={null}>
      <ThemedView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <ThemedText type="link">← Back to polls</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title">{poll.title}</ThemedText>
        {poll.description ? (
          <ThemedText style={styles.description}>{poll.description}</ThemedText>
        ) : null}
        <ThemedText style={styles.meta}>Closes {formatDateForDisplay(poll.endsAt.slice(0, 10))}</ThemedText>

        <ScrollView style={styles.questions} scrollEnabled={false}>
          {poll.questions.map((q) => (
            <QuestionBlock
              key={q.id}
              question={q}
              value={answers[q.id]}
              onSelectOption={handleSelectOption}
              onTextAnswer={handleTextAnswer}
              tintColor={tintColor}
              cardBg={cardBg}
              textColor={textColor}
              borderColor={borderColor}
              backgroundColor={backgroundColor}
            />
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: tintColor }]}
          onPress={handleSubmit}
          disabled={submitting}>
          <ThemedText style={[styles.submitButtonText, { color: buttonTextColor }]}>
            {submitting ? 'Submitting…' : 'Submit'}
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </ParallaxScrollView>
  );
}

export default function PollDetailScreen() {
  return (
    <AssociationMembershipGate title="Polls">
      <PollDetailInner />
    </AssociationMembershipGate>
  );
}

function QuestionBlock({
  question,
  value,
  onSelectOption,
  onTextAnswer,
  tintColor,
  cardBg,
  textColor,
  borderColor,
  backgroundColor,
}: {
  question: PollQuestion;
  value: string[] | string | undefined;
  onSelectOption: (qId: string, optId: string, multiple: boolean) => void;
  onTextAnswer: (qId: string, text: string) => void;
  tintColor: string;
  cardBg: string;
  textColor: string;
  borderColor: string;
  backgroundColor: string;
}) {
  const selectedIds = Array.isArray(value) ? value : value ? [value] : [];
  const textVal = typeof value === 'string' ? value : '';

  if (question.type === 'text') {
    return (
      <ThemedView style={styles.questionBlock}>
        <ThemedText type="defaultSemiBold">{question.questionText}</ThemedText>
        <TextInput
          style={[styles.textInput, { color: textColor, backgroundColor, borderColor }]}
          value={textVal}
          onChangeText={(t) => onTextAnswer(question.id, t)}
          placeholder="Your answer"
          placeholderTextColor={borderColor}
          multiline
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.questionBlock}>
      <ThemedText type="defaultSemiBold">{question.questionText}</ThemedText>
      <ThemedView style={styles.options}>
        {question.options.map((opt) => {
          const selected = selectedIds.includes(opt.id);
          const multiple = question.type === 'multiple';
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionRow,
                { backgroundColor: cardBg },
                selected && { borderColor: tintColor, borderWidth: 2 },
              ]}
              onPress={() => onSelectOption(question.id, opt.id, multiple)}>
              <ThemedView style={[styles.radioOuter, { borderColor: tintColor }]}>
                {selected && <ThemedView style={[styles.radioInner, { backgroundColor: tintColor }]} />}
              </ThemedView>
              <ThemedText style={styles.optionText}>{opt.text}</ThemedText>
            </TouchableOpacity>
          );
        })}
      </ThemedView>
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
    gap: 20,
  },
  questionBlock: {
    gap: 10,
    marginTop: 8,
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
  optionText: {
    flex: 1,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
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
  },
  thankYouCard: {
    padding: 20,
    borderRadius: 12,
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
  totalResponses: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  resultBlock: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 12,
  },
  resultRow: {
    gap: 4,
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
