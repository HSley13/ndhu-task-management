import * as SQLite from "expo-sqlite";
import { uuidv4 } from "../utils/uuid";
import { format, fromUnixTime } from "date-fns";
import type { Task, RecurRule, RawAssignment, TaskFull } from "../types";
import { getLabelsForTask } from "./labels";
import { getSubtasksForTask } from "./subtasks";
import { getAttachmentsForTask } from "./attachments";
import { getRemindersForTask } from "./reminders";
import { getLocationRemindersForTask } from "./locationReminders";

function rowToTask(row: Record<string, unknown>): Task {
    return {
        id: row["id"] as string,
        title: row["title"] as string,
        course: (row["course"] as string | null) ?? null,
        due_date: (row["due_date"] as string | null) ?? null,
        due_time: (row["due_time"] as string | null) ?? null,
        source: (row["source"] as Task["source"]) ?? "manual",
        status: (row["status"] as Task["status"]) ?? "pending",
        is_pinned: Boolean(row["is_pinned"]),
        is_note: Boolean(row["is_note"]),
        note_content: (row["note_content"] as string | null) ?? null,
        moodle_url: (row["moodle_url"] as string | null) ?? null,
        moodle_event_id: (row["moodle_event_id"] as number | null) ?? null,
        postponed_until: (row["postponed_until"] as string | null) ?? null,
        recur_rule: (row["recur_rule"] as RecurRule | null) ?? null,
        recur_dates: row["recur_dates"]
            ? (JSON.parse(row["recur_dates"] as string) as string[])
            : null,
        effort: (row["effort"] as number | null) ?? 2,
        completed_at: (row["completed_at"] as string | null) ?? null,
        created_at: row["created_at"] as string,
        updated_at: row["updated_at"] as string,
    };
}

export async function insertTask(
    db: SQLite.SQLiteDatabase,
    data: Omit<Task, "id" | "created_at" | "updated_at">,
): Promise<Task> {
    const id = uuidv4();
    const now = new Date().toISOString();
    await db.runAsync(
        `INSERT INTO tasks (id, title, course, due_date, due_time, source, status,
       is_pinned, is_note, note_content, moodle_url, moodle_event_id, postponed_until,
       recur_rule, recur_dates, completed_at, effort, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        data.title,
        data.course ?? null,
        data.due_date ?? null,
        data.due_time ?? null,
        data.source,
        data.status,
        data.is_pinned ? 1 : 0,
        data.is_note ? 1 : 0,
        data.note_content ?? null,
        data.moodle_url ?? null,
        data.moodle_event_id ?? null,
        data.postponed_until ?? null,
        data.recur_rule ?? null,
        data.recur_dates ? JSON.stringify(data.recur_dates) : null,
        data.completed_at ?? null,
        data.effort ?? 2,
        now,
        now,
    );
    const row = await db.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM tasks WHERE id = ?",
        id,
    );
    if (!row) throw new Error("insertTask: row not found after insert");
    return rowToTask(row);
}

export async function updateTask(
    db: SQLite.SQLiteDatabase,
    id: string,
    patch: Partial<Omit<Task, "id" | "created_at">>,
): Promise<Task> {
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: SQLite.SQLiteBindValue[] = [];

    const set = (col: string, val: SQLite.SQLiteBindValue) => {
        fields.push(`${col} = ?`);
        values.push(val);
    };

    if (patch.title !== undefined) set("title", patch.title);
    if (patch.course !== undefined) set("course", patch.course ?? null);
    if (patch.due_date !== undefined) set("due_date", patch.due_date ?? null);
    if (patch.due_time !== undefined) set("due_time", patch.due_time ?? null);
    if (patch.source !== undefined) set("source", patch.source);
    if (patch.status !== undefined) set("status", patch.status);
    if (patch.is_pinned !== undefined) set("is_pinned", patch.is_pinned ? 1 : 0);
    if (patch.is_note !== undefined) set("is_note", patch.is_note ? 1 : 0);
    if (patch.note_content !== undefined)
        set("note_content", patch.note_content ?? null);
    if (patch.moodle_url !== undefined)
        set("moodle_url", patch.moodle_url ?? null);
    if (patch.moodle_event_id !== undefined)
        set("moodle_event_id", patch.moodle_event_id ?? null);
    if (patch.postponed_until !== undefined)
        set("postponed_until", patch.postponed_until ?? null);
    if (patch.recur_rule !== undefined) set("recur_rule", patch.recur_rule ?? null);
    if (patch.recur_dates !== undefined)
        set("recur_dates", patch.recur_dates ? JSON.stringify(patch.recur_dates) : null);
    if (patch.completed_at !== undefined) set("completed_at", patch.completed_at ?? null);
    if (patch.effort !== undefined) set("effort", patch.effort);
    if (patch.updated_at !== undefined) set("updated_at", patch.updated_at);
    else set("updated_at", now);

    if (fields.length === 0) {
        const existing = await getTaskById(db, id);
        if (!existing) throw new Error("updateTask: task not found");
        return existing;
    }

    values.push(id);
    await db.runAsync(
        `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
        ...values,
    );
    const row = await db.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM tasks WHERE id = ?",
        id,
    );
    if (!row) throw new Error("updateTask: row not found after update");
    return rowToTask(row);
}

