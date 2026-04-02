import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { Feather } from '@expo/vector-icons';
import { useTaskStore } from '../../store/useTaskStore';
import { colors, spacing, radius, fontSize } from '../../theme';
import { Button } from '../ui/Button';
import { SheetHandle } from '../ui/SheetHandle';

interface AddNoteSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  /** Called after the note is created so the caller can navigate to NoteEditor */
  onNoteCreated?: (taskId: string) => void;
}

export function AddNoteSheet({ sheetRef, onNoteCreated }: AddNoteSheetProps) {
  const { addTask } = useTaskStore();
  const snapPoints = useMemo(() => ['55%', '85%'], []);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) reset();
  }, []);

  function reset() {
    setTitle('');
    setContent('');
    setLoading(false);
  }

  async function handleCreate() {
    const t = title.trim() || (content.trim().split('\n')[0].slice(0, 60) || 'Untitled note');
    setLoading(true);
    try {
      const task = await addTask({
        title: t,
        course: null,
        due_date: null,
        due_time: null,
        source: 'manual',
        status: 'pending',
        is_pinned: false,
        is_note: true,
        note_content: content.trim() || null,
        moodle_url: null,
        moodle_event_id: null,
        postponed_until: null,
      });
      reset();
      sheetRef.current?.close();
      onNoteCreated?.(task.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleComponent={SheetHandle}
      onChange={handleSheetChange}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Feather name="file-text" size={18} color={colors.accent.default} />
          <Text style={styles.heading}>New Note</Text>
        </View>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title (optional)"
          placeholderTextColor={colors.text.tertiary}
          style={styles.titleInput}
          returnKeyType="next"
          maxLength={120}
        />

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Start writing…"
          placeholderTextColor={colors.text.tertiary}
          style={styles.contentInput}
          multiline
          textAlignVertical="top"
          autoFocus={false}
        />

        <Button
          label="Create Note"
          onPress={handleCreate}
          loading={loading}
          disabled={!title.trim() && !content.trim()}
          style={styles.createBtn}
        />
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: 40,
    gap: spacing[4],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[2],
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  titleInput: {
    fontSize: fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  contentInput: {
    fontSize: fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 140,
  },
  createBtn: {
    marginTop: spacing[2],
  },
});
