import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { subDays, parseISO, isAfter, startOfDay, format } from "date-fns";
import { useTaskStore } from "../store/useTaskStore";
import { isOverdue } from "../utils/date";
import { colors, spacing, radius, fontSize } from "../theme";

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent ? { color: accent } : undefined]}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { tasks } = useTaskStore();

  const nonNotes = useMemo(
    () => tasks.filter((t) => !t.is_note),
    [tasks],
  );

  const total = nonNotes.length;
  const done = nonNotes.filter((t) => t.status === "done").length;
  const pending = nonNotes.filter((t) => t.status !== "done").length;
  const overdue = nonNotes.filter((t) => isOverdue(t)).length;

  // Weekly completion — last 5 weeks (Mon–Sun)
  const weeklyData = useMemo(() => {
    const weeks: { label: string; count: number }[] = [];
    const today = startOfDay(new Date());
    for (let i = 4; i >= 0; i--) {
      const weekStart = subDays(today, today.getDay() + i * 7);
      const weekEnd = subDays(today, today.getDay() + i * 7 - 6);
      const count = nonNotes.filter((t) => {
        if (t.status !== "done") return false;
        const completedStr = t.completed_at ?? t.updated_at;
        if (!completedStr) return false;
        try {
          const d = startOfDay(parseISO(completedStr));
          return !isAfter(weekStart, d) && !isAfter(d, weekEnd);
        } catch {
          return false;
        }
      }).length;
      weeks.push({ label: format(weekStart, "MMM d"), count });
    }
    return weeks;
  }, [nonNotes]);

  const maxWeekly = Math.max(...weeklyData.map((w) => w.count), 1);

  // Streak — consecutive days with at least 1 completion going back from today
  const streak = useMemo(() => {
    let count = 0;
    const today = startOfDay(new Date());
    for (let i = 0; i <= 365; i++) {
      const day = format(subDays(today, i), "yyyy-MM-dd");
      const hasCompletion = nonNotes.some((t) => {
        if (t.status !== "done") return false;
        const completedStr = t.completed_at ?? t.updated_at;
        if (!completedStr) return false;
        try {
          return format(parseISO(completedStr), "yyyy-MM-dd") === day;
        } catch {
          return false;
        }
      });
      if (hasCompletion) {
        count++;
      } else if (i > 0) {
        break;
      }
    }
    return count;
  }, [nonNotes]);

  // Course breakdown
  const courseStats = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {};
    for (const t of nonNotes) {
      const key = t.course ?? "No Course";
      if (!map[key]) map[key] = { total: 0, done: 0 };
      map[key].total++;
      if (t.status === "done") map[key].done++;
    }
    return Object.entries(map)
      .map(([course, data]) => ({ course, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [nonNotes]);

  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing[4], paddingBottom: tabBarHeight + spacing[8] },
      ]}
    >
      <Text style={styles.heading}>Statistics</Text>

      {/* Overview cards */}
      <View style={styles.cardRow}>
        <StatCard label="Total Tasks" value={total} />
        <StatCard
          label="Completion"
          value={`${completionRate}%`}
          accent={colors.accent.default}
        />
      </View>
      <View style={styles.cardRow}>
        <StatCard label="Done" value={done} accent={colors.success} />
        <StatCard label="Pending" value={pending} />
        <StatCard label="Overdue" value={overdue} accent={colors.danger} />
        <StatCard
          label="Streak 🔥"
          value={streak > 0 ? `${streak}d` : "—"}
          accent={colors.warning}
        />
      </View>

      {/* Weekly bar chart */}
      <Text style={styles.sectionTitle}>Completions by Week</Text>
      <View style={styles.barChart}>
        {weeklyData.map(({ label, count }) => (
          <View key={label} style={styles.barCol}>
            <Text style={styles.barCount}>{count}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { height: `${Math.round((count / maxWeekly) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Course breakdown */}
      {courseStats.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>By Course</Text>
          {courseStats.map(({ course, total: ct, done: cd }) => {
            const rate = ct > 0 ? cd / ct : 0;
            return (
              <View key={course} style={styles.courseRow}>
                <View style={styles.courseInfo}>
                  <Text style={styles.courseName} numberOfLines={1}>
                    {course}
                  </Text>
                  <Text style={styles.courseCount}>
                    {cd}/{ct}
                  </Text>
                </View>
                <View style={styles.courseTrack}>
                  <View
                    style={[styles.courseFill, { width: `${Math.round(rate * 100)}%` }]}
                  />
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: spacing[2],
  },
  cardRow: {
    flexDirection: "row",
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: "center",
    gap: spacing[1],
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: "800",
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  barChart: {
    flexDirection: "row",
    gap: spacing[2],
    height: 140,
    backgroundColor: colors.bg.surface,
    borderRadius: radius.lg,
    padding: spacing[3],
    alignItems: "flex-end",
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  barCount: {
    fontSize: 10,
    color: colors.text.tertiary,
  },
  barTrack: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.sm,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    backgroundColor: colors.accent.default,
    borderRadius: radius.sm,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 9,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  courseRow: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: spacing[2],
  },
  courseInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  courseName: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: "600",
    flex: 1,
    marginRight: spacing[2],
  },
  courseCount: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  courseTrack: {
    height: 6,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  courseFill: {
    height: "100%",
    backgroundColor: colors.accent.default,
    borderRadius: radius.full,
    minWidth: 4,
  },
});
