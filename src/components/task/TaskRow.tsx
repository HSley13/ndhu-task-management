import React from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize } from "../../theme";
import { Checkbox } from "../ui/Checkbox";
import { useTaskStore } from "../../store/useTaskStore";
import { useHaptics } from "../../hooks/useHaptics";
import { formatRelativeDue, isOverdue } from "../../utils/date";
import type { Task, Label } from "../../types";

interface TaskRowProps {
  task: Task;
  labels: Label[];
  onPress: () => void;
  onPostpone: () => void;
  isSelecting?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onEnterSelectMode?: () => void;
}

export function TaskRow({
  task,
  labels,
  onPress,
  onPostpone,
  isSelecting = false,
  selected = false,
  onSelect,
  onEnterSelectMode,
}: TaskRowProps) {
  const { toggleDone, togglePin, deleteTask } = useTaskStore();
  const haptics = useHaptics();
  const overdue = isOverdue(task);
  const isDone = task.status === "done";

  const borderColor = overdue
    ? colors.danger
    : labels[0]?.color ?? colors.accent.default;

  function handleLongPress() {
    haptics.medium();
    if (onEnterSelectMode) {
      onEnterSelectMode();
      return;
    }
    Alert.alert(task.title, undefined, [
      {
        text: task.is_pinned ? "Unpin" : "Pin",
        onPress: () => togglePin(task.id),
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteTask(task.id),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handlePress() {
    if (isSelecting) {
      onSelect?.();
    } else {
      onPress();
    }
  }

  return (
    <TouchableOpacity
      style={[
        styles.row,
        { borderLeftColor: borderColor },
        isSelecting && selected && styles.rowSelected,
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {isSelecting ? (
        <View
          style={[
            styles.selectCircle,
            selected && styles.selectCircleChecked,
          ]}
        >
          {selected && <Feather name="check" size={13} color="#fff" />}
        </View>
      ) : (
        <Checkbox checked={isDone} onChange={() => toggleDone(task.id)} />
      )}
      <View style={styles.content}>
        <Text
          style={[styles.title, isDone && styles.titleDone]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {task.course && (
          <View style={styles.courseRow}>
            <Feather name="book-open" size={11} color={colors.text.tertiary} />
            <Text style={styles.course} numberOfLines={1}>
              {task.course}
            </Text>
          </View>
        )}
        {labels.length > 0 && (
          <View style={styles.labelsRow}>
            {labels.slice(0, 3).map((l) => (
              <View key={l.id} style={styles.labelChip}>
                <View
                  style={[styles.labelChipDot, { backgroundColor: l.color }]}
                />
                <Text
                  style={[styles.labelChipText, { color: l.color }]}
                  numberOfLines={1}
                >
                  {l.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.right}>
        {task.due_date && (
          <Text
            style={[styles.dueText, overdue && styles.dueTextOverdue]}
            numberOfLines={1}
          >
            {formatRelativeDue(task.due_date, task.due_time)}
          </Text>
        )}
        {task.moodle_url && (
          <Feather name="link" size={12} color={colors.text.tertiary} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[3],
    borderLeftWidth: 3,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: fontSize.base,
    color: colors.text.primary,
    fontWeight: "500",
  },
  titleDone: {
    textDecorationLine: "line-through",
    opacity: 0.45,
  },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  course: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 70,
  },
  dueText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    textAlign: "right",
  },
  dueTextOverdue: {
    color: colors.danger,
  },
  labelsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[1],
    marginTop: 1,
  },
  labelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.bg.base,
  },
  labelChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelChipText: {
    fontSize: 10,
    fontWeight: "500",
  },
  rowSelected: {
    backgroundColor: colors.accent.default + "1A",
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  selectCircleChecked: {
    backgroundColor: colors.accent.default,
    borderColor: colors.accent.default,
  },
});
