```tsx
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { AdminSubpageScaffold } from '@/components/admin/AdminSubpageScaffold';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useCasework } from '@/context/CaseworkContext';
import { clearCaseworkClosureFlag, listAdminMembersForAssign } from '@/lib/casework-supabase';
import { supabase } from '@/lib/supabase';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FontSize, NeoText, Radius, Spacing } from '@/constants/theme';
import { CASEWORK_STATUSES, type CaseworkStatus, statusLabel } from '@/types/casework';
import { formatDateForDisplay } from '@/types/member';

export default function AdminCaseworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTicket, addReply, refreshTickets, setTicketStatus, setAssignedAdmin } = useCasework();
  const ticket = id ? getTicket(id) : undefined;

  const [reply, setReply] = useState('');
  const [replyAtt, setReplyAtt] = useState<{ uri: string; name?: string; mimeType?: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [admins, setAdmins] = useState<{ id: string; name: string }[]>([]);
  const [expandedMember, setExpandedMember] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const surfaceColor = useThemeColor({}, 'surface');
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');

  useEffect(() => {
    if (!supabase) return;
    void (async () => {
      const { rows } = await listAdminMembersForAssign(supabase);
      setAdmins(rows);
    })();
  }, []);

  const handleSend = useCallback(async () => {
    if (!id) return;
    const t = reply.trim();
    if (!t && replyAtt.length === 0) return;
    setSending(true);
    try {
      const { error } = await addReply(id, t, replyAtt);
      if (error) Alert.alert('Error', error.message);
      else {
        setReply('');
        setReplyAtt([]);
        await refreshTickets();
      }
    } finally {
      setSending(false);
    }
  }, [id, reply, replyAtt, addReply, refreshTickets]);

  const pickImg = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (r.canceled || !r.assets?.length) return;
    setReplyAtt((p) => [
      ...p,
      ...r.assets!.map((a) => ({ uri: a.uri, name: a.fileName, mimeType: a.mimeType ?? 'image/jpeg' })),
    ]);
  }, []);

  const pickDoc = useCallback(async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    if (r.canceled) return;
    const assets =
      'assets' in r && Array.isArray(r.assets)
        ? r.assets
        : [{ uri: (r as { uri?: string }).uri!, name: (r as { name?: string }).name, mimeType: (r as { mimeType?: string }).mimeType }];
    setReplyAtt((p) => [...p, ...assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }))]);
  }, []);

  const openAtt = useCallback(async (uri: string) => {
    if (uri) await WebBrowser.openBrowserAsync(uri);
  }, []);

  const changeStatus = useCallback(
    async (s: CaseworkStatus) => {
      if (!id) return;
      setStatusOpen(false);
      const { error } = await setTicketStatus(id, s);
      if (error) Alert.alert('Error', error.message);
    },
    [id, setTicketStatus]
  );

  const pickAssign = useCallback(
    async (adminId: string | null) => {
      if (!id) return;
      setAssignOpen(false);
      const { error } = await setAssignedAdmin(id, adminId);
      if (error) Alert.alert('Error', error.message);
    },
    [id, setAssignedAdmin]
  );

  const clearClosure = useCallback(async () => {
    if (!id || !supabase) return;
    const { error } = await clearCaseworkClosureFlag(supabase, id);
    if (error) Alert.alert('Error', error.message);
    else await refreshTickets();
  }, [id, refreshTickets]);

  if (!id || !ticket) {
    return (
      <AdminSubpageScaffold subsystemTitle="Casework" backLabel="← Casework" onBackPress={() => router.back()}>
        <ThemedText>Case not found.</ThemedText>
      </AdminSubpageScaffold>
    );
  }

  const m = ticket.memberSnapshot;

  return (
    <AdminSubpageScaffold subsystemTitle="Case detail" backLabel="← Casework" onBackPress={() => router.replace('/admin/casework' as Href)}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <ThemedView style={[styles.card, { backgroundColor: cardBg }]}>
          <ThemedText type="defaultSemiBold">{ticket.type}</ThemedText>
          <ThemedText style={styles.sub}>{ticket.subject}</ThemedText>
          <ThemedText style={styles.meta}>
            {statusLabel(ticket.status)} · updated {formatDateForDisplay(ticket.updatedAt.slice(0, 10))}
          </ThemedText>
          {ticket.assignedAdminName ? (
            <ThemedText style={styles.meta}>Tagged: {ticket.assignedAdminName}</ThemedText>
          ) : (
            <ThemedText style={styles.meta}>Tagged: —</ThemedText>
          )}
          {ticket.closureRequested ? (
            <ThemedView style={styles.closureBanner}>
              <ThemedText style={styles.closureText}>Member requested closure</ThemedText>
              <TouchableOpacity onPress={clearClosure}>
                <ThemedText type="link">Clear flag</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ) : null}
        </ThemedView>

        {ticket.memberId ? (
          <ThemedView style={[styles.card, { backgroundColor: cardBg }]}>
            <Pressable onPress={() => setExpandedMember((e) => !e)}>
              <ThemedText type="defaultSemiBold">
                Member · {m.name || '—'} · badge {m.badgeNumber || '—'}
              </ThemedText>
              <ThemedText style={styles.meta}>{expandedMember ? 'Hide details' : 'Show details'}</ThemedText>
            </Pressable>
            {expandedMember ? (
              <ThemedText style={styles.detailBlock} selectable>
                {`Vehicle: ${m.vehicleMake} ${m.vehicleModel} · ${m.vehicleRegistration}\nPlate: ${m.plateNumber}\nMembership: ${m.membershipStatus} · ${m.membershipNumber}`}
              </ThemedText>
            ) : null}
          </ThemedView>
        ) : (
          <ThemedText style={styles.meta}>Internal case (no member record)</ThemedText>
        )}

        <PrimaryButton title={`Status: ${statusLabel(ticket.status)}`} onPress={() => setStatusOpen(true)} fullWidth />
        <PrimaryButton title="Set assigned caseworker tag" onPress={() => setAssignOpen(true)} fullWidth />

        <Modal visible={statusOpen} transparent animationType="fade">
          <Pressable style={styles.modalBg} onPress={() => setStatusOpen(false)}>
            <ThemedView style={[styles.modalSheet, { backgroundColor: surfaceColor, borderColor }]}>
              <ScrollView>
                {CASEWORK_STATUSES.map((s) => (
                  <Pressable key={s} style={styles.modalRow} onPress={() => changeStatus(s)}>
                    <ThemedText style={{ color: textColor }}>{statusLabel(s)}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </ThemedView>
          </Pressable>
        </Modal>

        <Modal visible={assignOpen} transparent animationType="fade">
          <Pressable style={styles.modalBg} onPress={() => setAssignOpen(false)}>
            <ThemedView style={[styles.modalSheet, { backgroundColor: surfaceColor, borderColor }]}>
              <ScrollView>
                <Pressable style={styles.modalRow} onPress={() => pickAssign(null)}>
                  <ThemedText style={{ color: textColor }}>None</ThemedText>
                </Pressable>
                {admins.map((a) => (
                  <Pressable key={a.id} style={styles.modalRow} onPress={() => pickAssign(a.id)}>
                    <ThemedText style={{ color: textColor }}>{a.name || a.id}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </ThemedView>
          </Pressable>
        </Modal>

        <ThemedText type="subtitle">Thread</ThemedText>
        {(ticket.messages ?? []).map((msg) => (
          <ThemedView key={msg.id} style={[styles.bubble, { backgroundColor: cardBg }]}>
            <ThemedText selectable>{msg.text}</ThemedText>
            <ThemedText style={styles.meta}>
              {msg.sender === 'member' ? 'Member' : 'Staff'} · {msg.createdAt.slice(0, 16).replace('T', ' ')}
            </ThemedText>
          </ThemedView>
        ))}

        {ticket.attachments?.length ? (
          <>
            <ThemedText type="subtitle">Attachments</ThemedText>
            <View style={styles.thumbs}>
              {ticket.attachments.map((a) => (
                <Pressable key={a.id} onPress={() => openAtt(a.uri)}>
                  {a.mimeType?.startsWith('image/') && a.uri ? (
                    <Image source={{ uri: a.uri }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.docThumb]}>
                      <ThemedText style={styles.docT} numberOfLines={2}>
                        {a.name ?? 'File'}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <ThemedText style={styles.label}>Staff reply</ThemedText>
        <TextInput
          style={[styles.input, { color: textColor, borderColor, backgroundColor: surfaceColor }]}
          value={reply}
          onChangeText={setReply}
          multiline
          placeholder="Message…"
          placeholderTextColor={NeoText.muted}
        />
        <View style={styles.attachRow}>
          <TouchableOpacity onPress={pickImg} style={styles.mini}>
            <ThemedText style={styles.miniT}>+ Photo</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={pickDoc} style={styles.mini}>
            <ThemedText style={styles.miniT}>+ Doc</ThemedText>
          </TouchableOpacity>
        </View>
        <PrimaryButton title={sending ? 'Sending…' : 'Send reply'} onPress={handleSend} disabled={sending} fullWidth />
      </ScrollView>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing.xxl, gap: Spacing.md },
  card: { padding: Spacing.lg, borderRadius: Radius.lg, gap: 6 },
  sub: { opacity: 0.9 },
  meta: { fontSize: FontSize.sm, color: NeoText.muted },
  closureBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  closureText: { fontSize: FontSize.sm, flex: 1 },
  detailBlock: { marginTop: Spacing.sm, fontSize: FontSize.sm, lineHeight: 20 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl },
  modalSheet: { maxHeight: 400, borderRadius: Radius.lg, borderWidth: 1 },
  modalRow: { paddingVertical: 14, paddingHorizontal: Spacing.lg },
  bubble: { padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.sm },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  docThumb: { backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', padding: 4 },
  docT: { fontSize: 10, textAlign: 'center' },
  label: { fontWeight: '600', marginTop: Spacing.md },
  input: { borderWidth: 1, borderRadius: Radius.md, minHeight: 88, padding: Spacing.md, textAlignVertical: 'top' },
  attachRow: { flexDirection: 'row', gap: 10 },
  mini: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  miniT: { fontSize: 13 },
});
```
