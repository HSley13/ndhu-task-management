import {
  format,
  formatRelative,
  isToday,
  isTomorrow,
  differenceInDays,
  parseISO,
  isAfter,
  startOfDay,
  addDays,
  endOfDay,
  startOfWeek,
  endOfWeek,
  parse,
} from 'date-fns';
import type { Task } from '../types';

export function formatDueDate(date: string): string {
  const d = parseISO(date);
  if (isToday(d)) return 'Today';
  if (isTomorrow(d)) return 'Tomorrow';
  return format(d, 'MMM d');
}

export function formatDueTime(time: string): string {
  // stored as 'HH:mm:ss' — strip seconds if present before parsing
  const normalized = time.length > 5 ? time.slice(0, 5) : time;
  const d = parse(normalized, 'HH:mm', new Date());
  return format(d, 'h:mm a');
}

export function formatRelativeDue(date: string, time: string | null): string {
  const normalizedTime = time ? (time.length > 5 ? time.slice(0, 5) : time) : null;
  const d = normalizedTime
    ? parse(`${date} ${normalizedTime}`, 'yyyy-MM-dd HH:mm', new Date())
    : parseISO(date);
  const now = new Date();

  if (isToday(d)) {
    return time ? `Today at ${format(d, 'h:mm a')}` : 'Today';
  }
  if (isTomorrow(d)) {
    return time ? `Tomorrow at ${format(d, 'h:mm a')}` : 'Tomorrow';
  }

  const diff = differenceInDays(startOfDay(d), startOfDay(now));
  if (diff > 0 && diff <= 6) return `In ${diff} day${diff === 1 ? '' : 's'}`;
  if (diff < 0) return `Overdue · ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago`;

  return format(d, 'MMM d');
}

export function isOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  if (task.status === 'done') return false;
  const normalizedTime = task.due_time
    ? (task.due_time.length > 5 ? task.due_time.slice(0, 5) : task.due_time)
    : null;
  const d = normalizedTime
    ? parse(`${task.due_date} ${normalizedTime}`, 'yyyy-MM-dd HH:mm', new Date())
    : endOfDay(parseISO(task.due_date));
  return isAfter(new Date(), d);
}

export function groupTasksBySection(
  tasks: Task[],
): Record<'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later', Task[]> {
  const result: Record<'overdue' | 'today' | 'tomorrow' | 'this_week' | 'later', Task[]> = {
    overdue:   [],
    today:     [],
    tomorrow:  [],
    this_week: [],
    later:     [],
  };

  const now = new Date();
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const tomorrowDate = addDays(startOfDay(now), 1);

  for (const task of tasks) {
    if (!task.due_date) {
      result.later.push(task);
      continue;
    }
    const d = parseISO(task.due_date);

    if (isOverdue(task)) {
      result.overdue.push(task);
    } else if (isToday(d)) {
      result.today.push(task);
    } else if (isTomorrow(d)) {
      result.tomorrow.push(task);
    } else if (isAfter(weekEnd, d) || d <= weekEnd) {
      result.this_week.push(task);
    } else {
      result.later.push(task);
    }
  }

  return result;
}
