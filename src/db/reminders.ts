import * as SQLite from "expo-sqlite";
import { uuidv4 } from "../utils/uuid";
import type { Reminder } from "../types";

function rowToReminder(row: Record<string, unknown>): Reminder {
  return {
    id: row["id"] as string,
    task_id: row["task_id"] as string,
    offset_minutes: row["offset_minutes"] as number,
    scheduled_at: row["scheduled_at"] as string,
    expo_notification_id:
      (row["expo_notification_id"] as string | null) ?? null,
    delivered: Boolean(row["delivered"]),
  };
}

export async function getRemindersForTask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
): Promise<Reminder[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM reminders WHERE task_id = ? ORDER BY scheduled_at ASC",
    task_id,
  );
  return rows.map(rowToReminder);
}

export async function insertReminder(
  db: SQLite.SQLiteDatabase,
  data: Omit<Reminder, "id">,
): Promise<Reminder> {
  const id = uuidv4();
  await db.runAsync(
    `INSERT INTO reminders
       (id, task_id, offset_minutes, scheduled_at, expo_notification_id, delivered)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    data.task_id,
    data.offset_minutes,
    data.scheduled_at,
    data.expo_notification_id ?? null,
    data.delivered ? 1 : 0,
  );
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM reminders WHERE id = ?",
    id,
  );
  if (!row) throw new Error("insertReminder: row not found after insert");
  return rowToReminder(row);
}

export async function updateReminder(
  db: SQLite.SQLiteDatabase,
  id: string,
  patch: Partial<Pick<Reminder, "expo_notification_id" | "delivered">>,
): Promise<Reminder> {
  const fields: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];
  if (patch.expo_notification_id !== undefined) {
    fields.push("expo_notification_id = ?");
    values.push(patch.expo_notification_id ?? null);
  }
  if (patch.delivered !== undefined) {
    fields.push("delivered = ?");
    values.push(patch.delivered ? 1 : 0);
  }
  if (fields.length > 0) {
    values.push(id);
    await db.runAsync(
      `UPDATE reminders SET ${fields.join(", ")} WHERE id = ?`,
      ...values,
    );
  }
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM reminders WHERE id = ?",
    id,
  );
  if (!row) throw new Error("updateReminder: row not found");
  return rowToReminder(row);
}

export async function deleteRemindersForTask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM reminders WHERE task_id = ?", task_id);
}

export async function deleteRemindersByOffset(
  db: SQLite.SQLiteDatabase,
  task_id: string,
  offset_minutes: number,
): Promise<void> {
  await db.runAsync(
    "DELETE FROM reminders WHERE task_id = ? AND offset_minutes = ?",
    task_id,
    offset_minutes,
  );
}

export async function getPendingReminders(
  db: SQLite.SQLiteDatabase,
): Promise<Reminder[]> {
  const now = new Date().toISOString();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM reminders WHERE delivered = 0 AND scheduled_at >= ? ORDER BY scheduled_at ASC",
    now,
  );
  return rows.map(rowToReminder);
}
