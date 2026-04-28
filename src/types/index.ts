export type TaskSource = "moodle" | "manual";
export type TaskStatus = "pending" | "done" | "postponed";
export type CalendarView = "month" | "week" | "day" | "year" | "list";

export interface Task {
  id: string;
  title: string;
  course: string | null;
  due_date: string | null; // 'YYYY-MM-DD'
  due_time: string | null; // 'HH:MM' 24h
  source: TaskSource;
  status: TaskStatus;
  is_pinned: boolean;
  is_note: boolean;
  note_content: string | null; // Markdown
  moodle_url: string | null;
  moodle_event_id: number | null;
  postponed_until: string | null; // ISO 8601
  created_at: string;
  updated_at: string;
}

export interface Label {
  id: string;
  name: string;
  color: string; // hex
}

export interface TaskLabel {
  task_id: string;
  label_id: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Attachment {
  id: string;
  task_id: string;
  uri: string; // local file URI
  name: string;
  mime_type: string;
  size_bytes: number;
}

export interface Reminder {
  id: string;
  task_id: string;
  offset_minutes: number; // negative = before due. -30 = 30min early
  scheduled_at: string; // ISO 8601 computed fire time
  expo_notification_id: string | null;
  delivered: boolean;
}

export interface TaskFull extends Task {
  labels: Label[];
  subtasks: Subtask[];
  attachments: Attachment[];
  reminders: Reminder[];
}

// Shape of assignment data returned by the backend server
export interface RawAssignment {
  id: number; // moodle_event_id
  name: string; // activityname
  course: string; // course.fullname
  due_unix: number; // timesort Unix timestamp
  url: string;
}

export type PostponeOption =
  | { type: "minutes"; value: number; label: string }
  | { type: "time_today"; hour: number; label: string }
  | { type: "time_tomorrow"; hour: number; label: string }
  | { type: "next_week"; label: string }
  | { type: "custom"; label: string };
