import React, { useRef, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  Pressable,
  TouchableOpacity,
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
import { TaskCard } from "../components/task/TaskCard";
import { EmptyState } from "../components/ui/EmptyState";
import { AddTaskSheet } from "../components/sheets/AddTaskSheet";
import { TaskDetailSheet } from "../components/sheets/TaskDetailSheet";
import type { CalendarStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CalendarStackParamList, "DayDetail">;

export function DayDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { date } = route.params;
  const { tasks, openTaskDetail, openTask } = useTaskStore();
  const { labels, taskLabelMap } = useLabelStore();
  const detailSheetRef = useRef<BottomSheetModal>(null);
  const addSheetRef = useRef<BottomSheetModal>(null);

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
              <TaskCard
                task={item}
                labels={taskLabels}
                onPress={() => handleTaskPress(item.id)}
              />
            );
          }}
          renderSectionHeader={() => null}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + spacing[4] }]}
        onPress={() => addSheetRef.current?.present()}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <TaskDetailSheet
        sheetRef={detailSheetRef}
        onOpenNoteEditor={() => {
          detailSheetRef.current?.dismiss();
          if (openTask)
            navigation.navigate("NoteEditor", { taskId: openTask.id });
        }}
      />
      <AddTaskSheet sheetRef={addSheetRef} initialDate={date} />
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
    paddingHorizontal: spacing[4],
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
});
