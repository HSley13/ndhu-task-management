import * as SQLite from "expo-sqlite";
import { uuidv4 } from "../utils/uuid";
import type { Attachment } from "../types";

function rowToAttachment(row: Record<string, unknown>): Attachment {
  return {
    id: row["id"] as string,
    task_id: row["task_id"] as string,
    uri: row["uri"] as string,
    name: row["name"] as string,
    mime_type: row["mime_type"] as string,
    size_bytes: row["size_bytes"] as number,
  };
}

export async function getAttachmentsForTask(
  db: SQLite.SQLiteDatabase,
  task_id: string,
): Promise<Attachment[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    "SELECT * FROM attachments WHERE task_id = ? ORDER BY rowid ASC",
    task_id,
  );
  return rows.map(rowToAttachment);
}

export async function insertAttachment(
  db: SQLite.SQLiteDatabase,
  data: Omit<Attachment, "id">,
): Promise<Attachment> {
  const id = uuidv4();
  await db.runAsync(
    `INSERT INTO attachments (id, task_id, uri, name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    data.task_id,
    data.uri,
    data.name,
    data.mime_type,
    data.size_bytes,
  );
  const row = await db.getFirstAsync<Record<string, unknown>>(
    "SELECT * FROM attachments WHERE id = ?",
    id,
  );
  if (!row) throw new Error("insertAttachment: row not found after insert");
  return rowToAttachment(row);
}

export async function deleteAttachment(
  db: SQLite.SQLiteDatabase,
  id: string,
): Promise<void> {
  await db.runAsync("DELETE FROM attachments WHERE id = ?", id);
}
