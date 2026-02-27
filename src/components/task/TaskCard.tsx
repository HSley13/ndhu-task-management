import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../../theme';
import type { Task, Label } from '../../types';
import { formatDueTime } from '../../utils/date';

interface TaskCardProps {
  task: Task;
  labels: Label[];
  onPress: () => void;
}

// Extract the English name from a Moodle course string.
// e.g. "CSIE31300-軟體工程(Software Engineering)-114下..." → "Software Engineering"
// Falls back to the full string if no parenthesised English section is found.
function shortCourse(full: string | null): string | null {
  if (!full) return null;
  const match = full.match(/\(([^)]+[a-zA-Z][^)]*)\)/);
  return match ? match[1] : full;
}

export function TaskCard({ task, labels, onPress }: TaskCardProps) {
  const barColor = labels[0]?.color ?? colors.accent.default;
  const course = shortCourse(task.course);

  return (
    <Pressable style={[styles.card, { borderLeftColor: barColor }]} onPress={onPress}>
      <Text style={styles.title} numberOfLines={1}>
        {task.title}
      </Text>
      {course && (
        <Text style={styles.course} numberOfLines={1}>
          {course}
        </Text>
      )}
      {task.due_time && (
        <Text style={styles.time}>{formatDueTime(task.due_time)}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
    justifyContent: 'center',
    marginBottom: spacing[1],
    gap: 2,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary,
  },
  course: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.accent.default,
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
});
