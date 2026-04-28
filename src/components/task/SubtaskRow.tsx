import React, { useRef, useState } from "react";
import { TextInput, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Checkbox } from "../ui/Checkbox";
import { useTaskStore } from "../../store/useTaskStore";
import { getDb } from "../../db/client";
import { updateSubtask } from "../../db/subtasks";
import { colors, spacing, fontSize } from "../../theme";
import type { Subtask } from "../../types";

interface SubtaskRowProps {
  subtask: Subtask;
}

export function SubtaskRow({ subtask }: SubtaskRowProps) {
  const { toggleSubtask, deleteSubtask } = useTaskStore();
  const [showDelete, setShowDelete] = useState(false);
  const [title, setTitle] = useState(subtask.title);
  const inputRef = useRef<TextInput>(null);

  async function handleTitleChange(text: string) {
    setTitle(text);
    const db = await getDb();
    await updateSubtask(db, subtask.id, { title: text });
  }

  return (
    <Pressable style={styles.row} onLongPress={() => setShowDelete((v) => !v)}>
      <Checkbox
        size={18}
        checked={subtask.done}
        onChange={() => toggleSubtask(subtask.id)}
      />
      <TextInput
        ref={inputRef}
        value={title}
        onChangeText={handleTitleChange}
        style={[styles.input, subtask.done && styles.inputDone]}
        placeholderTextColor={colors.text.tertiary}
        multiline={false}
        returnKeyType="done"
      />
      {showDelete && (
        <Pressable onPress={() => deleteSubtask(subtask.id)} hitSlop={8}>
          <Feather name="trash-2" size={16} color={colors.danger} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  inputDone: {
    textDecorationLine: "line-through",
    opacity: 0.45,
  },
});
