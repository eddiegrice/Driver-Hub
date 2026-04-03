import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, NeoGlass, NeoText, Radius, Spacing } from '@/constants/theme';

const EDITOR_HEIGHT = 280;

const HTML_TEMPLATE = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; height: 100%; background: #12131a; }
  #editor {
    min-height: 240px;
    padding: 12px;
    color: #e4e4e7;
    font-size: 16px;
    line-height: 1.45;
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  #editor:focus { outline: none; }
  #editor:empty:before {
    content: attr(data-placeholder);
    color: #71717a;
    pointer-events: none;
  }
  a { color: #00ccff; }
</style></head><body>
<div id="editor" contenteditable="true" spellcheck="true" data-placeholder="Main Article Text"></div>
<script>
(function () {
  var editor = document.getElementById('editor');
  function sync() {
    try {
      var html = editor.innerHTML;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'html', html: html }));
    } catch (e) {}
  }
  window.__setBody = function (encoded) {
    try {
      var html = decodeURIComponent(encoded);
      if (!html) {
        editor.innerHTML = '';
        sync();
        return;
      }
      if (html.indexOf('<') < 0) {
        editor.textContent = html;
      } else {
        editor.innerHTML = html;
      }
      sync();
    } catch (e) {
      editor.textContent = '';
      sync();
    }
  };
  window.__fmt = function (cmd, val) {
    try {
      document.execCommand(cmd, false, val || null);
      editor.focus();
      sync();
    } catch (e) {}
  };
  editor.addEventListener('input', sync);
  editor.addEventListener('blur', sync);
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', html: '' }));
})();
</script></body></html>`;

type Props = {
  initialHtml: string;
  onHtmlChange: (html: string) => void;
};

export function ArticleBodyHtmlEditor({ initialHtml, onHtmlChange }: Props) {
  const webRef = useRef<WebView>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');

  const inject = useCallback((js: string) => {
    webRef.current?.injectJavaScript(js);
  }, []);

  const pushInitial = useCallback(() => {
    const enc = encodeURIComponent(initialHtml ?? '');
    inject(`try{window.__setBody(${JSON.stringify(enc)});}catch(e){}; true;`);
  }, [initialHtml, inject]);

  const onMessage = useCallback(
    (e: { nativeEvent: { data: string } }) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data) as { type: string; html?: string };
        if (msg.type === 'html' && typeof msg.html === 'string') {
          onHtmlChange(msg.html);
        }
        if (msg.type === 'ready') {
          pushInitial();
        }
      } catch {
        /* ignore */
      }
    },
    [onHtmlChange, pushInitial]
  );

  useEffect(() => {
    pushInitial();
  }, [initialHtml, pushInitial]);

  const fmt = (cmd: string, val?: string) => {
    if (val !== undefined) {
      inject(`try{window.__fmt(${JSON.stringify(cmd)}, ${JSON.stringify(val)});}catch(e){}; true;`);
    } else {
      inject(`try{window.__fmt(${JSON.stringify(cmd)});}catch(e){}; true;`);
    }
  };

  const applyLink = () => {
    const u = linkUrl.trim();
    if (u) fmt('createLink', u);
    setLinkOpen(false);
    setLinkUrl('https://');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable style={styles.toolBtn} onPress={() => fmt('bold')}>
          <ThemedText style={styles.toolBtnText}>B</ThemedText>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={() => fmt('italic')}>
          <ThemedText style={[styles.toolBtnText, styles.toolItalic]}>I</ThemedText>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={() => fmt('underline')}>
          <ThemedText style={[styles.toolBtnText, styles.toolUnderline]}>U</ThemedText>
        </Pressable>
        <Pressable style={styles.toolBtn} onPress={() => setLinkOpen(true)}>
          <ThemedText style={styles.toolBtnText}>Link</ThemedText>
        </Pressable>
      </View>
      <WebView
        ref={webRef}
        source={{ html: HTML_TEMPLATE }}
        originWhitelist={['*']}
        onMessage={onMessage}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        hideKeyboardAccessoryView
        keyboardDisplayRequiresUserAction={false}
        nestedScrollEnabled
        scrollEnabled
      />

      <Modal visible={linkOpen} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => setLinkOpen(false)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <ThemedText style={styles.modalTitle}>Link URL</ThemedText>
            <TextInput
              style={styles.modalInput}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://"
              placeholderTextColor={NeoText.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setLinkOpen(false)}>
                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
              </Pressable>
              <Pressable style={styles.modalOk} onPress={applyLink}>
                <ThemedText style={styles.modalOkText}>Add link</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(22, 24, 32, 0.9)',
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: NeoGlass.cardBorder,
  },
  toolBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.lg - 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toolBtnText: {
    color: NeoText.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  toolItalic: { fontStyle: 'italic', fontWeight: FontWeight.semibold },
  toolUnderline: { textDecorationLine: 'underline' },
  webview: {
    height: EDITOR_HEIGHT,
    backgroundColor: '#12131a',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: '#1a1c24',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
  },
  modalTitle: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
    color: NeoText.secondary,
    marginBottom: Spacing.md,
  },
  modalInput: {
    backgroundColor: 'rgba(22, 24, 32, 0.9)',
    borderWidth: 1,
    borderColor: NeoGlass.cardBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    color: NeoText.primary,
    fontSize: FontSize.body,
    marginBottom: Spacing.md,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  modalCancel: { paddingVertical: 10, paddingHorizontal: Spacing.md },
  modalCancelText: { color: NeoText.muted, fontSize: FontSize.sm },
  modalOk: {
    backgroundColor: '#00CCFF',
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
  },
  modalOkText: { color: '#101115', fontWeight: FontWeight.bold, fontSize: FontSize.sm },
});
