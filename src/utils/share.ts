import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { format, parseISO } from 'date-fns';
import type { TaskFull } from '../types';
import { formatDueDate, formatDueTime } from './date';

export function formatTaskForSharing(task: TaskFull): string {
  const lines: string[] = [
    `[NDHU Assistant] Task: ${task.title}`,
  ];

  if (task.course) lines.push(`Course: ${task.course}`);

  if (task.due_date) {
    const dateStr = formatDueDate(task.due_date);
    const timeStr = task.due_time ? ` at ${formatDueTime(task.due_time)}` : '';
    lines.push(`Due: ${dateStr}${timeStr}`);
  }

  if (task.labels.length > 0) {
    lines.push(`Labels: ${task.labels.map((l) => l.name).join(', ')}`);
  }

  const doneCount = task.subtasks.filter((st) => st.done).length;
  if (task.subtasks.length > 0) {
    lines.push(`Subtasks: ${doneCount} done / ${task.subtasks.length} total`);
  }

  if (task.moodle_url) {
    lines.push(`Link: ${task.moodle_url}`);
  }

  return lines.join('\n');
}

export async function shareTask(task: TaskFull): Promise<void> {
  const text = formatTaskForSharing(task);
  const fileUri = `${FileSystem.cacheDirectory}task_${task.id}.txt`;
  await FileSystem.writeAsStringAsync(fileUri, text, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/plain',
    dialogTitle: `Share: ${task.title}`,
  });
}
