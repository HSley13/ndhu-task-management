import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, TextInput,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTaskStore } from '../../store/useTaskStore';
import { AttachmentRow } from '../ui/AttachmentRow';
import { colors, spacing, radius, fontSize } from '../../theme';

type NoteEditorRoute = RouteProp<{ NoteEditor: { taskId?: string } }, 'NoteEditor'>;

export function NoteEditorScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<NoteEditorRoute>();
  const taskId = route.params?.taskId;
  const isCreateMode = !taskId;

  const { openTask, updateTask, addAttachment, deleteAttachment, openTaskDetail, addTask } = useTaskStore();
  const webViewRef = useRef<WebView>(null);
  const iframeRef  = useRef<any>(null); // web only

  const [title, setTitle] = useState('');
  const [editorReady, setEditorReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Array<{ uri: string; name: string; mime_type: string; size_bytes: number }>>([]);
  const htmlRef = useRef<string>('');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialHtml = useRef<string>('');

  // Load existing task data in edit mode
  useEffect(() => {
    if (isCreateMode) return;
    if (!openTask || openTask.id !== taskId) {
      openTaskDetail(taskId!);
    } else {
      setTitle(openTask.title);
      initialHtml.current = openTask.note_content ?? '';
      htmlRef.current = initialHtml.current;
    }
  }, [taskId, openTask?.id]);

  // Inject content once editor signals ready
  const onEditorReady = useCallback(() => {
    setEditorReady(true);
    if (initialHtml.current) {
      sendToEditor('set_content', { html: initialHtml.current });
    }
  }, []);

  const sendToEditor = useCallback((type: string, payload: Record<string, unknown>) => {
    const msg = JSON.stringify({ type, payload });
    if (Platform.OS === 'web') {
      iframeRef.current?.contentWindow?.postMessage(msg, '*');
    } else {
      webViewRef.current?.injectJavaScript(
        `window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msg)}}));true;`
      );
    }
  }, []);

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const { type, payload } = JSON.parse(event.nativeEvent.data);
      if (type === 'ready') onEditorReady();
      if (type === 'content_change') htmlRef.current = payload.html ?? '';
    } catch {}
  }, [onEditorReady]);

  // Web: receive messages from the <iframe> via window.postMessage
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (event: MessageEvent) => {
      try {
        const { type, payload } = JSON.parse(event.data as string);
        if (type === 'ready') onEditorReady();
        if (type === 'content_change') htmlRef.current = payload.html ?? '';
      } catch {}
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).addEventListener('message', handler);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => (window as any).removeEventListener('message', handler);
  }, [onEditorReady]);

  function handleSave() {
    setSaving(true);
    if (Platform.OS === 'web') {
      // On web, htmlRef is already current from continuous content_change messages
      doSave();
    } else {
      // Flush absolute latest innerHTML before saving (WebView only)
      webViewRef.current?.injectJavaScript(
        `(function(){
          var el=document.getElementById('editor');
          var h=el?el.innerHTML:'';
          if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'content_change',payload:{html:h}}));
        })();true;`
      );
      saveTimeoutRef.current = setTimeout(doSave, 300);
    }
  }

  async function doSave() {
    if (saveTimeoutRef.current) { clearTimeout(saveTimeoutRef.current); saveTimeoutRef.current = null; }
    const resolvedTitle = title.trim() || 'Untitled note';
    try {
      if (isCreateMode) {
        const task = await addTask({
          title: resolvedTitle,
          course: null,
          due_date: null,
          due_time: null,
          source: 'manual',
          status: 'pending',
          is_pinned: false,
          is_note: true,
          note_content: htmlRef.current || null,
          moodle_url: null,
          moodle_event_id: null,
          postponed_until: null,
        });
        for (const att of pendingAttachments) {
          await addAttachment(task.id, { task_id: task.id, ...att });
        }
      } else {
        await updateTask(taskId!, { title: resolvedTitle, note_content: htmlRef.current });
      }
      navigation.goBack();
    } catch {
      setSaving(false);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const mime = `image/${ext === 'png' ? 'png' : 'jpeg'}`;
    sendToEditor('insert_image', { src: `data:${mime};base64,${asset.base64}` });
    const attData = { uri: asset.uri, name: asset.fileName ?? `image.${ext}`, mime_type: mime, size_bytes: asset.fileSize ?? 0 };
    if (isCreateMode) {
      setPendingAttachments((prev) => [...prev, attData]);
    } else {
      await addAttachment(taskId!, { task_id: taskId!, ...attData });
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.7 });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    sendToEditor('insert_image', { src: `data:image/jpeg;base64,${asset.base64}` });
    const attData = { uri: asset.uri, name: asset.fileName ?? 'photo.jpg', mime_type: 'image/jpeg', size_bytes: asset.fileSize ?? 0 };
    if (isCreateMode) {
      setPendingAttachments((prev) => [...prev, attData]);
    } else {
      await addAttachment(taskId!, { task_id: taskId!, ...attData });
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const file = result.assets[0];
    if (!file) return;
    let uri = file.uri;
    if (Platform.OS !== 'web') {
      const dir = `${FileSystem.documentDirectory}attachments/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await FileSystem.copyAsync({ from: file.uri, to: dest });
      uri = dest;
    }
    const attData = { uri, name: file.name, mime_type: file.mimeType ?? 'application/octet-stream', size_bytes: file.size ?? 0 };
    if (isCreateMode) {
      setPendingAttachments((prev) => [...prev, attData]);
    } else {
      await addAttachment(taskId!, { task_id: taskId!, ...attData });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={8}>
          <Feather name="x" size={22} color={colors.text.secondary} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={handleSave} style={styles.saveBtn} disabled={saving} hitSlop={8}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveText}>{isCreateMode ? 'Create' : 'Save'}</Text>}
        </Pressable>
      </View>

      {/* Title input */}
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.text.tertiary}
        style={styles.titleInput}
        maxLength={200}
        returnKeyType="next"
        blurOnSubmit={false}
      />

      {/* Rich text editor — WebView on native, iframe on web */}
      <View style={styles.editorWrap}>
        {!editorReady && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent.default} />
            <Text style={styles.loadingText}>Loading editor…</Text>
          </View>
        )}
        {Platform.OS === 'web' ? (
          // @ts-ignore – <iframe> is a valid DOM element when running on web
          <iframe
            ref={iframeRef}
            srcDoc={EDITOR_HTML}
            title="Rich text editor"
            sandbox="allow-scripts allow-same-origin"
            style={{ flex: 1, border: 'none', width: '100%', height: '100%', backgroundColor: colors.bg.base } as any}
          />
        ) : (
          <WebView
            ref={webViewRef}
            source={{ html: EDITOR_HTML }}
            onMessage={onMessage}
            javaScriptEnabled
            domStorageEnabled
            originWhitelist={['*']}
            style={styles.webview}
            keyboardDisplayRequiresUserAction={false}
            scrollEnabled
            allowsInlineMediaPlayback
          />
        )}
      </View>

      {/* Attachments panel — always visible */}
      <View style={styles.attPanel}>
        <View style={styles.attHeader}>
          <Text style={styles.attHeaderLabel}>Attachments</Text>
          <View style={styles.attActions}>
            <Pressable style={styles.attAction} onPress={pickImage} hitSlop={6}>
              <Feather name="image" size={18} color={colors.text.secondary} />
            </Pressable>
            <Pressable style={styles.attAction} onPress={takePhoto} hitSlop={6}>
              <Feather name="camera" size={18} color={colors.text.secondary} />
            </Pressable>
            <Pressable style={styles.attAction} onPress={pickFile} hitSlop={6}>
              <Feather name="paperclip" size={18} color={colors.text.secondary} />
            </Pressable>
          </View>
        </View>

        {(() => {
          const atts = isCreateMode
            ? pendingAttachments.map((a, i) => ({ ...a, id: String(i), task_id: '' }))
            : (openTask?.attachments ?? []);
          if (atts.length === 0) {
            return (
              <View style={styles.attEmpty}>
                <Text style={styles.attEmptyText}>No attachments yet — tap an icon above to add</Text>
              </View>
            );
          }
          return (
            <ScrollView
              style={styles.attList}
              contentContainerStyle={styles.attListContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              {atts.map((att, i) => (
                <AttachmentRow
                  key={att.id}
                  attachment={att}
                  onDelete={isCreateMode
                    ? () => setPendingAttachments((p) => p.filter((_, idx) => idx !== i))
                    : () => deleteAttachment(att.id)
                  }
                />
              ))}
            </ScrollView>
          );
        })()}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: colors.bg.base },
  header:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  headerBtn:       { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtn:         { paddingHorizontal: spacing[4], paddingVertical: spacing[2], backgroundColor: colors.accent.default, borderRadius: radius.md },
  saveText:        { fontSize: fontSize.sm, fontWeight: '700', color: '#fff' },
  titleInput:      { paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3], fontSize: 24, fontWeight: '700', color: colors.text.primary, borderBottomWidth: 1, borderBottomColor: colors.border.subtle },
  editorWrap:      { flex: 1, position: 'relative' },
  webview:         { flex: 1, backgroundColor: colors.bg.base },
  loadingOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg.base, zIndex: 10, gap: spacing[3] },
  loadingText:     { fontSize: fontSize.sm, color: colors.text.tertiary },
  // \u2500\u2500 Attachments panel \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  attPanel: {
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.surface,
    maxHeight: 260,
  },
  attHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    gap: spacing[3],
  },
  attHeaderLabel: {
    flex: 1,
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  attActions: {
    flexDirection: 'row',
    gap: spacing[1],
  },
  attAction: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.elevated,
  },
  attEmpty: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  attEmptyText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  attList: {
    maxHeight: 190,
  },
  attListContent: {
    padding: spacing[3],
    gap: spacing[2],
  },
});

// ── Inline self-contained rich text editor ─────────────────────────────────────
// Uses contenteditable + document.execCommand — no CDN, works fully offline.
const EDITOR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#0C0C15;-webkit-text-size-adjust:100%}
body{display:flex;flex-direction:column;color:#E2E2F0;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif;overflow:hidden;font-feature-settings:"kern"1,"liga"1}

/* ── scroll / editor area ── */
#scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
#editor{
  min-height:100%;
  padding:20px 18px 52px;
  outline:none;
  font-size:16px;
  line-height:1.8;
  color:#E2E2F0;
  word-wrap:break-word;
  -webkit-user-select:text;
  user-select:text;
  caret-color:#8C7DFF;
}
#editor:empty::before{content:attr(data-placeholder);color:#44445A;pointer-events:none}

/* ── inline styles ── */
#editor b,#editor strong{font-weight:700;color:#F0F0FF}
#editor i,#editor em{font-style:italic;color:#C8C8E8}
#editor u{text-decoration:underline;text-underline-offset:3px}
#editor s,#editor strike{text-decoration:line-through;color:#7070A0}

/* ── headings ── */
#editor h1{
  font-size:1.65em;font-weight:800;
  color:#F6F6FF;
  margin:1.1em 0 .35em;
  line-height:1.25;
  letter-spacing:-.5px;
  border-bottom:1px solid #1E1E30;
  padding-bottom:.35em;
}
#editor h2{
  font-size:1.25em;font-weight:700;
  color:#DDDDF8;
  margin:.9em 0 .3em;
  line-height:1.3;
  letter-spacing:-.3px;
}
#editor h3{
  font-size:1.05em;font-weight:600;
  color:#9898C8;
  margin:.8em 0 .25em;
  line-height:1.4;
  text-transform:uppercase;
  letter-spacing:.6px;
}
#editor h1:first-child,#editor h2:first-child,#editor h3:first-child{margin-top:0}

/* ── paragraphs & lists ── */
#editor p{margin-bottom:.6em}
#editor ul{list-style:none;padding-left:1.4em;margin-bottom:.6em}
#editor ul li::before{content:"•";color:#8C7DFF;font-weight:700;margin-left:-1.1em;margin-right:.45em}
#editor ol{padding-left:1.6em;margin-bottom:.6em}
#editor ol li{padding-left:.2em}
#editor li{margin-bottom:.2em;line-height:1.7}
#editor ul ul,#editor ol ol,#editor ul ol,#editor ol ul{margin:.2em 0}

/* ── blockquote ── */
#editor blockquote{
  border-left:3px solid #8C7DFF;
  background:rgba(140,125,255,.07);
  padding:10px 14px;
  margin:.7em 0;
  border-radius:0 6px 6px 0;
  color:#A8A8CC;
  font-style:italic;
}

/* ── hr ── */
#editor hr{
  border:none;
  height:1px;
  background:linear-gradient(to right,transparent,#2E2E48,transparent);
  margin:1.2em 0;
}

/* ── links ── */
#editor a{color:#8C7DFF;text-decoration:underline;text-underline-offset:2px}

/* ── highlight + inline code ── */
#editor mark{background:rgba(255,214,0,.22);color:#FFE566;border-radius:3px;padding:0 2px}
#editor code{background:#1A1A2E;color:#A99CFF;border-radius:4px;padding:1px 5px;font-family:'SF Mono','Fira Code',monospace;font-size:.88em;border:1px solid #2E2E48}

/* ── images ── */
#editor img{max-width:100%;border-radius:8px;margin:8px 0;display:block;box-shadow:0 2px 12px rgba(0,0,0,.4)}

/* ── selection ── */
::selection{background:rgba(140,125,255,.28);color:inherit}

/* ── toolbar ── */
#tb{
  display:flex;
  flex-direction:row;
  align-items:center;
  flex-wrap:nowrap;
  gap:4px;
  padding:8px 10px;
  background:#111120;
  border-top:1px solid #1E1E30;
  flex-shrink:0;
  overflow-x:auto;
  scrollbar-width:none;
  -ms-overflow-style:none;
}
#tb::-webkit-scrollbar{display:none}

/* groups */
.g{
  display:flex;
  gap:2px;
  background:#18182A;
  border-radius:8px;
  padding:3px;
  flex-shrink:0;
}
/* button */
.b{
  display:flex;
  align-items:center;
  justify-content:center;
  min-width:32px;
  height:32px;
  padding:0 6px;
  border-radius:6px;
  border:none;
  background:transparent;
  color:#6868A8;
  font-size:12.5px;
  font-weight:700;
  cursor:pointer;
  -webkit-tap-highlight-color:transparent;
  font-family:inherit;
  letter-spacing:-.4px;
  user-select:none;
  -webkit-user-select:none;
  transition:background .1s,color .1s;
}
.b svg{width:16px;height:16px;fill:currentColor;pointer-events:none;display:block}
.b:active,.b.on{
  background:rgba(140,125,255,.2);
  color:#A99CFF;
}
</style>
</head>
<body>
<div id="scroll"><div id="editor" contenteditable="true" data-placeholder="Start writing…"></div></div>

<!-- link modal overlay -->
<div id="linkModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:100;align-items:center;justify-content:center">
  <div style="background:#18182A;border-radius:14px;padding:18px 16px;width:88%;max-width:340px;box-shadow:0 8px 32px rgba(0,0,0,.6)">
    <p style="font-size:12px;font-weight:700;color:#6868A8;text-transform:uppercase;letter-spacing:.7px;margin-bottom:10px">Insert link</p>
    <input id="linkText" placeholder="Display text" style="width:100%;background:#0C0C15;color:#E2E2F0;border:1px solid #2E2E48;border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit;margin-bottom:8px;outline:none"/>
    <input id="linkUrl" placeholder="https://…" type="url" style="width:100%;background:#0C0C15;color:#E2E2F0;border:1px solid #2E2E48;border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit;outline:none"/>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button id="linkCancel" class="b" style="flex:1;height:38px;background:#0C0C15;border-radius:8px;font-size:13px">Cancel</button>
      <button id="linkOk" class="b" style="flex:1;height:38px;background:#8C7DFF;border-radius:8px;font-size:13px;color:#fff;font-weight:700">Insert</button>
    </div>
  </div>
</div>

<div id="tb">
  <!-- inline formatting -->
  <div class="g">
    <button class="b" id="bB" title="Bold"><svg viewBox="0 0 24 24"><path d="M13.5 15.5H10v-3h3.5a1.5 1.5 0 0 1 0 3zm-3.5-9h3a1.5 1.5 0 0 1 0 3H10V6.5zm5.33 3.86A3.5 3.5 0 0 0 13 4H8v16h5.5a3.5 3.5 0 0 0 1.83-6.46z"/></svg></button>
    <button class="b" id="bI" title="Italic"><svg viewBox="0 0 24 24"><path d="M10 4v3h2.21l-3.42 10H6v3h8v-3h-2.21l3.42-10H18V4z"/></svg></button>
    <button class="b" id="bU" title="Underline"><svg viewBox="0 0 24 24"><path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/></svg></button>
    <button class="b" id="bS" title="Strikethrough"><svg viewBox="0 0 24 24"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg></button>
    <button class="b" id="bHL" title="Highlight" style="font-size:13px;font-weight:800">A</button>
    <button class="b" id="bCO" title="Inline code" style="font-size:12px;letter-spacing:-.3px;font-family:monospace">&lt;/&gt;</button>
  </div>
  <!-- headings -->
  <div class="g">
    <button class="b" id="bH1" style="font-size:11px;letter-spacing:-.5px">H1</button>
    <button class="b" id="bH2" style="font-size:11px;letter-spacing:-.5px">H2</button>
    <button class="b" id="bH3" style="font-size:11px;letter-spacing:-.5px">H3</button>
  </div>
  <!-- lists / block -->
  <div class="g">
    <button class="b" id="bUL" title="Bullet list"><svg viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg></button>
    <button class="b" id="bOL" title="Numbered list"><svg viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg></button>
    <button class="b" id="bBQ" title="Blockquote"><svg viewBox="0 0 24 24"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg></button>
    <button class="b" id="bHR" title="Divider" style="font-size:17px;font-weight:300;letter-spacing:0">—</button>
  </div>
  <!-- indent -->
  <div class="g">
    <button class="b" id="bIN" title="Indent"><svg viewBox="0 0 24 24"><path d="M3 19h18v-2H3v2zm0-6h12v-2H3v2zm0-8v2h18V5H3zm7 5v4l4-2-4-2z"/></svg></button>
    <button class="b" id="bOUT" title="Outdent"><svg viewBox="0 0 24 24"><path d="M11 17h10v-2H11v2zm-8-5l4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z"/></svg></button>
  </div>
  <!-- alignment -->
  <div class="g">
    <button class="b" id="bAL" title="Align left"><svg viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg></button>
    <button class="b" id="bAC" title="Align center"><svg viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z"/></svg></button>
    <button class="b" id="bAR" title="Align right"><svg viewBox="0 0 24 24"><path d="M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z"/></svg></button>
  </div>
  <!-- link -->
  <div class="g">
    <button class="b" id="bLK" title="Insert link"><svg viewBox="0 0 24 24"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg></button>
    <button class="b" id="bULK" title="Remove link"><svg viewBox="0 0 24 24"><path d="m17 7-1.41 1.41L17.17 10H13v2h4.17l-1.58 1.58L17 15l4-4-4-4zM7 11H3v2h4.17l-1.58 1.58L7 16l4-4-4-4-1.41 1.41L7.17 11H7z"/></svg></button>
  </div>
  <!-- clear + undo/redo -->
  <div class="g">
    <button class="b" id="bCLR" title="Clear formatting"><svg viewBox="0 0 24 24"><path d="M3.27 5 2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z"/></svg></button>
    <button class="b" id="bUN" title="Undo"><svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg></button>
    <button class="b" id="bRE" title="Redo"><svg viewBox="0 0 24 24"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 15c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 15h9V6l-3.6 4.6z"/></svg></button>
  </div>
</div>
<script>
(function(){
var ed=document.getElementById('editor');
var html='';
var timer=null;
var savedRange=null;

function post(t,d){var m=JSON.stringify({type:t,payload:d});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(m);else if(window.parent&&window.parent!==window)window.parent.postMessage(m,'*');}
function getHtml(){return ed.innerHTML||'';}
function emit(){
  html=getHtml();
  post('content_change',{html:html});
  updateToolbar();
}

ed.addEventListener('blur',function(){
  var sel=window.getSelection();
  if(sel&&sel.rangeCount>0){savedRange=sel.getRangeAt(0).cloneRange();}
});

function restoreSelection(){
  ed.focus();
  if(savedRange){
    var sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }
}

function cmd(c,v){
  restoreSelection();
  document.execCommand(c,false,v===undefined?null:v);
  savedRange=null;
  emit();
}

function formatBlock(tag){
  restoreSelection();
  var sel=window.getSelection();
  if(sel&&sel.rangeCount>0){
    var node=sel.getRangeAt(0).startContainer;
    while(node&&node!==ed){
      if(node.nodeName&&node.nodeName.toLowerCase()===tag.toLowerCase()){
        document.execCommand('formatBlock',false,'p');
        emit();return;
      }
      node=node.parentNode;
    }
  }
  document.execCommand('formatBlock',false,'<'+tag+'>');
  savedRange=null;
  emit();
}

function updateToolbar(){
  var btns={bB:'bold',bI:'italic',bU:'underline',bS:'strikeThrough'};
  Object.keys(btns).forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.classList.toggle('on',document.queryCommandState(btns[id]));
  });
  var hState=document.queryCommandValue('formatBlock').toLowerCase();
  ['H1','H2','H3'].forEach(function(h){
    var el=document.getElementById('b'+h);
    if(el)el.classList.toggle('on',hState===h.toLowerCase());
  });
  // align state
  var alMap={bAL:'justifyLeft',bAC:'justifyCenter',bAR:'justifyRight'};
  Object.keys(alMap).forEach(function(id){
    var el=document.getElementById(id);
    if(el)el.classList.toggle('on',document.queryCommandState(alMap[id]));
  });
}

function tb(id,fn){
  var el=document.getElementById(id);
  if(!el)return;
  el.addEventListener('touchstart',function(e){e.preventDefault();},false);
  el.addEventListener('mousedown',function(e){e.preventDefault();},false);
  el.addEventListener('touchend',function(e){e.preventDefault();fn();},false);
  el.addEventListener('click',function(e){e.preventDefault();fn();},false);
}

// ── Link modal ────────────────────────────────────────────────────────────
var linkModal=document.getElementById('linkModal');
var linkText=document.getElementById('linkText');
var linkUrl=document.getElementById('linkUrl');

function openLinkModal(){
  var sel=window.getSelection();
  if(sel&&sel.rangeCount>0){savedRange=sel.getRangeAt(0).cloneRange();}
  // pre-fill text from selection
  var selText=sel?sel.toString():'';
  linkText.value=selText;
  linkUrl.value='https://';
  linkModal.style.display='flex';
  setTimeout(function(){linkUrl.focus();linkUrl.setSelectionRange(8,8);},50);
}

function closeLinkModal(){
  linkModal.style.display='none';
  linkText.value='';
  linkUrl.value='';
}

document.getElementById('linkCancel').addEventListener('click',closeLinkModal);
document.getElementById('linkOk').addEventListener('click',function(){
  var url=linkUrl.value.trim();
  var txt=linkText.value.trim();
  if(!url||url==='https://')return;
  restoreSelection();
  if(txt){
    // Insert as anchor HTML so we control both text and href
    document.execCommand('insertHTML',false,'<a href="'+url+'">'+txt+'</a>');
  } else {
    document.execCommand('createLink',false,url);
  }
  savedRange=null;
  emit();
  closeLinkModal();
});
// Close on backdrop tap
linkModal.addEventListener('click',function(e){if(e.target===linkModal)closeLinkModal();});

// ── Highlight (yellow mark) ───────────────────────────────────────────────
function toggleHighlight(){
  restoreSelection();
  var sel=window.getSelection();
  if(!sel||sel.rangeCount===0)return;
  // Check if selection is already inside a <mark>
  var node=sel.getRangeAt(0).startContainer;
  while(node&&node!==ed){
    if(node.nodeName&&node.nodeName.toUpperCase()==='MARK'){
      // unwrap
      var parent=node.parentNode;
      while(node.firstChild)parent.insertBefore(node.firstChild,node);
      parent.removeChild(node);
      savedRange=null;emit();return;
    }
    node=node.parentNode;
  }
  document.execCommand('insertHTML',false,'<mark>'+sel.toString()+'</mark>');
  savedRange=null;emit();
}

// ── Inline code ───────────────────────────────────────────────────────────
function insertInlineCode(){
  restoreSelection();
  var sel=window.getSelection();
  if(!sel||sel.rangeCount===0)return;
  document.execCommand('insertHTML',false,'<code>'+sel.toString()+'</code>');
  savedRange=null;emit();
}

// ── Bindings ──────────────────────────────────────────────────────────────
tb('bB',function(){cmd('bold');});
tb('bI',function(){cmd('italic');});
tb('bU',function(){cmd('underline');});
tb('bS',function(){cmd('strikeThrough');});
tb('bHL',toggleHighlight);
tb('bCO',insertInlineCode);
tb('bH1',function(){formatBlock('h1');});
tb('bH2',function(){formatBlock('h2');});
tb('bH3',function(){formatBlock('h3');});
tb('bUL',function(){cmd('insertUnorderedList');});
tb('bOL',function(){cmd('insertOrderedList');});
tb('bBQ',function(){formatBlock('blockquote');});
tb('bHR',function(){cmd('insertHorizontalRule');});
tb('bIN',function(){cmd('indent');});
tb('bOUT',function(){cmd('outdent');});
tb('bAL',function(){cmd('justifyLeft');});
tb('bAC',function(){cmd('justifyCenter');});
tb('bAR',function(){cmd('justifyRight');});
tb('bLK',openLinkModal);
tb('bULK',function(){cmd('unlink');});
tb('bCLR',function(){cmd('removeFormat');});
tb('bUN',function(){cmd('undo');});
tb('bRE',function(){cmd('redo');});

ed.addEventListener('input',function(){
  if(timer)clearTimeout(timer);
  timer=setTimeout(emit,150);
});
ed.addEventListener('keyup',updateToolbar);
ed.addEventListener('mouseup',updateToolbar);
ed.addEventListener('touchend',function(){setTimeout(updateToolbar,10);});

window.addEventListener('message',function(e){
  var d;try{d=JSON.parse(e.data);}catch(err){return;}
  if(d.type==='set_content'){
    ed.innerHTML=d.payload.html||'';
    html=d.payload.html||'';
  }
  if(d.type==='insert_image'){
    restoreSelection();
    var img='<img src="'+d.payload.src+'" style="max-width:100%;border-radius:8px;margin:8px 0;display:block"/>';
    document.execCommand('insertHTML',false,img);
    emit();
  }
  if(d.type==='get_content'){
    post('content',{html:getHtml()});
  }
});

post('ready',{});
})();
<\/script>
</body>
</html>`;
