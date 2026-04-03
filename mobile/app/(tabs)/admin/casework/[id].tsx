import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import type { Href } from 'expo-router';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { useCasework } from '@/context/CaseworkContext';
import { clearCaseworkClosureFlag } from '@/lib/casework-supabase';
import { supabase } from '@/lib/supabase';
import { useThemeColor } from '@/hooks/use-theme-color';
import { FontSize, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';
import { CASEWORK_STATUSES, type CaseworkStatus, statusLabel } from '@/types/casework';
import { formatDateForDisplay } from '@/types/member';

const SUBMIT_CYAN = '#00CCFF';

export default function AdminCaseworkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getTicket, addReply, refreshTickets, setTicketStatus } = useCasework();
  const ticket = id ? getTicket(id) : undefined;

  const [reply, setReply] = useState('');
  const [replyAtt, setReplyAtt] = useState<{ uri: string; name?: string; mimeType?: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [expandedMember, setExpandedMember] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const cardBg = useThemeColor({ light: 'rgba(0,0,0,0.05)', dark: 'rgba(255,255,255,0.06)' }, 'background');
  const modalSheetBg = useThemeColor({ light: '#f1f5f9', dark: '#14161c' }, 'surface');
  const replyInputBg = useThemeColor(
    { light: 'rgba(15, 23, 42, 0.07)', dark: 'rgba(255, 255, 255, 0.1)' },
    'background'
  );

  const removeReplyAtt = useCallback((uri: string) => {
    setReplyAtt((prev) => prev.filter((a) => a.uri !== uri));
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
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow access to photos to attach images.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (r.canceled || !r.assets?.length) return;
    setReplyAtt((p) => [
      ...p,
      ...r.assets!.map((a) => ({
        uri: a.uri,
        name: a.fileName != null ? a.fileName : undefined,
        mimeType: a.mimeType ?? 'image/jpeg',
      })),
    ]);
  }, []);

  const pickDoc = useCallback(async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
    if (r.canceled) return;
    const assets =
      'assets' in r && Array.isArray(r.assets)
        ? r.assets
        : [{ uri: (r as { uri?: string }).uri!, name: (r as { name?: string }).name, mimeType: (r as { mimeType?: string }).mimeType }];
    setReplyAtt((p) => [
      ...p,
      ...assets.map((a) => ({
        uri: a.uri,
        name: a.name != null ? a.name : undefined,
        mimeType: a.mimeType != null ? a.mimeType : undefined,
      })),
    ]);
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
    <AdminSubpageScaffold
      subsystemTitle="Case detail"
      backLabel="← Casework"
      onBackPress={() => router.replace('/admin/casework' as Href)}
      keyboardShouldPersistTaps="handled">
      <View style={styles.scroll}>
        <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
          <ThemedText type="defaultSemiBold">{ticket.type}</ThemedText>
          <ThemedText style={styles.sub}>{ticket.subject}</ThemedText>
          <ThemedText style={styles.meta}>
            {statusLabel(ticket.status)} · updated {formatDateForDisplay(ticket.updatedAt.slice(0, 10))}
          </ThemedText>
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
          <ThemedView style={[styles.card, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
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

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.cyanBtn, { backgroundColor: SUBMIT_CYAN }]}
            onPress={() => setStatusOpen(true)}
            activeOpacity={0.85}>
            <ThemedText style={styles.cyanBtnText}>Status: {statusLabel(ticket.status)}</ThemedText>
          </TouchableOpacity>
        </View>

        <Modal visible={statusOpen} transparent animationType="fade" onRequestClose={() => setStatusOpen(false)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={() => setStatusOpen(false)} />
            <View style={styles.modalCenter} pointerEvents="box-none">
              <View style={[styles.modalSheet, { backgroundColor: modalSheetBg, borderColor: NeoGlass.cardBorder }]}>
                <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                  {CASEWORK_STATUSES.map((s) => (
                    <Pressable key={s} style={styles.modalRow} onPress={() => changeStatus(s)}>
                      <ThemedText style={{ color: textColor }}>{statusLabel(s)}</ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </Modal>

        <View style={styles.threadSection}>
          <ThemedText type="subtitle">Thread</ThemedText>
          <View style={styles.threadList}>
            {(ticket.messages ?? []).map((msg) => (
              <ThemedView key={msg.id} style={[styles.bubble, { backgroundColor: cardBg }]}>
                <ThemedText selectable>{msg.text}</ThemedText>
                <ThemedText style={styles.meta}>
                  {msg.sender === 'member' ? 'Member' : 'Staff'} · {msg.createdAt.slice(0, 16).replace('T', ' ')}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        </View>

        <ThemedView
          style={[styles.glassPanel, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
          <TextInput
            style={[
              styles.input,
              { color: textColor, backgroundColor: replyInputBg, borderColor: NeoGlass.cardBorder },
            ]}
            value={reply}
            onChangeText={setReply}
            multiline
            placeholder="Message…"
            placeholderTextColor={NeoText.muted}
          />
          <View style={styles.attachRow}>
            <TouchableOpacity style={[styles.attachBtn, { borderColor }]} onPress={pickImg}>
              <ThemedText style={styles.attachBtnText}>Add Photos</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.attachBtn, { borderColor }]} onPress={pickDoc}>
              <ThemedText style={styles.attachBtnText}>Add Documents</ThemedText>
            </TouchableOpacity>
          </View>
          {replyAtt.length > 0 ? (
            <ThemedView style={styles.pendingThumbs}>
              {replyAtt.map((a) => (
                <ThemedView key={a.uri} style={styles.pendingThumbWrap}>
                  {a.mimeType?.startsWith('image/') ? (
                    <Image source={{ uri: a.uri }} style={styles.pendingThumb} />
                  ) : (
                    <View style={[styles.pendingThumb, styles.pendingDocThumb]}>
                      <ThemedText style={styles.pendingDocThumbText} numberOfLines={2}>
                        {a.name ?? 'File'}
                      </ThemedText>
                    </View>
                  )}
                  <TouchableOpacity style={styles.removeThumb} onPress={() => removeReplyAtt(a.uri)}>
                    <ThemedText style={styles.removeThumbText}>×</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ))}
            </ThemedView>
          ) : null}
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: SUBMIT_CYAN }, sending && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || (!reply.trim() && replyAtt.length === 0)}
            activeOpacity={0.85}>
            <ThemedText style={styles.sendButtonText}>{sending ? 'Sending…' : 'Send reply'}</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {ticket.attachments && ticket.attachments.length > 0 ? (
          <ThemedView
            style={[styles.glassPanel, { backgroundColor: cardBg, borderColor: NeoGlass.cardBorder }]}>
            <ThemedText type="subtitle">Attachments</ThemedText>
            <View style={styles.caseThumbs}>
              {ticket.attachments.map((a) => (
                <Pressable key={a.id} onPress={() => openAtt(a.uri)}>
                  {a.mimeType?.startsWith('image/') && a.uri ? (
                    <Image source={{ uri: a.uri }} style={styles.caseThumb} />
                  ) : (
                    <View style={[styles.caseThumb, styles.caseDocThumb]}>
                      <ThemedText style={styles.caseDocLabel} numberOfLines={2}>
                        {a.name ?? 'Open file'}
                      </ThemedText>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </ThemedView>
        ) : null}
      </View>
    </AdminSubpageScaffold>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: Spacing.xxl, gap: Spacing.md },
  card: { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, gap: 6 },
  sub: { opacity: 0.9 },
  meta: { fontSize: FontSize.sm, color: NeoText.muted },
  closureBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  closureText: { fontSize: FontSize.sm, flex: 1 },
  detailBlock: { marginTop: Spacing.sm, fontSize: FontSize.sm, lineHeight: 20 },
  actionRow: { marginTop: Spacing.xs },
  cyanBtn: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  cyanBtnText: { fontWeight: '600', fontSize: 16, color: '#000' },
  modalRoot: { flex: 1 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  modalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalSheet: { maxHeight: 400, borderRadius: Radius.lg, borderWidth: 1, overflow: 'hidden' },
  modalScroll: { maxHeight: 400 },
  modalRow: { paddingVertical: 14, paddingHorizontal: Spacing.lg },
  threadSection: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  threadList: { gap: Spacing.sm },
  bubble: { padding: Spacing.md, borderRadius: Radius.md },
  glassPanel: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 88,
    textAlignVertical: 'top',
  },
  attachRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  attachBtn: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  attachBtnText: { opacity: 0.85 },
  pendingThumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pendingThumbWrap: { position: 'relative' },
  pendingThumb: { width: 72, height: 72, borderRadius: 8 },
  pendingDocThumb: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  pendingDocThumbText: { fontSize: 10, textAlign: 'center' },
  removeThumb: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeThumbText: { color: '#fff', fontSize: 18, lineHeight: 20 },
  sendButton: {
    marginTop: Spacing.md,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  sendButtonDisabled: { opacity: 0.55 },
  sendButtonText: { fontWeight: '600', fontSize: 16, color: '#000' },
  caseThumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  caseThumb: { width: 80, height: 80, borderRadius: 8 },
  caseDocThumb: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  caseDocLabel: { fontSize: 11, textAlign: 'center' },
});
