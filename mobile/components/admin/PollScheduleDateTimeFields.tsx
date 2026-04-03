import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  combineDdMmYyyyAndTime,
  formatPollDateDdMmYyyy,
  formatPollTimeHhMm,
} from '@/lib/poll-schedule-datetime';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

type Target = 'publish' | 'close';
type PickerMode = 'date' | 'time';

type Props = {
  publishAt: Date;
  closeAt: Date;
  onChangePublishAt: (d: Date) => void;
  onChangeCloseAt: (d: Date) => void;
  publishLabel?: string;
  closeLabel?: string;
};

function WebRow({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: Date;
  onCommit: (d: Date) => void;
}) {
  const [dateStr, setDateStr] = useState(() => formatPollDateDdMmYyyy(value));
  const [timeStr, setTimeStr] = useState(() => formatPollTimeHhMm(value));

  useEffect(() => {
    setDateStr(formatPollDateDdMmYyyy(value));
    setTimeStr(formatPollTimeHhMm(value));
  }, [value]);

  const commit = useCallback(() => {
    const d = combineDdMmYyyyAndTime(dateStr, timeStr);
    if (d) onCommit(d);
  }, [dateStr, timeStr, onCommit]);

  return (
    <View style={styles.block}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <View style={styles.row2}>
        <TextInput
          style={[styles.input, styles.half]}
          value={dateStr}
          onChangeText={setDateStr}
          onBlur={commit}
          placeholder="DD-MM-YYYY"
          placeholderTextColor={NeoText.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={[styles.input, styles.half]}
          value={timeStr}
          onChangeText={setTimeStr}
          onBlur={commit}
          placeholder="HH:MM"
          placeholderTextColor={NeoText.muted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <ThemedText style={styles.hint}>DD-MM-YYYY and 24-hour time; blur field to apply.</ThemedText>
    </View>
  );
}

export function PollScheduleDateTimeFields({
  publishAt,
  closeAt,
  onChangePublishAt,
  onChangeCloseAt,
  publishLabel = 'Publish (local)',
  closeLabel = 'Close (local)',
}: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const [iosSheet, setIosSheet] = useState<null | { target: Target; mode: PickerMode; draft: Date }>(null);

  const isNativeMobile = Platform.OS === 'ios' || Platform.OS === 'android';

  const openAndroid = useCallback(
    (target: Target, mode: PickerMode) => {
      const current = target === 'publish' ? publishAt : closeAt;
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: true,
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type !== 'set' || !date) return;
          if (target === 'publish') onChangePublishAt(date);
          else onChangeCloseAt(date);
        },
      });
    },
    [publishAt, closeAt, onChangePublishAt, onChangeCloseAt]
  );

  const openIos = useCallback((target: Target, mode: PickerMode) => {
    const current = target === 'publish' ? publishAt : closeAt;
    setIosSheet({ target, mode, draft: new Date(current) });
  }, [publishAt, closeAt]);

  const onPressPick = useCallback(
    (target: Target, mode: PickerMode) => {
      if (Platform.OS === 'android') {
        openAndroid(target, mode);
        return;
      }
      if (Platform.OS === 'ios') {
        openIos(target, mode);
      }
    },
    [openAndroid, openIos]
  );

  const applyIosDraft = useCallback(() => {
    if (!iosSheet) return;
    if (iosSheet.target === 'publish') onChangePublishAt(iosSheet.draft);
    else onChangeCloseAt(iosSheet.draft);
    setIosSheet(null);
  }, [iosSheet, onChangePublishAt, onChangeCloseAt]);

  if (!isNativeMobile) {
    return (
      <View style={styles.wrap}>
        <WebRow label={publishLabel} value={publishAt} onCommit={onChangePublishAt} />
        <WebRow label={closeLabel} value={closeAt} onCommit={onChangeCloseAt} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.block}>
        <ThemedText style={styles.fieldLabel}>{publishLabel}</ThemedText>
        <View style={styles.row2}>
          <Pressable style={[styles.pickerBtn, styles.half]} onPress={() => onPressPick('publish', 'date')}>
            <ThemedText style={styles.pickerBtnMuted}>Date</ThemedText>
            <ThemedText style={styles.pickerBtnValue}>{formatPollDateDdMmYyyy(publishAt)}</ThemedText>
          </Pressable>
          <Pressable style={[styles.pickerBtn, styles.half]} onPress={() => onPressPick('publish', 'time')}>
            <ThemedText style={styles.pickerBtnMuted}>Time</ThemedText>
            <ThemedText style={styles.pickerBtnValue}>{formatPollTimeHhMm(publishAt)}</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.block}>
        <ThemedText style={styles.fieldLabel}>{closeLabel}</ThemedText>
        <View style={styles.row2}>
          <Pressable style={[styles.pickerBtn, styles.half]} onPress={() => onPressPick('close', 'date')}>
            <ThemedText style={styles.pickerBtnMuted}>Date</ThemedText>
            <ThemedText style={styles.pickerBtnValue}>{formatPollDateDdMmYyyy(closeAt)}</ThemedText>
          </Pressable>
          <Pressable style={[styles.pickerBtn, styles.half]} onPress={() => onPressPick('close', 'time')}>
            <ThemedText style={styles.pickerBtnMuted}>Time</ThemedText>
            <ThemedText style={styles.pickerBtnValue}>{formatPollTimeHhMm(closeAt)}</ThemedText>
          </Pressable>
        </View>
      </View>

      <Modal visible={iosSheet !== null} transparent animationType="slide" onRequestClose={() => setIosSheet(null)}>
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIosSheet(null)} accessibilityLabel="Dismiss" />
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + Spacing.md }]}>
            {iosSheet ? (
              <>
                <DateTimePicker
                  value={iosSheet.draft}
                  mode={iosSheet.mode}
                  display="spinner"
                  themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                  onChange={(_, d) => {
                    if (d) setIosSheet((s) => (s ? { ...s, draft: d } : null));
                  }}
                />
                <View style={styles.modalActions}>
                  <Pressable style={styles.modalSecondary} onPress={() => setIosSheet(null)}>
                    <ThemedText style={styles.modalSecondaryText}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable style={styles.modalPrimary} onPress={applyIosDraft}>
                    <ThemedText style={styles.modalPrimaryText}>Done</ThemedText>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  block: { gap: Spacing.xs },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
    marginTop: Spacing.sm,
  },
  row2: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
  pickerBtn: {
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  pickerBtnMuted: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
  pickerBtnValue: {
    fontSize: FontSize.body,
    color: NeoText.primary,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
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
  hint: {
    fontSize: FontSize.xs,
    color: NeoText.muted,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    backgroundColor: '#16181c',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingTop: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  modalSecondary: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  modalSecondaryText: {
    color: NeoText.muted,
    fontSize: FontSize.body,
  },
  modalPrimary: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#00CCFF',
    borderRadius: Radius.md,
  },
  modalPrimaryText: {
    color: '#000',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.body,
  },
});
