import * as SQLite from "expo-sqlite";
import { uuidv4 } from "../utils/uuid";
import type { LocationReminder } from "../types";

function rowToLocationReminder(row: Record<string, unknown>): LocationReminder {
  return {
    id: row["id"] as string,
    task_id: row["task_id"] as string,
    label: row["label"] as string,
    latitude: row["latitude"] as number,
    longitude: row["longitude"] as number,
    radius_meters: row["radius_meters"] as number,
    trigger: row["trigger"] as "arrive" | "depart",
    expo_notification_id: (row["expo_notification_id"] as string | null) ?? null,
  };
}

export async function getLocationRemindersForTask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
): Promise<LocationReminder[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM location_reminders WHERE task_id = ?",
    task_id,
  );
  return rows.map(rowToLocationReminder);
}

export async function insertLocationReminder(
  db: SQLite.SQLiteDatabase,
  data: Omit<LocationReminder, "id">,
): Promise<LocationReminder> {
  const id = uuidv4();
  await db.runAsync(
    `INSERT INTO location_reminders
       (id, task_id, label, latitude, longitude, radius_meters, trigger, expo_notification_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    data.task_id,
    data.label,
    data.latitude,
    data.longitude,
    data.radius_meters,
    data.trigger,
    data.expo_notification_id ?? null,
  );
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM location_reminders WHERE id = ?",
    id,
  );
  if (!row) throw new Error("insertLocationReminder: row not found after insert");
  return rowToLocationReminder(row);
}

export async function updateLocationReminderNotificationId(
  db: SQLite.SQLiteDatabase,
  id: string,
  expo_notification_id: string | null,
): Promise<void> {
  await db.runAsync(
    "UPDATE location_reminders SET expo_notification_id = ? WHERE id = ?",
    expo_notification_id ?? null,
    id,
  );
}

export async function deleteLocationReminder(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM location_reminders WHERE id = ?", id);
}

export async function deleteLocationRemindersForTask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
): Promise<void> {
  await db.runAsync(
    "DELETE FROM location_reminders WHERE task_id = ?",
    task_id,
  );
}
