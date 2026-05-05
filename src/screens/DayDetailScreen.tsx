import React, { useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  Alert,
} from "react-native";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { format, parseISO } from "date-fns";
import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTaskStore } from "../store/useTaskStore";
import { useLabelStore } from "../store/useLabelStore";
import { colors, spacing, radius, fontSize } from "../theme";
import { TaskRow } from "../components/task/TaskRow";
import { EmptyState } from "../components/ui/EmptyState";
import { AddTaskSheet } from "../components/sheets/AddTaskSheet";
import { TaskDetailSheet } from "../components/sheets/TaskDetailSheet";
import { PostponeSheet } from "../components/sheets/PostponeSheet";
import type { CalendarStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CalendarStackParamList, "DayDetail">;

export function DayDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { date } = route.params;
  const { tasks, openTaskDetail, openTask, bulkMarkDone, bulkDelete } = useTaskStore();
  const { labels, taskLabelMap } = useLabelStore();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const addSheetRef = useRef<BottomSheetModal>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [postponeTaskId, setPostponeTaskId] = useState<string | null>(null);
  const [showBulkPostpone, setShowBulkPostpone] = useState(false);
  const isSelecting = selectedIds.length > 0;

  function enterSelectMode(id: string) {
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

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.due_date === date),
    [tasks, date],
  );

  const parsed = parseISO(date);
  const displayDate = format(parsed, "EEEE, MMMM d");

  async function handleTaskPress(id: string) {
    await openTaskDetail(id);
    detailSheetRef.current?.present();
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <GHTouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Feather
            name="chevron-left"
            size={26}
            color={colors.text.secondary}
          />
        </GHTouchableOpacity>
        <Text style={styles.date}>{displayDate}</Text>
        <View style={{ width: 26 }} />
      </View>

      {dayTasks.length === 0 ? (
        <EmptyState
          illustration="calendar"
          title="No tasks this day"
          subtitle="Enjoy your free time or add a task."
        />
      ) : (
        <SectionList
          sections={[{ title: "Tasks", data: dayTasks }]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const taskLabels = labels.filter((l) =>
              (taskLabelMap[item.id] ?? []).includes(l.id),
            );
            return (
              <TaskRow
                task={item}
                labels={taskLabels}
                onPress={() => handleTaskPress(item.id)}
                onPostpone={() => setPostponeTaskId(item.id)}
                isSelecting={isSelecting}
                selected={selectedIds.includes(item.id)}
                onSelect={() => toggleSelect(item.id)}
                onEnterSelectMode={() => enterSelectMode(item.id)}
              />
            );
          }}
          renderSectionHeader={() => null}
          contentContainerStyle={styles.list}
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
          <Pressable style={styles.bulkBtn} onPress={() => setShowBulkPostpone(true)}>
            <Feather name="clock" size={20} color={colors.text.secondary} />
            <Text style={styles.bulkBtnText}>Postpone</Text>
          </Pressable>
          <Pressable style={styles.bulkBtn} onPress={handleBulkDelete}>
            <Feather name="trash-2" size={20} color={colors.danger} />
            <Text style={[styles.bulkBtnText, { color: colors.danger }]}>Delete</Text>
          </Pressable>
          <Pressable style={styles.bulkBtn} onPress={exitSelect}>
            <Feather name="x" size={20} color={colors.text.tertiary} />
            <Text style={styles.bulkBtnText}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <TaskDetailSheet
        sheetRef={detailSheetRef}
        onOpenNoteEditor={() => {
          detailSheetRef.current?.dismiss();
          if (openTask)
            navigation.navigate("NoteEditor", { taskId: openTask.id });
        }}
      />
      <AddTaskSheet sheetRef={addSheetRef} initialDate={date} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  date: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
  },
  list: {
    paddingBottom: 40,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 12,
    zIndex: 100,
  },
  bulkBar: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.bg.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: spacing[2],
  },
  bulkBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[2],
    gap: 4,
  },
  bulkBtnText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    fontWeight: "600",
  },
});
