import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, Switch } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import { useTaskStore } from "../../store/useTaskStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { colors, spacing, radius, fontSize } from "../../theme";
import { SheetHandle } from "../ui/SheetHandle";
import { Button } from "../ui/Button";

const OFFSET_OPTIONS = [
  { label: "5 min before", value: -5 },
  { label: "15 min before", value: -15 },
  { label: "30 min before", value: -30 },
  { label: "1 hour before", value: -60 },
  { label: "1 day before", value: -1440 },
  { label: "2 days before", value: -2880 },
];

interface ReminderPickerSheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  taskId: string | null;
}

export function ReminderPickerSheet({
  sheetRef,
  taskId,
}: ReminderPickerSheetProps) {
  const { addReminder } = useTaskStore();
  const { defaultReminderOffsets } = useSettingsStore();
  const snapPoints = useMemo(() => ["50%"], []);

  const [selected, setSelected] = useState<number[]>(defaultReminderOffsets);
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

  function toggle(value: number) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  }

  async function handleSave() {
    if (!taskId) return;
    setLoading(true);
    try {
      for (const offset of selected) {
        await addReminder(taskId, offset);
      }
      sheetRef.current?.close();
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
    >
      <View style={styles.content}>
        <Text style={styles.heading}>Set Reminders</Text>
        <View style={styles.list}>
          {OFFSET_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={styles.row}
              onPress={() => toggle(opt.value)}
            >
              <Text style={styles.label}>{opt.label}</Text>
              <View
                style={[
                  styles.check,
                  selected.includes(opt.value) && styles.checkActive,
                ]}
              >
                {selected.includes(opt.value) && (
                  <Feather name="check" size={12} color="#fff" />
                )}
              </View>
            </Pressable>
          ))}
        </View>
        <Button
          label="Save Reminders"
          onPress={handleSave}
          loading={loading}
          disabled={selected.length === 0}
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
    gap: spacing[4],
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
  },
  list: {
    gap: spacing[1],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  label: {
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
    alignItems: "center",
    justifyContent: "center",
  },
  checkActive: {
    backgroundColor: colors.accent.default,
    borderColor: colors.accent.default,
  },
});