export async function deleteTask(
    db: SQLite.SQLiteDatabase,
    id: string,
): Promise<void> {
    await db.runAsync("DELETE FROM tasks WHERE id = ?", id);
}

export async function getTaskById(
    db: SQLite.SQLiteDatabase,
    id: string,
): Promise<Task | null> {
    const row = await db.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM tasks WHERE id = ?",
        id,
    );
    return row ? rowToTask(row) : null;
}

export async function getAllTasks(db: SQLite.SQLiteDatabase): Promise<Task[]> {
    const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM tasks
     ORDER BY is_pinned DESC, due_date ASC NULLS LAST, created_at ASC`,
    );
    return rows.map(rowToTask);
}

export async function getTasksByDateRange(
    db: SQLite.SQLiteDatabase,
    start: string,
    end: string,
): Promise<Task[]> {
    const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM tasks
     WHERE due_date >= ? AND due_date <= ?
     ORDER BY due_date ASC, due_time ASC NULLS LAST`,
        start,
        end,
    );
    return rows.map(rowToTask);
}

export async function getTasksDueOn(
    db: SQLite.SQLiteDatabase,
    date: string,
): Promise<Task[]> {
    const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM tasks
     WHERE due_date = ?
     ORDER BY is_pinned DESC, due_time ASC NULLS LAST`,
        date,
    );
    return rows.map(rowToTask);
}

export async function searchTasks(
    db: SQLite.SQLiteDatabase,
    query: string,
): Promise<Task[]> {
    const like = `%${query}%`;
    const rows = await db.getAllAsync<Record<string, unknown>>(
        `SELECT * FROM tasks
     WHERE title LIKE ? OR course LIKE ?
     ORDER BY is_pinned DESC, due_date ASC NULLS LAST`,
        like,
        like,
    );
    return rows.map(rowToTask);
}

export async function upsertMoodleTask(
    db: SQLite.SQLiteDatabase,
    raw: RawAssignment,
): Promise<{ task: Task; isNew: boolean }> {
    const dueDate = format(fromUnixTime(raw.due_unix), "yyyy-MM-dd");
    const dueTime = format(fromUnixTime(raw.due_unix), "HH:mm");
    const now = new Date().toISOString();
    const id = uuidv4();

    // Try insert first
    const result = await db.runAsync(
        `INSERT OR IGNORE INTO tasks
       (id, title, course, due_date, due_time, source, status,
        is_pinned, is_note, moodle_url, moodle_event_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'moodle', 'pending', 0, 0, ?, ?, ?, ?)`,
        id,
        raw.name,
        raw.course,
        dueDate,
        dueTime,
        raw.url,
        raw.id,
        now,
        now,
    );

    if (result.changes > 0) {
        const row = await db.getFirstAsync<Record<string, unknown>>(
            "SELECT * FROM tasks WHERE id = ?",
            id,
        );
        if (!row)
            throw new Error("upsertMoodleTask: insert succeeded but row not found");
        return { task: rowToTask(row), isNew: true };
    }

    // Row already exists — update mutable fields if changed
    await db.runAsync(
        `UPDATE tasks
     SET title = ?, course = ?, due_date = ?, due_time = ?, moodle_url = ?, updated_at = ?
     WHERE moodle_event_id = ?`,
        raw.name,
        raw.course,
        dueDate,
        dueTime,
        raw.url,
        now,
        raw.id,
    );
    const row = await db.getFirstAsync<Record<string, unknown>>(
        "SELECT * FROM tasks WHERE moodle_event_id = ?",
        raw.id,
    );
    if (!row) throw new Error("upsertMoodleTask: row not found after update");
    return { task: rowToTask(row), isNew: false };
}

export async function getTaskWithRelations(
    db: SQLite.SQLiteDatabase,
    id: string,
): Promise<TaskFull> {
    const [task, labels, subtasks, attachments, reminders, location_reminders] =
        await Promise.all([
            getTaskById(db, id),
            getLabelsForTask(db, id),
            getSubtasksForTask(db, id),
            getAttachmentsForTask(db, id),
            getRemindersForTask(db, id),
            getLocationRemindersForTask(db, id),
        ]);
    if (!task) throw new Error(`getTaskWithRelations: task ${id} not found`);
    return { ...task, labels, subtasks, attachments, reminders, location_reminders };
}
