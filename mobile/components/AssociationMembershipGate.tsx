import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AssociationMembershipModal } from '@/components/AssociationMembershipModal';
import { TabScreenHeader } from '@/components/TabScreenHeader';
import { ThemedText } from '@/components/themed-text';
import { useMember } from '@/context/MemberContext';
import { useThemeColor } from '@/hooks/use-theme-color';

type AssociationMembershipGateProps = {
  title: string;
  children: React.ReactNode;
};

export function AssociationMembershipGate({ title, children }: AssociationMembershipGateProps) {
  const { memberStatus, isLoading } = useMember();
  const textColor = useThemeColor({}, 'text');
  const mutedTextColor = useThemeColor({}, 'textMuted');

  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reset dismissal whenever membership state changes.
    setDismissed(false);
  }, [memberStatus.isActive]);

  const showModal = useMemo(() => !isLoading && !memberStatus.isActive && !dismissed, [isLoading, memberStatus.isActive, dismissed]);

  if (isLoading || memberStatus.isActive) {
    return (
      <>
        <AssociationMembershipModal visible={showModal} onClose={() => setDismissed(true)} />
        {children}
      </>
    );
  }

  return (
    <>
      <AssociationMembershipModal visible={showModal} onClose={() => setDismissed(true)} />
      <View style={styles.screen}>
        <TabScreenHeader title={title} />
        <View style={styles.placeholder}>
          <ThemedText style={[styles.placeholderText, { color: mutedTextColor }]}>
            This section is for active members.
          </ThemedText>
          <ThemedText style={[styles.placeholderText, { color: textColor }]}>{title}</ThemedText>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  placeholder: { paddingHorizontal: 24, paddingTop: 20, gap: 10 },
  placeholderText: { fontSize: 14, lineHeight: 20 },
});

