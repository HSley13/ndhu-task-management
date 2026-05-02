import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import { format, addMonths } from "date-fns";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize } from "../../theme";

interface RecurDatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (dates: string[]) => void;
  initialDates?: string[];
}

const TODAY = format(new Date(), "yyyy-MM-dd");
// Show 6 months starting from this month
const MONTHS = Array.from({ length: 6 }, (_, i) =>
  format(addMonths(new Date(), i), "yyyy-MM-01"),
);

// Short month+day label for chips
function shortDate(dateStr: string): string {
  try {
    const [, m, d] = dateStr.split("-");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
  } catch {
    return dateStr;
  }
}

export function RecurDatePickerModal({
  visible,
  onClose,
  onConfirm,
  initialDates = [],
}: RecurDatePickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(initialDates),
  );

  // Sync when modal opens
  useEffect(() => {
    if (visible) {
      setSelected(new Set(initialDates));
    }
  }, [visible]);

  function toggleDate(day: DateData) {
    const { dateString } = day;
    // Don't allow selecting past dates
    if (dateString < TODAY) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(dateString)) {
        next.delete(dateString);
      } else {
        next.add(dateString);
      }
      return next;
    });
  }

  const markedDates = useMemo(() => {
    const map: Record<string, any> = {};
    for (const d of selected) {
      map[d] = {
        selected: true,
        selectedColor: colors.accent.default,
        selectedTextColor: "#fff",
      };
    }
    // Mark today if not selected
    if (!map[TODAY]) {
      map[TODAY] = { today: true };
    }
    return map;
  }, [selected]);

  const sortedDates = useMemo(
    () => Array.from(selected).sort(),
    [selected],
  );

  function handleConfirm() {
    onConfirm(sortedDates);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.headerBtn}>
            <Feather name="x" size={22} color={colors.text.secondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Choose Repeat Dates</Text>
          {selected.size > 0 ? (
            <Pressable
              onPress={() => setSelected(new Set())}
              hitSlop={8}
              style={styles.headerBtn}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        <Text style={styles.subtitle}>
          Tap dates to mark when this task should repeat. Past dates are
          disabled.
        </Text>

        {/* Selected chips */}
        {sortedDates.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
            style={styles.chipsRow}
          >
            {sortedDates.map((d) => (
              <Pressable
                key={d}
                style={styles.chip}
                onPress={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    next.delete(d);
                    return next;
                  })
                }
              >
                <Text style={styles.chipText}>{shortDate(d)}</Text>
                <Feather name="x" size={11} color={colors.accent.default} />
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Calendars — one per month in a scroll view */}
        <ScrollView
          style={styles.calendarScroll}
          showsVerticalScrollIndicator={false}
        >
          {MONTHS.map((monthStr) => (
            <Calendar
              key={monthStr}
              current={monthStr}
              onDayPress={toggleDate}
              markingType="simple"
              markedDates={markedDates}
              hideArrows
              disableMonthChange
              theme={{
                backgroundColor: colors.bg.surface,
                calendarBackground: colors.bg.surface,
                textSectionTitleColor: colors.text.tertiary,
                dayTextColor: colors.text.primary,
                todayTextColor: colors.accent.default,
                selectedDayBackgroundColor: colors.accent.default,
                selectedDayTextColor: "#fff",
                monthTextColor: colors.text.primary,
                textDayFontSize: fontSize.base,
                textMonthFontSize: fontSize.md,
                textDayHeaderFontSize: fontSize.xs,
                textDisabledColor: "#3A3A4A",
              }}
              style={styles.calendar}
            />
          ))}
          <View style={styles.calendarScrollPad} />
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.confirmBtn,
              selected.size === 0 && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            disabled={selected.size === 0}
          >
            <Feather name="repeat" size={16} color="#fff" />
            <Text style={styles.confirmText}>
              {selected.size === 0
                ? "Select at least one date"
                : `Confirm ${selected.size} date${selected.size > 1 ? "s" : ""}`}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerBtn: {
    width: 44,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text.primary,
  },
  clearText: {
    fontSize: fontSize.sm,
    color: colors.danger,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1],
  },
  chipsRow: {
    maxHeight: 40,
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  chipsScroll: {
    gap: spacing[2],
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    backgroundColor: colors.accent.default + "22",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent.default + "66",
  },
  chipText: {
    fontSize: fontSize.xs,
    color: colors.accent.default,
    fontWeight: "600",
  },
  calendar: {
    marginBottom: spacing[2],
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  calendarScroll: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  calendarScrollPad: {
    height: spacing[4],
  },
  footer: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.accent.default,
    borderRadius: radius.lg,
    paddingVertical: spacing[4],
  },
  confirmBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  confirmText: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: "#fff",
  },
});
