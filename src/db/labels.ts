import * as SQLite from "expo-sqlite";
import { uuidv4 } from "../utils/uuid";
import type { Label } from "../types";

function rowToLabel(row: Record<string, unknown>): Label {
  return {
    id: row["id"] as string,
    name: row["name"] as string,
    color: row["color"] as string,
  };
}

export async function getAllLabels(
  db: SQLite.SQLiteDatabase,
): Promise<Label[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM labels ORDER BY name ASC",
  );
  return rows.map(rowToLabel);
}

export async function insertLabel(
  db: SQLite.SQLiteDatabase,
  name: string,
  color: string,
): Promise<Label> {
  const id = uuidv4();
  await db.runAsync(
    "INSERT INTO labels (id, name, color) VALUES (?, ?, ?)",
    id,
    name,
    color,
  );
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM labels WHERE id = ?",
    id,
  );
  if (!row) throw new Error("insertLabel: row not found after insert");
  return rowToLabel(row);
}

export async function deleteLabel(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM labels WHERE id = ?", id);
}

export async function getLabelsForTask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
): Promise<Label[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT l.* FROM labels l
     INNER JOIN task_labels tl ON tl.label_id = l.id
     WHERE tl.task_id = ?
     ORDER BY l.name ASC`,
    task_id,
  );
  return rows.map(rowToLabel);
}

export async function setLabelsForTask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
  label_ids: string[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM task_labels WHERE task_id = ?", task_id);
    for (const label_id of label_ids) {
      await db.runAsync(
        "INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)",
        task_id,
        label_id,
      );
    }
  });
}
