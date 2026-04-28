import * as SQLite from "expo-sqlite";
import { uuidv4 } from "../utils/uuid";
import type { Subtask } from "../types";

function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: row["id"] as string,
    task_id: row["task_id"] as string,
    title: row["title"] as string,
    done: Boolean(row["done"]),
    position: row["position"] as number,
  };
}

export async function getSubtasksForTask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
): Promise<Subtask[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM subtasks WHERE task_id = ? ORDER BY position ASC",
    task_id,
  );
  return rows.map(rowToSubtask);
}

export async function insertSubtask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
  title: string,
): Promise<Subtask> {
  const id = uuidv4();
  const maxRow = await db.getFirstAsync<{ max_pos: number | null }>(
    "SELECT MAX(position) as max_pos FROM subtasks WHERE task_id = ?",
    task_id,
  );
  const position = (maxRow?.max_pos ?? -1) + 1;
  await db.runAsync(
    "INSERT INTO subtasks (id, task_id, title, done, position) VALUES (?, ?, ?, 0, ?)",
    id,
    task_id,
    title,
    position,
  );
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM subtasks WHERE id = ?",
    id,
  );
  if (!row) throw new Error("insertSubtask: row not found after insert");
  return rowToSubtask(row);
}

export async function updateSubtask(
  db: SQLite.SQLiteDatabase,
  id: string,
  patch: Partial<Pick<Subtask, "title" | "done" | "position">>,
): Promise<Subtask> {
  const fields: string[] = [];
  const values: SQLite.SQLiteBindValue[] = [];
  if (patch.title !== undefined) {
    fields.push("title = ?");
    values.push(patch.title);
  }
  if (patch.done !== undefined) {
    fields.push("done = ?");
    values.push(patch.done ? 1 : 0);
  }
  if (patch.position !== undefined) {
    fields.push("position = ?");
    values.push(patch.position);
  }
  if (fields.length > 0) {
    values.push(id);
    await db.runAsync(
      `UPDATE subtasks SET ${fields.join(", ")} WHERE id = ?`,
      ...values,
    );
  }
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM subtasks WHERE id = ?",
    id,
  );
  if (!row) throw new Error("updateSubtask: row not found");
  return rowToSubtask(row);
}

export async function deleteSubtask(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM subtasks WHERE id = ?", id);
}

export async function reorderSubtasks(
  db: SQLite.SQLiteDatabase,
  ordered_ids: string[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < ordered_ids.length; i++) {
      await db.runAsync(
        "UPDATE subtasks SET position = ? WHERE id = ?",
        i,
        ordered_ids[i],
      );
    }
  });
}
