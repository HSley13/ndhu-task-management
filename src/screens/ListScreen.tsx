import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, SectionList, StyleSheet, Pressable, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTaskStore } from '../store/useTaskStore';
import { useLabelStore } from '../store/useLabelStore';
import { useSync } from '../hooks/useSync';
import { colors, spacing, radius, fontSize } from '../theme';
import { TaskRow } from '../components/task/TaskRow';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { TaskDetailSheet } from '../components/sheets/TaskDetailSheet';
import { AddTaskSheet } from '../components/sheets/AddTaskSheet';
import { groupTasksBySection } from '../utils/date';
import type { Task } from '../types';
import type { ListStackParamList } from '../navigation/types';

export function ListScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<NativeStackNavigationProp<ListStackParamList>>();
  const { tasks, openTask } = useTaskStore();
  const { labels } = useLabelStore();
  const { progressStyle } = useSync();

  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const detailSheetRef = useRef<BottomSheet>(null);
  const addSheetRef    = useRef<BottomSheet>(null);

  // Only show non-note tasks
  const nonNoteTasks = useMemo(() => tasks.filter((t) => !t.is_note), [tasks]);

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return nonNoteTasks;
    const q = search.toLowerCase();
    return nonNoteTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.course?.toLowerCase().includes(q) ?? false)
    );
  }, [nonNoteTasks, search]);

  const sections = useMemo(() => {
    const groups = groupTasksBySection(filteredTasks);
    const keys = Object.keys(groups) as Array<keyof typeof groups>;
    return keys.map((k) => ({ title: k, data: groups[k] })).filter((s) => s.data.length > 0);
  }, [filteredTasks]);

  const { openTaskDetail } = useTaskStore();

  function handleTaskPress(task: Task) {
    openTaskDetail(task.id);
    detailSheetRef.current?.expand();
  }

  function handlePostpone(_id: string) {
    // Postpone feature removed — noop
  }

  const sectionTitles: Record<string, string> = {
    overdue:    'Overdue',
    today:      'Today',
    tomorrow:   'Tomorrow',
    this_week:  'This Week',
    later:      'Later',
    no_date:    'No Date',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sync progress bar */}
      <Animated.View style={[styles.progressBar, progressStyle]} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.heading}>Tasks</Text>
        <Badge count={nonNoteTasks.filter((t) => t.status !== 'done').length} />
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, searchFocused && styles.searchWrapFocused]}>
        <Feather name="search" size={16} color={searchFocused ? colors.accent.default : colors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search tasks…"
          placeholderTextColor={colors.text.tertiary}
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </View>

      {/* List */}
      {filteredTasks.length === 0 ? (
        search ? (
          <EmptyState
            illustration="search"
            title="No results"
            subtitle={`No tasks matching "${search}"`}
          />
        ) : (
          <EmptyState
            illustration="done"
            title="All done!"
            subtitle="No pending tasks. Enjoy!"
            actionLabel="Add a task"
            onAction={() => { addSheetRef.current?.expand(); }}
          />
        )
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {sectionTitles[section.title as string] ?? section.title}
              </Text>
              <Text style={styles.sectionCount}>{section.data.length}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TaskRow
              task={item}
              labels={[]}
              onPress={() => handleTaskPress(item)}
              onPostpone={() => handlePostpone(item.id)}
            />
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      <Pressable
        style={[styles.fab, { bottom: tabBarHeight + spacing[4] }]}
        onPress={() => addSheetRef.current?.expand()}
      >
        <Feather name="plus" size={28} color="#fff" />
      </Pressable>

      {/* Sheets */}
      <TaskDetailSheet
        sheetRef={detailSheetRef}
        onOpenNoteEditor={() => { if (openTask) navigation.navigate('NoteEditor', { taskId: openTask.id }); }}
      />
      <AddTaskSheet sheetRef={addSheetRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent.default,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchWrapFocused: {
    borderColor: colors.accent.default,
    backgroundColor: colors.accent.muted,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.base,
    lineHeight: 20,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[2],
    backgroundColor: colors.bg.base,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    backgroundColor: colors.bg.elevated,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  listContent: {
    paddingBottom: 120,
  },
  fab: {
    position: 'absolute',
    right: spacing[5],
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent.default,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent.glow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
});
