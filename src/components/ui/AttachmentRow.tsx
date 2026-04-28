import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Image, StyleSheet, Modal,
  Dimensions, ActivityIndicator, Platform, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { colors, spacing, radius, fontSize } from '../../theme';
import type { Attachment } from '../../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Helpers ───────────────────────────────────────────────────────────────────
async function resolveViewerSource(uri: string): Promise<{ uri?: string }> {
  if (Platform.OS !== 'android') return { uri };
  const encoded = encodeURIComponent(uri);
  return { uri: `https://docs.google.com/gview?embedded=true&url=${encoded}` };
}

async function openLocalFileOnAndroid(uri: string, mimeType: string): Promise<void> {
  // Convert file:// and bare paths to a content:// URI via FileProvider.
  // content:// URIs from DocumentPicker can be used directly.
  let contentUri: string;
  if (uri.startsWith('content://')) {
    contentUri = uri;
  } else {
    const fileUri = uri.startsWith('/') ? `file://${uri}` : uri;
    contentUri = await FileSystem.getContentUriAsync(fileUri);
  }

  // Use IntentLauncher instead of Linking.openURL — it lets us pass:
  //   • the MIME type (so Android picks the right handler app)
  //   • FLAG_GRANT_READ_URI_PERMISSION (0x1) — without this, the receiving
  //     app cannot read a content:// URI and shows "file can't be opened".
  await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
    data: contentUri,
    type: mimeType || '*/*',
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
  });
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

type IconName = React.ComponentProps<typeof Feather>['name'];
function fileIconAndColor(mime: string): { icon: IconName; color: string; bg: string } {
  if (mime === 'application/pdf')
    return { icon: 'file-text', color: '#FF6B6B', bg: '#FF6B6B22' };
  if (mime.includes('word') || mime.includes('document'))
    return { icon: 'file-text', color: '#4ECDC4', bg: '#4ECDC422' };
  if (mime.includes('sheet') || mime.includes('excel'))
    return { icon: 'grid', color: '#45B7D1', bg: '#45B7D122' };
  if (mime.includes('presentation') || mime.includes('powerpoint'))
    return { icon: 'airplay', color: '#F7B731', bg: '#F7B73122' };
  if (mime.includes('zip') || mime.includes('compressed') || mime.includes('rar'))
    return { icon: 'archive', color: '#A29BFE', bg: '#A29BFE22' };
  if (mime.startsWith('video/'))
    return { icon: 'video', color: '#FD79A8', bg: '#FD79A822' };
  return { icon: 'file', color: colors.text.secondary, bg: colors.bg.elevated };
}

// ── Full-screen image preview ─────────────────────────────────────────────────
function ImageModal({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={imgStyles.backdrop}>
        <Pressable style={imgStyles.closeBtn} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={22} color="#fff" />
        </Pressable>
        <Image source={{ uri }} style={imgStyles.fullImage} resizeMode="contain" />
      </SafeAreaView>
    </Modal>
  );
}

const imgStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  closeBtn: {
    position: 'absolute', top: 56, right: 20, zIndex: 10,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  fullImage: { width: SCREEN_W, height: SCREEN_H * 0.82 },
});

