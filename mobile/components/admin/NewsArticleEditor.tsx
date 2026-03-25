import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

const CYAN = '#00CCFF';
const INPUT_BG = 'rgba(22, 24, 32, 0.9)';

export type NewsArticleSubmitPayload = {
  title: string;
  body: string;
  excerpt: string;
  announceOnHome: boolean;
};

type Props = {
  submitLabel: string;
  hint?: string;
  initialTitle?: string;
  initialBody?: string;
  initialExcerpt?: string;
  initialAnnounceOnHome?: boolean;
  onSubmit: (payload: NewsArticleSubmitPayload) => Promise<{ error: Error | null }>;
  /** Called after a successful save (e.g. navigate away, refresh lists). */
  onSuccess?: () => void;
};

export function NewsArticleEditor({
  submitLabel,
  hint,
  initialTitle = '',
  initialBody = '',
  initialExcerpt = '',
  initialAnnounceOnHome = false,
  onSubmit,
  onSuccess,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [announceOnHome, setAnnounceOnHome] = useState(initialAnnounceOnHome);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setBody(initialBody);
    setExcerpt(initialExcerpt);
    setAnnounceOnHome(initialAnnounceOnHome);
  }, [initialTitle, initialBody, initialExcerpt, initialAnnounceOnHome]);

  const handleSubmit = async () => {
    setFormMessage(null);
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      setFormMessage({ kind: 'err', text: 'Title and body are required.' });
      return;
    }
    setSubmitting(true);
    const { error } = await onSubmit({
      title: t,
      body: b,
      excerpt: excerpt.trim(),
      announceOnHome,
    });
    setSubmitting(false);
    if (error) {
      setFormMessage({ kind: 'err', text: error.message });
      return;
    }
    setFormMessage({
      kind: 'ok',
      text: announceOnHome
        ? 'Saved. Article is on News and home announcements.'
        : 'Saved. Article is on News.',
    });
    onSuccess?.();
  };

  return (
    <View style={styles.form}>
      {hint ? (
        <ThemedText style={styles.hint}>{hint}</ThemedText>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor={NeoText.muted}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        placeholder="Body"
        placeholderTextColor={NeoText.muted}
        value={body}
        onChangeText={setBody}
        multiline
        textAlignVertical="top"
      />
      <TextInput
        style={styles.input}
        placeholder="Excerpt (optional)"
        placeholderTextColor={NeoText.muted}
        value={excerpt}
        onChangeText={setExcerpt}
      />

      <View style={styles.switchRow}>
        <View style={styles.switchLabelCol}>
          <ThemedText style={styles.switchTitle}>Show on home dashboard</ThemedText>
          <ThemedText style={styles.switchSub}>
            All signed-in members can open the tile and read this article, including non-paying members.
          </ThemedText>
        </View>
        <Switch
          value={announceOnHome}
          onValueChange={setAnnounceOnHome}
          trackColor={{ false: NeoGlass.stroke, true: 'rgba(0,204,255,0.35)' }}
          thumbColor={announceOnHome ? CYAN : NeoText.muted}
        />
      </View>

      {formMessage ? (
        <ThemedText style={formMessage.kind === 'err' ? styles.msgErr : styles.msgOk}>
          {formMessage.text}
        </ThemedText>
      ) : null}

      <Pressable
        style={({ pressed }) => [
          styles.publishBtn,
          pressed && styles.publishBtnPressed,
          submitting && styles.publishBtnDisabled,
        ]}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#101115" />
        ) : (
          <ThemedText style={styles.publishBtnText}>{submitLabel}</ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.md,
    alignSelf: 'stretch',
    width: '100%',
    maxWidth: '100%',
    paddingBottom: Spacing.lg,
  },
  hint: {
    fontSize: FontSize.sm,
    color: NeoText.muted,
    lineHeight: 20,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: NeoText.primary,
    fontSize: FontSize.body,
  },
  inputMultiline: {
    minHeight: 120,
    paddingTop: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  switchLabelCol: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
  },
  switchSub: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
    lineHeight: 18,
  },
  publishBtn: {
    backgroundColor: CYAN,
    borderRadius: Radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  publishBtnPressed: {
    opacity: 0.9,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    color: '#101115',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.body,
  },
  msgErr: {
    color: NeoText.error,
    fontSize: FontSize.sm,
  },
  msgOk: {
    color: '#6ee7b7',
    fontSize: FontSize.sm,
  },
});
