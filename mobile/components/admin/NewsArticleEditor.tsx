import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { ArticleBodyHtmlEditor } from '@/components/admin/ArticleBodyHtmlEditor';
import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import { cmsBodyPlainTextLength, sanitizeCmsBodyHtml } from '@/lib/cms-body-html';

const CYAN = '#00CCFF';
const INPUT_BG = 'rgba(22, 24, 32, 0.9)';

const EXCERPT_PLACEHOLDER_NEWS =
  'CLICKBAIT (Optional) - Any text here will appear on the news list tile, but won\'t appear in the article itself. Try to limit this to a single paragraph at most for the sake of layout.';

const ANNOUNCEMENT_HELP =
  'All articles will always publish to the News section for association members. Setting this option to on will also publish the article to the very front page as an announcement which will be visible to non-paying basic users.';

export type NewsArticleSubmitPayload = {
  title: string;
  body: string;
  excerpt: string;
  announceOnHome: boolean;
  thumbnailLocalUri: string | null;
  thumbnailMimeType: string | null;
  removeThumbnail: boolean;
};

type Props = {
  /** `library` hides excerpt, announcement, and thumbnail UI. */
  variant?: 'news' | 'library';
  submitLabel: string;
  initialTitle?: string;
  initialBody?: string;
  initialExcerpt?: string;
  initialAnnounceOnHome?: boolean;
  initialThumbnailUrl?: string | null;
  onSubmit: (payload: NewsArticleSubmitPayload) => Promise<{ error: Error | null }>;
  onSuccess?: () => void;
};