// ── In-app file viewer modal ──────────────────────────────────────────────────
function FileViewerModal({ uri, name, visible, onClose }: { uri: string; name: string; visible: boolean; onClose: () => void }) {
  const [source, setSource] = useState<{ uri?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setLoading(true); setLoadError(false); setSource(null);
    resolveViewerSource(uri).then(setSource);
  }, [uri, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A10' }}>
        <View style={fvStyles.header}>
          <View style={fvStyles.headerLeft}>
            <Feather name="file-text" size={16} color={colors.accent.default} />
            <Text style={fvStyles.title} numberOfLines={1}>{name}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={fvStyles.closeBtn}>
            <Feather name="x" size={18} color="#fff" />
          </Pressable>
        </View>
        {(loading || !source) && !loadError && (
          <View style={fvStyles.center}>
            <ActivityIndicator size="large" color={colors.accent.default} />
            <Text style={fvStyles.hint}>Loading file…</Text>
          </View>
        )}
        {loadError && (
          <View style={fvStyles.center}>
            <Feather name="alert-circle" size={36} color={colors.text.tertiary} />
            <Text style={fvStyles.hint}>Unable to preview this file.</Text>
          </View>
        )}
        {source && !loadError && (
          <WebView
            source={source as any}
            style={[{ flex: 1 }, loading && { opacity: 0 }]}
            originWhitelist={['*']}
            allowFileAccess
            allowFileAccessFromFileURLs
            allowUniversalAccessFromFileURLs
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setLoadError(true); }}
            onHttpError={() => { setLoading(false); setLoadError(true); }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const fvStyles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    backgroundColor: '#111118', borderBottomWidth: 1, borderBottomColor: colors.border.subtle,
    gap: spacing[3],
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title: { flex: 1, color: '#fff', fontSize: fontSize.sm, fontWeight: '600' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject, backgroundColor: '#0A0A10',
    alignItems: 'center', justifyContent: 'center', gap: spacing[3], zIndex: 10,
  },
  hint: { color: colors.text.tertiary, fontSize: fontSize.sm },
});

interface Props {
  attachment: Attachment;
  onDelete?: () => void;
}

// ── Image card ────────────────────────────────────────────────────────────────
function ImageCard({ attachment, onDelete }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <>
      <ImageModal uri={attachment.uri} visible={modalVisible} onClose={() => setModalVisible(false)} />
      <Pressable style={styles.imageCard} onPress={() => setModalVisible(true)}>
        <Image source={{ uri: attachment.uri }} style={styles.imageCardThumb} resizeMode="cover" />
        <View style={styles.imageCardOverlay}>
          <Text style={styles.imageCardName} numberOfLines={2}>{attachment.name}</Text>
          {attachment.size_bytes > 0 && (
            <Text style={styles.imageCardSize}>{formatBytes(attachment.size_bytes)}</Text>
          )}
        </View>
        {onDelete && (
          <Pressable
            style={styles.imageCardDelete}
            onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
            hitSlop={8}
          >
            <Feather name="x" size={13} color="#fff" />
          </Pressable>
        )}
        <View style={styles.imageCardZoom}>
          <Feather name="maximize-2" size={12} color="rgba(255,255,255,0.8)" />
        </View>
      </Pressable>
    </>
  );
}

// ── File card ─────────────────────────────────────────────────────────────────
function FileCard({ attachment, onDelete }: Props) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  // content:// URIs are local Android files too — don't send them to Google Docs viewer.
  const isLocal =
    attachment.uri.startsWith('file://') ||
    attachment.uri.startsWith('/') ||
    attachment.uri.startsWith('content://');
  const { icon, color, bg } = fileIconAndColor(attachment.mime_type);

  async function handleOpen() {
    if (Platform.OS === 'web') {
      await Linking.openURL(attachment.uri);
      return;
    }
    if (Platform.OS === 'android' && isLocal) {
      if (opening) return;
      setOpening(true);
      try { await openLocalFileOnAndroid(attachment.uri, attachment.mime_type); }
      catch { Alert.alert('Error', 'Could not open the file.'); }
      finally { setOpening(false); }
    } else {
      setViewerVisible(true);
    }
  }

  return (
    <>
      <FileViewerModal uri={attachment.uri} name={attachment.name} visible={viewerVisible} onClose={() => setViewerVisible(false)} />
      <Pressable style={[styles.fileCard, opening && { opacity: 0.6 }]} onPress={handleOpen}>
        <View style={[styles.fileIconBox, { backgroundColor: bg }]}>
          <Feather name={icon} size={22} color={color} />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={2}>{attachment.name}</Text>
          <View style={styles.fileMeta}>
            {attachment.size_bytes > 0 && (
              <View style={styles.sizeBadge}>
                <Text style={styles.sizeBadgeText}>{formatBytes(attachment.size_bytes)}</Text>
              </View>
            )}
            <Text style={styles.fileHint}>{opening ? 'Opening…' : 'Tap to open'}</Text>
          </View>
        </View>
        <View style={styles.fileAction}>
          <Feather name="external-link" size={14} color={colors.text.tertiary} />
        </View>
        {onDelete && (
          <Pressable
            style={styles.fileDelete}
            onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
            hitSlop={8}
          >
            <Feather name="trash-2" size={14} color={colors.danger} />
          </Pressable>
        )}
      </Pressable>
    </>
  );
}

