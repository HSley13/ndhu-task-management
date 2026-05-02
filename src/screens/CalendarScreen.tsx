import React, { useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { TouchableOpacity as GHTouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Calendar } from "react-native-calendars";
import type { DateData } from "react-native-calendars";
import { format } from "date-fns";
import { Feather } from "@expo/vector-icons";
import BottomSheet, { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useTaskStore } from "../store/useTaskStore";
import { colors, spacing, radius, fontSize } from "../theme";
import { isOverdue } from "../utils/date";
import { AddTaskSheet } from "../components/sheets/AddTaskSheet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { CalendarStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<CalendarStackParamList, "Calendar">;

export function CalendarScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { tasks } = useTaskStore();
  const [selected, setSelected] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const addSheetRef = useRef<BottomSheetModal>(null);

  // Build marked dates map
  const markedDates = useMemo(() => {
    const map: Record<string, any> = {};
    tasks.forEach((task) => {
      if (!task.due_date) return;
      const dotColor =
        task.status === "done"
          ? colors.danger + "66"
          : isOverdue(task)
            ? colors.danger
            : colors.accent.default;
      if (!map[task.due_date]) {
        map[task.due_date] = { dots: [] };
      }
      map[task.due_date].dots.push({ key: task.id, color: dotColor });
    });

    // Overlay selected
    if (map[selected]) {
      map[selected].selected = true;
    } else {
      map[selected] = { selected: true };
    }
    map[selected].selectedColor = colors.accent.default + "44";

    return map;
  }, [tasks, selected]);

  function handleDayPress(day: DateData) {
    setSelected(day.dateString);
    navigation.navigate("DayDetail", { date: day.dateString });
  }

  const todayString = format(new Date(), "yyyy-MM-dd");

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Calendar</Text>
        <GHTouchableOpacity
          onPress={() =>
            handleDayPress({ dateString: todayString } as DateData)
          }
          activeOpacity={0.7}
        >
          <Text style={styles.todayBtn}>Today</Text>
        </GHTouchableOpacity>
      </View>

      <Calendar
        current={todayString}
        onDayPress={handleDayPress}
        markingType="multi-dot"
        markedDates={markedDates}
        theme={{
          backgroundColor: colors.bg.base,
          calendarBackground: colors.bg.base,
          textSectionTitleColor: colors.text.tertiary,
          dayTextColor: colors.text.primary,
          todayTextColor: colors.accent.default,
          selectedDayBackgroundColor: colors.accent.muted,
          selectedDayTextColor: colors.accent.default,
          monthTextColor: colors.text.primary,
          arrowColor: colors.accent.default,
          dotColor: colors.accent.default,
          textDisabledColor: colors.text.tertiary,
          textDayFontSize: fontSize.base,
          textMonthFontSize: fontSize.md,
          textDayHeaderFontSize: fontSize.xs,
        }}
        style={[styles.calendar]}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarHeight + spacing[4] }]}
        onPress={() => setShowCreateMenu(true)}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create menu */}
      {showCreateMenu && (
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowCreateMenu(false)}
        >
          <View
            style={[
              styles.createMenu,
              { bottom: tabBarHeight + spacing[4] + 64 },
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowCreateMenu(false);
                addSheetRef.current?.present();
              }}
            >
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: colors.accent.default },
                ]}
              >
                <Feather name="check-square" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Task</Text>
                <Text style={styles.menuSub}>
                  With due date &amp; reminders
                </Text>
              </View>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setShowCreateMenu(false);
                navigation.navigate("NoteEditor");
              }}
            >
              <View style={[styles.menuIcon, { backgroundColor: "#22D3A5" }]}>
                <Feather name="file-text" size={18} color="#fff" />
              </View>
              <View>
                <Text style={styles.menuLabel}>Note</Text>
                <Text style={styles.menuSub}>
                  Free-form text &amp; formatting
                </Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      )}

      <AddTaskSheet sheetRef={addSheetRef} initialDate={selected} />
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
    paddingBottom: spacing[2],
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  todayBtn: {
    fontSize: fontSize.sm,
    color: colors.accent.default,
    fontWeight: "600",
  },
  calendar: {
    borderRadius: radius.lg,
    marginHorizontal: spacing[4],
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
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  createMenu: {
    position: "absolute",
    right: spacing[5],
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingVertical: spacing[2],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    minWidth: 240,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: fontSize.base,
    fontWeight: "700",
    color: colors.text.primary,
  },
  menuSub: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 1,
  },
});