export function NewsArticleEditor({
  submitLabel,
  variant = 'news',
  initialTitle = '',
  initialBody = '',
  initialExcerpt = '',
  initialAnnounceOnHome = false,
  initialThumbnailUrl = null,
  onSubmit,
  onSuccess,
}: Props) {
  const isLibrary = variant === 'library';
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [excerpt, setExcerpt] = useState(initialExcerpt);
  const [announceOnHome, setAnnounceOnHome] = useState(initialAnnounceOnHome);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialThumbnailUrl);
  const [thumbnailLocalUri, setThumbnailLocalUri] = useState<string | null>(null);
  const [thumbnailMimeType, setThumbnailMimeType] = useState<string | null>(null);
  const [removeThumbnail, setRemoveThumbnail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setTitle(initialTitle);
    setBody(initialBody);
    setExcerpt(initialExcerpt);
    setAnnounceOnHome(initialAnnounceOnHome);
    setThumbnailUrl(initialThumbnailUrl);
    setThumbnailLocalUri(null);
    setThumbnailMimeType(null);
    setRemoveThumbnail(false);
  }, [initialTitle, initialBody, initialExcerpt, initialAnnounceOnHome, initialThumbnailUrl]);

  const pickThumbnail = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setFormMessage({ kind: 'err', text: 'Media library permission is required to pick an image.' });
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (r.canceled || !r.assets?.length) return;
    setThumbnailLocalUri(r.assets[0]!.uri);
    setThumbnailMimeType(r.assets[0]!.mimeType ?? null);
    setRemoveThumbnail(false);
    setFormMessage(null);
  };

  const clearThumbnail = () => {
    setThumbnailLocalUri(null);
    setThumbnailMimeType(null);
    setThumbnailUrl(null);
    setRemoveThumbnail(true);
  };

  const handleSubmit = async () => {
    setFormMessage(null);
    const t = title.trim();
    const rawBody = body.trim();
    const cleaned = sanitizeCmsBodyHtml(rawBody);
    if (!t || cmsBodyPlainTextLength(cleaned) === 0) {
      setFormMessage({
        kind: 'err',
        text: isLibrary
          ? 'Title and main guidance text are required.'
          : 'Headline and main article text are required.',
      });
      return;
    }
    setSubmitting(true);
    const { error } = await onSubmit({
      title: t,
      body: cleaned,
      excerpt: isLibrary ? '' : excerpt.trim(),
      announceOnHome: isLibrary ? false : announceOnHome,
      thumbnailLocalUri: isLibrary ? null : thumbnailLocalUri,
      thumbnailMimeType: isLibrary ? null : thumbnailMimeType,
      removeThumbnail: isLibrary ? false : removeThumbnail,
    });
    setSubmitting(false);
    if (error) {
      setFormMessage({ kind: 'err', text: error.message });
      return;
    }
    setFormMessage({
      kind: 'ok',
      text: isLibrary
        ? 'Saved. Article is in Guidance Library for association members.'
        : announceOnHome
          ? 'Saved. Article is on News and on the home page as an announcement (visible to basic users).'
          : 'Saved. Article is on News for association members.',
    });
    onSuccess?.();
  };

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        placeholder={isLibrary ? 'TITLE' : 'HEADLINE'}
        placeholderTextColor={NeoText.muted}
        value={title}
        onChangeText={setTitle}
      />

      {!isLibrary ? (
        <View style={styles.switchRow}>
          <View style={styles.switchLabelCol}>
            <ThemedText style={styles.switchTitle}>Set as an Announcement</ThemedText>
            <ThemedText style={styles.switchSub}>{ANNOUNCEMENT_HELP}</ThemedText>
          </View>
          <Switch
            value={announceOnHome}
            onValueChange={setAnnounceOnHome}
            trackColor={{ false: NeoGlass.stroke, true: 'rgba(0,204,255,0.35)' }}
            thumbColor={announceOnHome ? CYAN : NeoText.muted}
          />
        </View>
      ) : null}

      {!isLibrary ? (
        <TextInput
          style={[styles.input, styles.inputExcerpt]}
          placeholder={EXCERPT_PLACEHOLDER_NEWS}
          placeholderTextColor={NeoText.muted}
          value={excerpt}
          onChangeText={setExcerpt}
          multiline
          textAlignVertical="top"
        />
      ) : null}

      <View style={styles.bodyBlock}>
        <ThemedText style={styles.bodyLabel}>{isLibrary ? 'Main guidance text' : 'Main article text'}</ThemedText>
        <ArticleBodyHtmlEditor initialHtml={initialBody} onHtmlChange={setBody} />
        <ThemedText style={styles.bodyHint}>
          Use the toolbar for bold, italic, underline, and links.
        </ThemedText>
      </View>

      {!isLibrary ? (
        <View style={styles.thumbCard}>
          <View style={styles.thumbHeaderRow}>
            <ThemedText style={styles.thumbTitle}>Article image</ThemedText>
            {(thumbnailLocalUri || thumbnailUrl) ? (
              <Pressable onPress={clearThumbnail} hitSlop={8}>
                <ThemedText style={styles.thumbActionDanger}>Remove</ThemedText>
              </Pressable>
            ) : null}
          </View>
          {(thumbnailLocalUri || thumbnailUrl) ? (
            <Image
              source={{ uri: thumbnailLocalUri || thumbnailUrl! }}
              style={styles.thumbPreview}
              contentFit="cover"
            />
          ) : (
            <ThemedText style={styles.thumbHint}>
              Optional. Shown in announcement/news tiles and at the top of the article.
            </ThemedText>
          )}
          <Pressable style={({ pressed }) => [styles.thumbPickBtn, pressed && styles.thumbPickBtnPressed]} onPress={() => void pickThumbnail()}>
            <ThemedText style={styles.thumbPickBtnText}>
              {(thumbnailLocalUri || thumbnailUrl) ? 'Change image' : 'Choose image'}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

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
  bodyBlock: {
    gap: Spacing.sm,
  },
  bodyLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
  },
  bodyHint: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
    lineHeight: 18,
  },
  thumbCard: {
    backgroundColor: INPUT_BG,
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  thumbHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumbTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
  },
  thumbActionDanger: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#fb7185',
  },
  thumbHint: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
    lineHeight: 18,
  },
  thumbPreview: {
    width: '100%',
    height: 160,
    borderRadius: Radius.lg - 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  thumbPickBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(0,204,255,0.35)',
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  thumbPickBtnPressed: {
    opacity: 0.9,
  },
  thumbPickBtnText: {
    color: '#c9f4ff',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
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
  inputExcerpt: {
    minHeight: 96,
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
