import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';

import { FrostedGlassView } from '@/components/FrostedGlassView';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const JOIN_URL = 'https://www.spha.scot/join';

type AssociationMembershipModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function AssociationMembershipModal({ visible, onClose }: AssociationMembershipModalProps) {
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textMuted');
  const surfaceColor = useThemeColor({}, 'surface');

  const handleJoin = () => {
    Linking.openURL(JOIN_URL).catch(() => {
      // If Linking fails for any reason, keep it non-fatal and just close.
      onClose();
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.center} onPress={(e) => e.stopPropagation()}>
          <FrostedGlassView borderRadius={Radius.lg} intensity={12} overlayColor="rgba(0,0,0,0.35)" style={styles.sheet}>
            <View style={[styles.content, { backgroundColor: 'rgba(16,17,21,0.92)' }]}>
              <View style={styles.headerRow}>
                <ThemedText type="title" style={[styles.title, { color: textColor }]}>
                  Association Membership
                </ThemedText>
                <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
                  <ThemedText type="link" style={[styles.closeText, { color: textColor }]}>
                    X
                  </ThemedText>
                </Pressable>
              </View>

              <ThemedText style={[styles.body, { color: textColor }]}>
                This feature is reserved for full members receiving association services, which includes casework support with
                the Licensing Authority, professional representation at licensing hearings, civic licensing agent services and access
                to our licensing reform campaigns.
              </ThemedText>

              <View style={{ height: Spacing.md }} />

              <View style={styles.joinLine}>
                <ThemedText style={[styles.body, { color: mutedTextColor }]}>You can join us at </ThemedText>
                <Pressable onPress={handleJoin} style={styles.joinLink}>
                  <ThemedText type="link">www.spha.scot/join</ThemedText>
                </Pressable>
              </View>
            </View>
          </FrostedGlassView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  center: {
    width: '100%',
    maxWidth: 440,
  },
  sheet: {
    overflow: 'hidden',
    width: '100%',
    // The reserved-features text is long and wraps; keep enough vertical space
    // so the join sentence/link isn't clipped.
    minHeight: 280,
    alignSelf: 'stretch',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    marginBottom: Spacing.sm,
  },
  closeBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  closeText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
    opacity: 0.95,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  joinLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  joinLink: {
    paddingHorizontal: 2,
  },
});

