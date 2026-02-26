import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Pressable, Image, StyleSheet,
  Modal, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { WebView } from 'react-native-webview';
import { colors, spacing, radius, fontSize } from '../../theme';
import type { Attachment } from '../../types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── In-app file viewer modal (WebView, direct file:// for local files) ───────
function FileViewerModal({ uri, name, visible, onClose }: { uri: string; name: string; visible: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Reset state when the modal opens with a new file
  useEffect(() => {
    if (visible) { setLoading(true); setLoadError(false); }
  }, [uri, visible]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={fileViewStyles.header}>
          <Text style={fileViewStyles.title} numberOfLines={1}>{name}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={fileViewStyles.closeBtn}>
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
        </View>
        {loading && !loadError && (
          <View style={fileViewStyles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.accent.default} />
          </View>
        )}
        {loadError && (
          <View style={fileViewStyles.errorBox}>
            <Feather name="alert-circle" size={32} color={colors.text.tertiary} />
            <Text style={fileViewStyles.errorText}>Unable to open this file.</Text>
          </View>
        )}
        {!loadError && (
          <WebView
            source={{ uri }}
            style={{ flex: 1 }}
            originWhitelist={['*', 'file://*']}
            allowFileAccess
            allowUniversalAccessFromFileURLs
            allowFileAccessFromFileURLs
            onLoadEnd={() => setLoading(false)}
            onError={() => { setLoading(false); setLoadError(true); }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const fileViewStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: spacing[3],
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    backgroundColor: '#000',
  },
  errorText: {
    color: colors.text.tertiary,
    fontSize: fontSize.sm,
  },
});

// ── Full-screen image preview modal ─────────────────────────────────────────
function ImageModal({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView style={imgStyles.backdrop}>
        <Pressable style={imgStyles.closeBtn} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={24} color="#fff" />
        </Pressable>
        <Image source={{ uri }} style={imgStyles.fullImage} resizeMode="contain" />
      </SafeAreaView>
    </Modal>
  );
}

const imgStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: SCREEN_W,
    height: SCREEN_H * 0.8,
  },
});

interface Props {
  attachment: Attachment;
  onDelete?: () => void;
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

function fileIcon(mime: string): React.ComponentProps<typeof Feather>['name'] {
  if (mime.startsWith('audio/')) return 'headphones';
  if (mime.startsWith('video/')) return 'video';
  if (mime === 'application/pdf') return 'file-text';
  if (mime.includes('word') || mime.includes('document')) return 'file-text';
  if (mime.includes('sheet') || mime.includes('excel')) return 'grid';
  if (mime.includes('zip') || mime.includes('compressed')) return 'archive';
  return 'file';
}

// ── Audio player sub-component ──────────────────────────────────────────────
function AudioPlayer({ uri, name, onDelete }: { uri: string; name: string; onDelete?: () => void }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false },
      (status) => {
        if (!mounted || !status.isLoaded) return;
        setDurationMs(status.durationMillis ?? null);
        setPositionMs(status.positionMillis ?? 0);
        setIsPlaying(status.isPlaying);
        if (status.didJustFinish) {
          setIsPlaying(false);
          soundRef.current?.setPositionAsync(0);
          setPositionMs(0);
        }
      },
    ).then(({ sound }) => {
      if (!mounted) { sound.unloadAsync(); return; }
      soundRef.current = sound;
    }).catch(() => {
      if (mounted) setLoadError(true);
    });

    return () => {
      mounted = false;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, [uri]);

  async function togglePlay() {
    const s = soundRef.current;
    if (!s) return;
    if (isPlaying) {
      await s.pauseAsync();
    } else {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      await s.playAsync();
    }
  }

  const progress = durationMs && durationMs > 0 ? positionMs / durationMs : 0;

  return (
    <View style={styles.audioRow}>
      <Pressable
        style={[styles.playBtn, loadError && styles.playBtnDisabled]}
        onPress={togglePlay}
        disabled={loadError}
        hitSlop={6}
      >
        <Feather
          name={isPlaying ? 'pause' : 'play'}
          size={17}
          color={loadError ? colors.text.tertiary : colors.accent.default}
        />
      </Pressable>

      <View style={styles.audioInfo}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <View style={styles.progressTrack}>
          {/* percentage width is a valid DimensionValue in RN */}
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
        <Text style={styles.meta}>
          {loadError
            ? 'Unable to load'
            : `${formatMs(positionMs)}${durationMs ? ` / ${formatMs(durationMs)}` : ''}`}
        </Text>
      </View>

      {onDelete && (
        <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
          <Feather name="x" size={15} color={colors.text.tertiary} />
        </Pressable>
      )}
    </View>
  );
}

// ── Image row (thumbnail + tap to fullscreen) ────────────────────────────────
function ImageRow({ attachment, onDelete }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  return (
    <>
      <ImageModal uri={attachment.uri} visible={modalVisible} onClose={() => setModalVisible(false)} />
      <Pressable style={styles.row} onPress={() => setModalVisible(true)}>
        <Image source={{ uri: attachment.uri }} style={styles.thumbnail} resizeMode="cover" />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{attachment.name}</Text>
          <Text style={styles.meta}>
            {attachment.size_bytes > 0 ? formatBytes(attachment.size_bytes) + ' · ' : ''}Tap to view
          </Text>
        </View>
        <Feather name="maximize-2" size={14} color={colors.text.tertiary} style={{ marginRight: 2 }} />
        {onDelete && (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <Feather name="x" size={15} color={colors.text.tertiary} />
          </Pressable>
        )}
      </Pressable>
    </>
  );
}

// ── File row (icon + tap to open in-app viewer) ──────────────────────────────
function FileRow({ attachment, onDelete }: Props) {
  const [viewerVisible, setViewerVisible] = useState(false);
  return (
    <>
      <FileViewerModal
        uri={attachment.uri}
        name={attachment.name}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
      />
      <Pressable style={styles.row} onPress={() => setViewerVisible(true)}>
        <View style={styles.fileIconWrap}>
          <Feather name={fileIcon(attachment.mime_type)} size={18} color={colors.accent.default} />
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{attachment.name}</Text>
          <Text style={styles.meta}>
            {attachment.size_bytes > 0 ? formatBytes(attachment.size_bytes) + ' · ' : ''}Tap to open
          </Text>
        </View>
        <Feather name="maximize-2" size={14} color={colors.text.tertiary} style={{ marginRight: 2 }} />
        {onDelete && (
          <Pressable
            onPress={(e) => { e.stopPropagation?.(); onDelete(); }}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <Feather name="x" size={15} color={colors.text.tertiary} />
          </Pressable>
        )}
      </Pressable>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function AttachmentRow({ attachment, onDelete }: Props) {
  if (attachment.mime_type.startsWith('audio/'))
    return <AudioPlayer uri={attachment.uri} name={attachment.name} onDelete={onDelete} />;
  if (attachment.mime_type.startsWith('image/'))
    return <ImageRow attachment={attachment} onDelete={onDelete} />;
  return <FileRow attachment={attachment} onDelete={onDelete} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playBtnDisabled: {
    backgroundColor: colors.bg.surface,
  },
  audioInfo: {
    flex: 1,
    gap: spacing[1],
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.accent.default,
    borderRadius: 2,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.surface,
    flexShrink: 0,
  },
  fileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.accent.muted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: '500',
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  deleteBtn: {
    padding: spacing[1],
    flexShrink: 0,
  },
});
