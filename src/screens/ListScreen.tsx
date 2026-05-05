import React, { useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  LayoutAnimation,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import Animated, { useSharedValue } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTaskStore } from "../store/useTaskStore";
import { useLabelStore } from "../store/useLabelStore";
import { useSync } from "../hooks/useSync";
import { useHaptics } from "../hooks/useHaptics";
import { colors, spacing, radius, fontSize } from "../theme";
import { TaskRow } from "../components/task/TaskRow";
import { EmptyState } from "../components/ui/EmptyState";
import { Badge } from "../components/ui/Badge";
import { TaskDetailSheet } from "../components/sheets/TaskDetailSheet";
import { AddTaskSheet } from "../components/sheets/AddTaskSheet";
import { PostponeSheet } from "../components/sheets/PostponeSheet";
import { LabelPickerModal } from "../components/ui/LabelPickerModal";
import { groupTasksBySection } from "../utils/date";
import { computeUrgencyScore } from "../utils/urgency";
import type { Task } from "../types";
import type { ListStackParamList } from "../navigation/types";

export function ListScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<ListStackParamList>>();
  const { tasks, openTask, bulkMarkDone, bulkDelete, bulkSetLabels } = useTaskStore();
  const { labels } = useLabelStore();
  const { progressStyle } = useSync();
  const haptics = useHaptics();

  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [postponeTaskId, setPostponeTaskId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkLabelModal, setShowBulkLabelModal] = useState(false);
  const [showBulkPostpone, setShowBulkPostpone] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const isSelecting = selectedIds.length > 0;
  const searchInputRef = useRef<TextInput>(null);

  function enterSelectMode(id: string) {
    haptics.medium();
    setSelectedIds([id]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function exitSelect() {
    setSelectedIds([]);
  }

  async function handleBulkComplete() {
    await bulkMarkDone(selectedIds);
    exitSelect();
  }

  async function handleBulkDelete() {
    Alert.alert(
      `Delete ${selectedIds.length} task${selectedIds.length > 1 ? "s" : ""}?`,
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await bulkDelete(selectedIds);
            exitSelect();
          },
        },
      ],
    );
  }

  useFocusEffect(
    useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSearchOpen(false);
      setSearch("");
      setSearchFocused(false);
      setSelectedIds([]);
      setFocusMode(false);
      Keyboard.dismiss();
      searchInputRef.current?.blur();
    }, []),
  );

  function openSearch() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchOpen(false);
    setSearch("");
    setSearchFocused(false);
    Keyboard.dismiss();
  }

  const detailSheetRef = useRef<BottomSheetModal>(null);
  const addSheetRef = useRef<BottomSheetModal>(null);

  // Only show non-note tasks
  const nonNoteTasks = useMemo(() => tasks.filter((t) => !t.is_note), [tasks]);

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return nonNoteTasks;
    const q = search.toLowerCase();
    return nonNoteTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.course?.toLowerCase().includes(q) ?? false),
    );
  }, [nonNoteTasks, search]);

  const sections = useMemo(() => {
    const pinned = filteredTasks.filter((t) => t.is_pinned);
    const unpinned = filteredTasks.filter((t) => !t.is_pinned);
    const groups = groupTasksBySection(unpinned);
    const keys = Object.keys(groups) as Array<keyof typeof groups>;
    const dateSections = keys
      .map((k) => ({ title: k, data: groups[k] }))
      .filter((s) => s.data.length > 0);
    return pinned.length > 0
      ? [{ title: "pinned", data: pinned }, ...dateSections]
      : dateSections;
  }, [filteredTasks]);

  const focusTasks = useMemo(() => {
    if (!focusMode) return [];
    return [...nonNoteTasks]
      .filter((t) => t.status !== "done")
      .map((t) => ({ task: t, score: computeUrgencyScore(t) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [focusMode, nonNoteTasks]);

  const { openTaskDetail } = useTaskStore();

  async function handleTaskPress(task: Task) {
    await openTaskDetail(task.id);
    detailSheetRef.current?.present();
  }

  function handlePostpone(id: string) {
    setPostponeTaskId(id);
  }

  const sectionTitles: Record<string, string> = {
    pinned: "Pinned",
    overdue: "Overdue",
    today: "Today",
    tomorrow: "Tomorrow",
    this_week: "This Week",
    later: "Later",
    no_date: "No Date",
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sync progress bar */}
      <Animated.View
        style={[styles.progressBar, progressStyle]}
        pointerEvents="none"
      />

      {/* Header / collapsible search */}
      <View style={styles.header}>
        {isSelecting ? (
          <>
            <Pressable onPress={exitSelect} hitSlop={8}>
              <Feather name="x" size={22} color={colors.text.primary} />
            </Pressable>
            <Text style={styles.heading}>{selectedIds.length} selected</Text>
            <View style={{ flex: 1 }} />
            <Pressable
              hitSlop={8}
              onPress={() => {
                const allIds = filteredTasks.map((t) => t.id);
                const allSelected = allIds.every((id) => selectedIds.includes(id));
                setSelectedIds(allSelected ? [] : allIds);
              }}
            >
              <Text style={styles.cancelText}>
                {filteredTasks.every((t) => selectedIds.includes(t.id))
                  ? "None"
                  : "All"}
              </Text>
            </Pressable>
          </>
        ) : !searchOpen ? (
          <>
            <Text style={styles.heading}>Tasks</Text>
            <Badge
              count={nonNoteTasks.filter((t) => t.status !== "done").length}
            />
            <View style={{ flex: 1 }} />
            <Pressable onPress={openSearch} hitSlop={8}>
              <Feather name="search" size={22} color={colors.text.secondary} />
            </Pressable>
            <Pressable
              onPress={() => setFocusMode((v) => !v)}
              hitSlop={8}
              style={focusMode ? styles.focusBtnOn : undefined}
            >
              <Feather
                name="zap"
                size={22}
                color={focusMode ? colors.accent.default : colors.text.secondary}
              />
            </Pressable>
          </>
        ) : (
          <>
            <View
              style={[
                styles.searchWrap,
                searchFocused && styles.searchWrapFocused,
              ]}
            >
              <Feather
                name="search"
                size={16}
                color={
                  searchFocused ? colors.accent.default : colors.text.tertiary
                }
                style={styles.searchIcon}
              />
              <TextInput
                ref={searchInputRef}
                value={search}
                onChangeText={setSearch}
                placeholder="Search tasks…"
                placeholderTextColor={colors.text.tertiary}
                style={styles.searchInput}
                returnKeyType="search"
                clearButtonMode="while-editing"
                autoFocus={false}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </View>
            <Pressable
              onPress={closeSearch}
              hitSlop={8}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* List */}
      {focusMode ? (
        <FlatList
          data={focusTasks}
          keyExtractor={(item) => item.task.id}
          renderItem={({ item }) => (
            <TaskRow
              task={item.task}
              labels={[]}
              onPress={() => handleTaskPress(item.task)}
              onPostpone={() => handlePostpone(item.task.id)}
              isSelecting={isSelecting}
              selected={selectedIds.includes(item.task.id)}
              onSelect={() => toggleSelect(item.task.id)}
              onEnterSelectMode={() => enterSelectMode(item.task.id)}
              urgencyScore={item.score}
            />
          )}
          ListHeaderComponent={
            <View style={styles.focusHeader}>
              <Feather name="zap" size={14} color={colors.accent.default} />
              <Text style={styles.focusHeaderText}>
                Focus — {focusTasks.length} tasks ranked by urgency
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState illustration="done" title="All done!" subtitle="No pending tasks." />
          }
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + spacing[8] }]}
        />
      ) : filteredTasks.length === 0 ? (
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
            onAction={() => {
              addSheetRef.current?.present();
            }}
          />
        )
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
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
              isSelecting={isSelecting}
              selected={selectedIds.includes(item.id)}
              onSelect={() => toggleSelect(item.id)}
              onEnterSelectMode={() => enterSelectMode(item.id)}
            />
          )}
          stickySectionHeadersEnabled={Platform.OS === "ios"}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + spacing[8] },
          ]}
        />
      )}

      {/* FAB */}
      {!isSelecting && (
        <TouchableOpacity
          style={[styles.fab, { bottom: tabBarHeight + spacing[4] }]}
          onPress={() => addSheetRef.current?.present()}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Bulk action bar */}
      {isSelecting && (
        <View style={[styles.bulkBar, { bottom: tabBarHeight }]}>
          <Pressable style={styles.bulkBtn} onPress={handleBulkComplete}>
            <Feather name="check-circle" size={20} color={colors.success} />
            <Text style={[styles.bulkBtnText, { color: colors.success }]}>Done</Text>
          </Pressable>
          <Pressable style={styles.bulkBtn} onPress={() => setShowBulkLabelModal(true)}>
            <Feather name="tag" size={20} color={colors.text.secondary} />
            <Text style={styles.bulkBtnText}>Label</Text>
          </Pressable>
          <Pressable style={styles.bulkBtn} onPress={() => setShowBulkPostpone(true)}>
            <Feather name="clock" size={20} color={colors.text.secondary} />
            <Text style={styles.bulkBtnText}>Postpone</Text>
          </Pressable>
          <Pressable style={styles.bulkBtn} onPress={handleBulkDelete}>
            <Feather name="trash-2" size={20} color={colors.danger} />
            <Text style={[styles.bulkBtnText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
        </View>
      )}

      {/* Sheets */}
      <TaskDetailSheet
        sheetRef={detailSheetRef}
        onOpenNoteEditor={() => {
          detailSheetRef.current?.dismiss();
          if (openTask)
            navigation.navigate("NoteEditor", { taskId: openTask.id });
        }}
      />
      <AddTaskSheet sheetRef={addSheetRef} />
      <PostponeSheet
        visible={postponeTaskId !== null}
        taskId={postponeTaskId}
        onClose={() => setPostponeTaskId(null)}
      />
      <PostponeSheet
        visible={showBulkPostpone}
        taskId={null}
        taskIds={selectedIds}
        onClose={() => {
          setShowBulkPostpone(false);
          exitSelect();
        }}
      />
      <LabelPickerModal
        visible={showBulkLabelModal}
        selectedIds={[]}
        onClose={() => setShowBulkLabelModal(false)}
        onApply={async (ids) => {
          await bulkSetLabels(selectedIds, ids);
          setShowBulkLabelModal(false);
          exitSelect();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  progressBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent.default,
    zIndex: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchWrapFocused: {
    borderColor: colors.accent.default,
    backgroundColor: colors.accent.muted,
  },
  cancelBtn: {
    paddingLeft: spacing[3],
  },
  cancelText: {
    color: colors.accent.default,
    fontSize: fontSize.base,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[2],
    backgroundColor: colors.bg.base,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
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
    position: "absolute",
    right: spacing[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.default,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent.glow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
    elevation: 12,
  },
  bulkBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: colors.bg.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingVertical: spacing[2],
  },
  bulkBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing[2],
  },
  bulkBtnText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  focusBtnOn: {
    backgroundColor: colors.accent.soft,
    borderRadius: radius.sm,
    padding: 3,
  },
  focusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  focusHeaderText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: "600",
  },
});
