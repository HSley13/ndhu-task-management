import { addMinutes, isBefore } from 'date-fns';
import { format, parse } from 'date-fns';
import { Platform } from 'react-native';
import { getDb } from '../db/client';
import * as remindersDb from '../db/reminders';
import * as tasksDb from '../db/tasks';
import type { Task, Reminder } from '../types';
import { Notifications } from './notificationsShim';

function buildDueDate(task: Task): Date | null {
  if (!task.due_date) return null;
  const timeStr = task.due_time
    ? (task.due_time.length > 5 ? task.due_time.slice(0, 5) : task.due_time)
    : '23:59';
  return parse(`${task.due_date} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date());
}

export async function scheduleRemindersForTask(
  task: Task,
  offsets: number[],
): Promise<Reminder[]> {
  if (!Notifications) return [];

  const dueDate = buildDueDate(task);
  if (!dueDate) return [];

  const db = await getDb();
  const created: Reminder[] = [];

  for (const offset of offsets) {
    const fireDate = addMinutes(dueDate, offset);
    if (isBefore(fireDate, new Date())) continue;

    let expoId: string | null = null;
    try {
      expoId = await Notifications.scheduleNotificationAsync({
        content: {
          title: task.title,
          body:
            `Due ${format(dueDate, 'MMM d \'at\' h:mm a')}` +
            (task.course ? ` · ${task.course}` : ''),
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
          data: { task_id: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      });
    } catch {
      // Notification scheduling failure is non-fatal
    }

    const reminder = await remindersDb.insertReminder(db, {
      task_id:              task.id,
      offset_minutes:       offset,
      scheduled_at:         fireDate.toISOString(),
      expo_notification_id: expoId,
      delivered:            false,
    });
    created.push(reminder);
  }

  return created;
}

export async function cancelRemindersForTask(task_id: string): Promise<void> {
  const db = await getDb();
  const reminders = await remindersDb.getRemindersForTask(db, task_id);
  for (const r of reminders) {
    if (r.expo_notification_id && Notifications) {
      await Notifications.cancelScheduledNotificationAsync(r.expo_notification_id).catch(() => undefined);
    }
  }
  await remindersDb.deleteRemindersForTask(db, task_id);
}

export async function rescheduleAllReminders(): Promise<void> {
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const db = await getDb();
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks = await tasksDb.getTasksByDateRange(db, today, '9999-12-31');

  for (const task of tasks) {
    if (task.status === 'done') continue;
    const existingReminders = await remindersDb.getRemindersForTask(db, task.id);
    if (existingReminders.length === 0) continue;

    const offsets = [...new Set(existingReminders.map((r) => r.offset_minutes))];
    // Clear stale DB entries, then re-schedule
    await remindersDb.deleteRemindersForTask(db, task.id);
    await scheduleRemindersForTask(task, offsets);
  }
}
