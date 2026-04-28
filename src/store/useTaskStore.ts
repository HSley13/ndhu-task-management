import { create } from "zustand";
import type {
  Task,
  TaskFull,
  RawAssignment,
  Attachment,
  Subtask,
} from "../types";
import { getDb } from "../db/client";
import * as tasksDb from "../db/tasks";
import * as labelsDb from "../db/labels";
import * as subtasksDb from "../db/subtasks";
import * as attachmentsDb from "../db/attachments";
import * as remindersDb from "../db/reminders";

interface TaskStore {
  tasks: Task[];
  openTask: TaskFull | null;
  isLoading: boolean;
  error: string | null;

  loadTasks(): Promise<void>;
  addTask(data: Omit<Task, "id" | "created_at" | "updated_at">): Promise<Task>;
  updateTask(id: string, patch: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;
  toggleDone(id: string): Promise<void>;
  togglePin(id: string): Promise<void>;
  postponeTask(id: string, due_date: string, due_time: string): Promise<void>;
  openTaskDetail(id: string): Promise<void>;
  closeTaskDetail(): void;
  upsertMoodleTask(raw: RawAssignment): Promise<{ isNew: boolean }>;

  addSubtask(task_id: string, title: string): Promise<void>;
  toggleSubtask(subtask_id: string): Promise<void>;
  deleteSubtask(subtask_id: string): Promise<void>;

  setTaskLabels(task_id: string, label_ids: string[]): Promise<void>;

  addAttachment(
    task_id: string,
    attachment: Omit<Attachment, "id">,
  ): Promise<void>;
  deleteAttachment(attachment_id: string): Promise<void>;

  addReminder(task_id: string, offset_minutes: number): Promise<void>;
  deleteReminderByOffset(task_id: string, offset_minutes: number): Promise<void>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  openTask: null,
  isLoading: false,
  error: null,

  async loadTasks() {
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();
      const tasks = await tasksDb.getAllTasks(db);
      set({ tasks, isLoading: false });
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message });
    }
  },

  async addTask(data) {
    const db = await getDb();
    const task = await tasksDb.insertTask(db, data);
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  async updateTask(id, patch) {
    const db = await getDb();
    const updated = await tasksDb.updateTask(db, id, patch);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
      openTask:
        s.openTask?.id === id ? { ...s.openTask, ...updated } : s.openTask,
    }));
  },

  async deleteTask(id) {
    const db = await getDb();
    await tasksDb.deleteTask(db, id);
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      openTask: s.openTask?.id === id ? null : s.openTask,
    }));
  },

  async toggleDone(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus: Task["status"] =
      task.status === "done" ? "pending" : "done";
    if (newStatus === "done") {
      const { cancelRemindersForTask } = await import(
        "../services/notifications"
      );
      await cancelRemindersForTask(id).catch(() => {});
    }
    await get().updateTask(id, { status: newStatus });
  },

  async togglePin(id) {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    await get().updateTask(id, { is_pinned: !task.is_pinned });
  },

  async postponeTask(id, due_date, due_time) {
    // Preserve existing reminder offsets, cancel them, then re-schedule for new time
    const db = await getDb();
    const existingReminders = await remindersDb.getRemindersForTask(db, id);
    const offsets = [
      ...new Set(existingReminders.map((r) => r.offset_minutes)),
    ];
    const { cancelRemindersForTask, scheduleRemindersForTask } = await import(
      "../services/notifications"
    );
    await cancelRemindersForTask(id).catch(() => {});
    await get().updateTask(id, { due_date, due_time, status: "postponed" });
    if (offsets.length > 0) {
      const updatedTask = get().tasks.find((t) => t.id === id);
      if (updatedTask) {
        await scheduleRemindersForTask(updatedTask, offsets).catch(() => {});
        await get().openTaskDetail(id);
      }
    }
  },

  async openTaskDetail(id) {
    const db = await getDb();
    const full = await tasksDb.getTaskWithRelations(db, id);
    set({ openTask: full });
  },

  closeTaskDetail() {
    set({ openTask: null });
  },

  async upsertMoodleTask(raw) {
    const db = await getDb();
    const { task, isNew } = await tasksDb.upsertMoodleTask(db, raw);
    if (isNew) {
      set((s) => ({ tasks: [task, ...s.tasks] }));
    } else {
      set((s) => ({
        tasks: s.tasks.map((t) => (t.moodle_event_id === raw.id ? task : t)),
      }));
    }
    return { isNew };
  },

  async addSubtask(task_id, title) {
    const db = await getDb();
    const subtask = await subtasksDb.insertSubtask(db, task_id, title);
    set((s) => {
      if (!s.openTask || s.openTask.id !== task_id) return s;
      return {
        openTask: {
          ...s.openTask,
          subtasks: [...s.openTask.subtasks, subtask],
        },
      };
    });
  },

  async toggleSubtask(subtask_id) {
    const { openTask } = get();
    const subtask = openTask?.subtasks.find((st) => st.id === subtask_id);
    if (!subtask) return;
    const db = await getDb();
    const updated = await subtasksDb.updateSubtask(db, subtask_id, {
      done: !subtask.done,
    });
    set((s) => {
      if (!s.openTask) return s;
      return {
        openTask: {
          ...s.openTask,
          subtasks: s.openTask.subtasks.map((st) =>
            st.id === subtask_id ? updated : st,
          ),
        },
      };
    });
  },

  async deleteSubtask(subtask_id) {
    const db = await getDb();
    await subtasksDb.deleteSubtask(db, subtask_id);
    set((s) => {
      if (!s.openTask) return s;
      return {
        openTask: {
          ...s.openTask,
          subtasks: s.openTask.subtasks.filter((st) => st.id !== subtask_id),
        },
      };
    });
  },

  async setTaskLabels(task_id, label_ids) {
    const db = await getDb();
    await labelsDb.setLabelsForTask(db, task_id, label_ids);
    const newLabels = await labelsDb.getLabelsForTask(db, task_id);
    set((s) => {
      if (!s.openTask || s.openTask.id !== task_id) return s;
      return { openTask: { ...s.openTask, labels: newLabels } };
    });
  },

  async addAttachment(task_id, attachment) {
    const db = await getDb();
    const att = await attachmentsDb.insertAttachment(db, attachment);
    set((s) => {
      if (!s.openTask || s.openTask.id !== task_id) return s;
      return {
        openTask: {
          ...s.openTask,
          attachments: [...s.openTask.attachments, att],
        },
      };
    });
  },

  async deleteAttachment(attachment_id) {
    const db = await getDb();
    await attachmentsDb.deleteAttachment(db, attachment_id);
    set((s) => {
      if (!s.openTask) return s;
      return {
        openTask: {
          ...s.openTask,
          attachments: s.openTask.attachments.filter(
            (a) => a.id !== attachment_id,
          ),
        },
      };
    });
  },

  async addReminder(task_id, offset_minutes) {
    const db = await getDb();
    const task = get().tasks.find((t) => t.id === task_id);
    if (!task) return;
    const { scheduleRemindersForTask } =
      await import("../services/notifications");
    const created = await scheduleRemindersForTask(task, [offset_minutes]);
    set((s) => {
      if (!s.openTask || s.openTask.id !== task_id) return s;
      return {
        openTask: {
          ...s.openTask,
          reminders: [...s.openTask.reminders, ...created],
        },
      };
    });
  },

  async deleteReminderByOffset(task_id, offset_minutes) {
    const db = await getDb();
    const { Notifications } = await import("../services/notificationsShim");
    const all = await remindersDb.getRemindersForTask(db, task_id);
    const toCancel = all.filter((r) => r.offset_minutes === offset_minutes);
    for (const r of toCancel) {
      if (r.expo_notification_id && Notifications) {
        await Notifications.cancelScheduledNotificationAsync(
          r.expo_notification_id,
        ).catch(() => {});
      }
    }
    await remindersDb.deleteRemindersByOffset(db, task_id, offset_minutes);
    set((s) => {
      if (!s.openTask || s.openTask.id !== task_id) return s;
      return {
        openTask: {
          ...s.openTask,
          reminders: s.openTask.reminders.filter(
            (r) => r.offset_minutes !== offset_minutes,
          ),
        },
      };
    });
  },
}));
