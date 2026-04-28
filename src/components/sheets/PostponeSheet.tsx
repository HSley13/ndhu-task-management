import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useTaskStore } from "../../store/useTaskStore";
import { colors, spacing, radius, fontSize } from "../../theme";
import {
  DEFAULT_POSTPONE_OPTIONS,
  computePostponeDate,
  formatPostponeTarget,
} from "../../utils/postpone";
import type { PostponeOption } from "../../types";

function optionIcon(option: PostponeOption): React.ComponentProps<typeof Feather>["name"] {
  if (option.type === "custom") return "edit-2";
  if (option.type === "next_week") return "calendar";
  if (option.type === "time_today") return "sun";
  if (option.type === "time_tomorrow") return "sunrise";
  // minutes
  if ("value" in option && option.value <= 60) return "fast-forward";
  return "clock";
}

const NativeDatePicker: React.ComponentType<any> =
  Platform.OS !== "web"
    ? require("@react-native-community/datetimepicker").default
    : View;

export interface PostponeModalProps {
  visible: boolean;
  onClose: () => void;
  taskId: string | null;
}

export function PostponeSheet({
  visible,
  onClose,
  taskId,
}: PostponeModalProps) {
  const { postponeTask } = useTaskStore();
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customDate, setCustomDate] = useState<Date | null>(null);

  async function commit(date: Date) {
    if (!taskId) return;
    await postponeTask(
      taskId,
      format(date, "yyyy-MM-dd"),
      format(date, "HH:mm:ss"),
    );
    handleClose();
  }

  function handleClose() {
    setShowCustomPicker(false);
    setCustomDate(null);
    onClose();
  }

  async function handleSelect(option: PostponeOption) {
    if (!taskId) return;
    if (option.type === "custom") {
      setShowCustomPicker(true);
      return;
    }
    await commit(computePostponeDate(option));
  }

  async function handleCustomConfirm() {
    if (customDate) await commit(customDate);
    else handleClose();
  }

  const previewableOptions = DEFAULT_POSTPONE_OPTIONS.filter(
    (o) => o.type !== "custom",
  );
  const customOption = DEFAULT_POSTPONE_OPTIONS.find(
    (o) => o.type === "custom",
  )!;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.kav}
        >
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
            {/* Header */}
            <View style={styles.cardHeader}>
              <Feather name="clock" size={16} color={colors.accent.default} />
              <Text style={styles.cardTitle}>Postpone to…</Text>
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <Feather name="x" size={18} color={colors.text.tertiary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Preset options */}
              {!showCustomPicker &&
                previewableOptions.map((option) => {
                  const result = computePostponeDate(option);
                  return (
                    <Pressable
                      key={option.label}
                      style={styles.row}
                      onPress={() => handleSelect(option)}
                    >
                      <View style={styles.iconWrap}>
                        <Feather
                          name={optionIcon(option)}
                          size={16}
                          color={colors.accent.default}
                        />
                      </View>
                      <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>{option.label}</Text>
                        <Text style={styles.rowPreview}>
                          {formatPostponeTarget(result)}
                        </Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={colors.border.strong}
                      />
                    </Pressable>
                  );
                })}

              {/* Custom picker row or inline picker */}
              {!showCustomPicker ? (
                <Pressable
                  style={styles.row}
                  onPress={() => handleSelect(customOption)}
                >
                  <View style={styles.iconWrap}>
                    <Feather
                      name="calendar"
                      size={16}
                      color={colors.accent.default}
                    />
                  </View>
                  <View style={styles.rowContent}>
                    <Text style={styles.rowLabel}>{customOption.label}</Text>
                    <Text style={styles.rowPreview}>
                      Choose a specific date &amp; time
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colors.border.strong}
                  />
                </Pressable>
              ) : (
                <View style={styles.customSection}>
                  <Text style={styles.customHeading}>
                    Pick a date &amp; time
                  </Text>
                  {Platform.OS !== "web" ? (
                    <NativeDatePicker
                      value={customDate ?? new Date()}
                      mode="datetime"
                      display="spinner"
                      onChange={(_: any, d?: Date) => {
                        if (d) setCustomDate(d);
                      }}
                    />
                  ) : (
                    <View style={styles.webPickerRow}>
                      {React.createElement("input", {
                        type: "date",
                        value: customDate
                          ? format(customDate, "yyyy-MM-dd")
                          : "",
                        onChange: (e: any) => {
                          if (e.target.value) {
                            const d = customDate ?? new Date();
                            const parsed = parseISO(e.target.value);
                            parsed.setHours(d.getHours(), d.getMinutes(), 0, 0);
                            setCustomDate(parsed);
                          }
                        },
                        style: {
                          colorScheme: "dark",
                          flex: 1,
                          color: colors.text.primary,
                          background: colors.bg.elevated,
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: `${radius.md}px`,
                          padding: `${spacing[2]}px ${spacing[3]}px`,
                          fontSize: `${fontSize.sm}px`,
                          outline: "none",
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                        },
                      })}
                      {React.createElement("input", {
                        type: "time",
                        value: customDate ? format(customDate, "HH:mm") : "",
                        onChange: (e: any) => {
                          if (e.target.value) {
                            const d = customDate
                              ? new Date(customDate)
                              : new Date();
                            const [h, m] = e.target.value
                              .split(":")
                              .map(Number);
                            d.setHours(h, m, 0, 0);
                            setCustomDate(d);
                          }
                        },
                        style: {
                          colorScheme: "dark",
                          flex: 1,
                          color: colors.text.primary,
                          background: colors.bg.elevated,
                          border: `1px solid ${colors.border.default}`,
                          borderRadius: `${radius.md}px`,
                          padding: `${spacing[2]}px ${spacing[3]}px`,
                          fontSize: `${fontSize.sm}px`,
                          outline: "none",
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                        },
                      })}
                    </View>
                  )}
                  <View style={styles.customActions}>
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => setShowCustomPicker(false)}
                    >
                      <Text style={styles.cancelBtnText}>Back</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.confirmBtn,
                        !customDate && styles.confirmBtnDisabled,
                      ]}
                      onPress={handleCustomConfirm}
                      disabled={!customDate}
                    >
                      <Text style={styles.confirmBtnText}>Confirm</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[5],
  },
  kav: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
    maxHeight: "85%" as any,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.text.primary,
  },
  closeBtn: {
    padding: spacing[1],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[4],
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.accent.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.text.primary,
  },
  rowPreview: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  customSection: {
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  customHeading: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  webPickerRow: {
    flexDirection: "row",
    gap: spacing[2],
  },
  webDateInput: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.text.primary,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  customActions: {
    flexDirection: "row",
    gap: spacing[3],
    marginTop: spacing[1],
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelBtnText: {
    fontSize: fontSize.base,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: colors.accent.default,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.bg.surface,
  },
});
