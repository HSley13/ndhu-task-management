import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import { useTaskStore } from "../../store/useTaskStore";
import { useLabelStore } from "../../store/useLabelStore";
import { colors, spacing, radius, fontSize } from "../../theme";
import { SheetHandle } from "../ui/SheetHandle";
import { Button } from "../ui/Button";

interface LabelPickerSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  taskId: string | null;
  selectedLabelIds: string[];
  onClose: () => void;
}

export function LabelPickerSheet({
  sheetRef,
  taskId,
  selectedLabelIds,
  onClose,
}: LabelPickerSheetProps) {
  const { setTaskLabels } = useTaskStore();
  const { labels, addLabel } = useLabelStore();
  const snapPoints = useMemo(() => ["55%"], []);

  const [selected, setSelected] = useState<string[]>(selectedLabelIds);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(colors.labels[0] as string);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  async function handleSave() {
    if (!taskId) return;
    setLoading(true);
    try {
      await setTaskLabels(taskId, selected);
      onClose();
      sheetRef.current?.close();
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLabel() {
    const n = newName.trim();
    if (!n) return;
    await addLabel(n, newColor);
    setNewName("");
    setShowNew(false);
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
      keyboardBehavior="interactive"
    >
      <View style={styles.content}>
        <Text style={styles.heading}>Labels</Text>
        {labels.map((label) => (
          <Pressable
            key={label.id}
            style={styles.row}
            onPress={() => toggle(label.id)}
          >
            <View style={[styles.dot, { backgroundColor: label.color }]} />
            <Text style={styles.labelName}>{label.name}</Text>
            {selected.includes(label.id) && (
              <Feather name="check" size={18} color={colors.accent.default} />
            )}
          </Pressable>
        ))}

        {showNew ? (
          <View style={styles.newRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Label name…"
              placeholderTextColor={colors.text.tertiary}
              style={styles.newInput}
              autoFocus
            />
            <View style={styles.colorRow}>
              {(colors.labels as readonly string[]).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    newColor === c && styles.colorDotActive,
                  ]}
                />
              ))}
            </View>
            <View style={styles.newBtns}>
              <Button
                variant="ghost"
                label="Cancel"
                onPress={() => setShowNew(false)}
                style={{ flex: 1 }}
              />
              <Button
                label="Create"
                onPress={handleCreateLabel}
                disabled={!newName.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <Pressable style={styles.addRow} onPress={() => setShowNew(true)}>
            <Feather name="plus" size={16} color={colors.text.tertiary} />
            <Text style={styles.addText}>New label</Text>
          </Pressable>
        )}

        <Button
          label="Apply"
          onPress={handleSave}
          loading={loading}
          style={styles.applyBtn}
        />
      </View>
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
    paddingBottom: 32,
    gap: spacing[2],
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
    paddingBottom: spacing[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  labelName: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
  },
  addText: {
    fontSize: fontSize.base,
    color: colors.text.tertiary,
  },
  newRow: {
    gap: spacing[3],
    paddingTop: spacing[2],
  },
  newInput: {
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    color: colors.text.primary,
    fontSize: fontSize.base,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: "#fff",
  },
  newBtns: {
    flexDirection: "row",
    gap: spacing[2],
  },
  applyBtn: {
    marginTop: spacing[3],
  },
});