// ── Audio card ────────────────────────────────────────────────────────────────
function AudioCard({ uri, name, onDelete }: { uri: string; name: string; onDelete?: () => void }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    Audio.Sound.createAsync({ uri }, { shouldPlay: false }, (status) => {
      if (!mounted || !status.isLoaded) return;
      setDurationMs(status.durationMillis ?? null);
      setPositionMs(status.positionMillis ?? 0);
      setIsPlaying(status.isPlaying);
      if (status.didJustFinish) {
        setIsPlaying(false);
        soundRef.current?.setPositionAsync(0);
        setPositionMs(0);
      }
    }).then(({ sound }) => {
      if (!mounted) { sound.unloadAsync(); return; }
      soundRef.current = sound;
    }).catch(() => { if (mounted) setLoadError(true); });
    return () => { mounted = false; soundRef.current?.unloadAsync(); soundRef.current = null; };
  }, [uri]);

  async function togglePlay() {
    const s = soundRef.current;
    if (!s) return;
    if (isPlaying) { await s.pauseAsync(); }
    else { await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false }); await s.playAsync(); }
  }

  const progress = durationMs && durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={styles.audioCard}>
      <View style={[styles.audioIconBox, loadError && { backgroundColor: colors.bg.elevated }]}>
        <Feather name="headphones" size={20} color={loadError ? colors.text.tertiary : colors.accent.default} />
      </View>
      <View style={styles.audioBody}>
        <Text style={styles.fileName} numberOfLines={1}>{name}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
        <View style={styles.audioTimeRow}>
          <Text style={styles.audioTime}>
            {loadError ? 'Unable to load' : `${formatMs(positionMs)}${durationMs ? ` / ${formatMs(durationMs)}` : ''}`}
          </Text>
        </View>
      </View>
      <Pressable
        style={[styles.playBtn, loadError && { opacity: 0.4 }]}
        onPress={togglePlay}
        disabled={loadError}
        hitSlop={6}
      >
        <Feather name={isPlaying ? 'pause' : 'play'} size={18} color={colors.accent.default} />
      </Pressable>
      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={8} style={styles.fileDelete}>
          <Feather name="trash-2" size={14} color={colors.danger} />
        </Pressable>
      )}
    </View>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function AttachmentRow({ attachment, onDelete }: Props) {
  if (attachment.mime_type.startsWith('audio/'))
    return <AudioCard uri={attachment.uri} name={attachment.name} onDelete={onDelete} />;
  if (attachment.mime_type.startsWith('image/'))
    return <ImageCard attachment={attachment} onDelete={onDelete} />;
  return <FileCard attachment={attachment} onDelete={onDelete} />;
}

const CARD_RADIUS = radius.lg ?? 12;

const styles = StyleSheet.create({
  // ── Image card ───────────────────────────────────────────────────────────────
  imageCard: {
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    height: 140,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  imageCardThumb: { ...StyleSheet.absoluteFillObject },
  imageCardOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 2,
  },
  imageCardName: { fontSize: fontSize.xs, fontWeight: '600', color: '#fff', lineHeight: fontSize.xs * 1.3 },
  imageCardSize: { fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  imageCardDelete: {
    position: 'absolute', top: 8, right: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  imageCardZoom: {
    position: 'absolute', top: 8, left: 8,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },

  // ── File card ────────────────────────────────────────────────────────────────
  fileCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.bg.elevated, borderRadius: CARD_RADIUS,
    padding: spacing[3], borderWidth: 1, borderColor: colors.border.subtle,
  },
  fileIconBox: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  fileInfo: { flex: 1, gap: spacing[1] },
  fileName: { fontSize: fontSize.sm, color: colors.text.primary, fontWeight: '600', lineHeight: fontSize.sm * 1.35 },
  fileMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  sizeBadge: {
    backgroundColor: colors.bg.surface, borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  sizeBadgeText: { fontSize: 10, color: colors.text.tertiary, fontWeight: '500' },
  fileHint: { fontSize: fontSize.xs, color: colors.text.tertiary },
  fileAction: { paddingHorizontal: spacing[1], flexShrink: 0 },
  fileDelete: { padding: spacing[2], flexShrink: 0 },

  // ── Audio card ───────────────────────────────────────────────────────────────
  audioCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    backgroundColor: colors.bg.elevated, borderRadius: CARD_RADIUS,
    padding: spacing[3], borderWidth: 1, borderColor: colors.border.subtle,
  },
  audioIconBox: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.accent.muted, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  audioBody: { flex: 1, gap: spacing[1] },
  progressTrack: { height: 3, backgroundColor: colors.border.default, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: colors.accent.default, borderRadius: 2 },
  audioTimeRow: { flexDirection: 'row', alignItems: 'center' },
  audioTime: { fontSize: fontSize.xs, color: colors.text.tertiary },
  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent.muted, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});

