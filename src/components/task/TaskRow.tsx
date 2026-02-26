import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { colors, spacing, radius, fontSize } from '../../theme';
import { Checkbox } from '../ui/Checkbox';
import { useTaskStore } from '../../store/useTaskStore';
import { useHaptics } from '../../hooks/useHaptics';
import { formatRelativeDue, isOverdue } from '../../utils/date';
import type { Task, Label } from '../../types';

interface TaskRowProps {
  task: Task;
  labels: Label[];
  onPress: () => void;
  onPostpone: () => void;
}

function LeftActions({ onPostpone, onDelete }: { onPostpone: () => void; onDelete: () => void }) {
  return (
    <View style={styles.leftActions}>
      <Pressable style={[styles.action, styles.postponeAction]} onPress={onPostpone}>
        <Feather name="clock" size={20} color="#fff" />
        <Text style={styles.actionText}>Postpone</Text>
      </Pressable>
      <Pressable style={[styles.action, styles.deleteAction]} onPress={onDelete}>
        <Feather name="trash-2" size={20} color="#fff" />
        <Text style={styles.actionText}>Delete</Text>
      </Pressable>
    </View>
  );
}

function RightActions({ isPinned, onTogglePin }: { isPinned: boolean; onTogglePin: () => void }) {
  return (
    <Pressable style={[styles.action, styles.pinAction]} onPress={onTogglePin}>
      <Feather name={isPinned ? 'bookmark' : 'bookmark'} size={20} color="#fff" />
      <Text style={styles.actionText}>{isPinned ? 'Unpin' : 'Pin'}</Text>
    </Pressable>
  );
}

export function TaskRow({ task, labels, onPress, onPostpone }: TaskRowProps) {
  const { toggleDone, togglePin, deleteTask } = useTaskStore();
  const haptics = useHaptics();
  const overdue = isOverdue(task);
  const isDone  = task.status === 'done';

  const borderColor = task.is_pinned
    ? colors.accent.default
    : overdue
    ? colors.danger
    : 'transparent';

  function handleDelete() {
    haptics.medium();
    deleteTask(task.id);
  }

  return (
    <Swipeable
      renderLeftActions={() => (
        <LeftActions onPostpone={onPostpone} onDelete={handleDelete} />
      )}
      renderRightActions={() => (
        <RightActions isPinned={task.is_pinned} onTogglePin={() => togglePin(task.id)} />
      )}
      overshootLeft={false}
      overshootRight={false}
    >
      <Pressable
        style={[styles.row, { borderLeftColor: borderColor }]}
        onPress={onPress}
        onLongPress={() => haptics.medium()}
      >
        <Checkbox
          checked={isDone}
          onChange={() => toggleDone(task.id)}
        />
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
                  <View style={[styles.labelChipDot, { backgroundColor: l.color }]} />
                  <Text style={[styles.labelChipText, { color: l.color }]} numberOfLines={1}>
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
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.base,
    paddingHorizontal: spacing[4],
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
    fontWeight: '500',
  },
  titleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.45,
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  course: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 70,
  },
  dueText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  dueTextOverdue: {
    color: colors.danger,
  },
  labelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: 1,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.bg.elevated,
  },
  labelChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  labelChipText: {
    fontSize: 10,
    fontWeight: '500',
  },
  leftActions: {
    flexDirection: 'row',
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    gap: 4,
  },
  postponeAction: {
    backgroundColor: colors.warning,
  },
  deleteAction: {
    backgroundColor: colors.danger,
  },
  pinAction: {
    backgroundColor: colors.accent.default,
  },
  actionText: {
    color: '#fff',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
