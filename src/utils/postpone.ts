import {
  addMinutes,
  setHours,
  setMinutes,
  setSeconds,
  startOfTomorrow,
  isAfter,
  format,
  isToday,
  isTomorrow,
} from 'date-fns';
import type { PostponeOption } from '../types';

export const DEFAULT_POSTPONE_OPTIONS: PostponeOption[] = [
  { type: 'minutes',       value: 60,  label: 'In 1 hour' },
  { type: 'time_today',    hour: 9,    label: 'This morning' },
  { type: 'time_today',    hour: 18,   label: 'This evening' },
  { type: 'time_tomorrow', hour: 9,    label: 'Tomorrow morning' },
  { type: 'time_tomorrow', hour: 18,   label: 'Tomorrow evening' },
  { type: 'custom',                    label: 'Pick a time...' },
];

export function computePostponeDate(
  option: PostponeOption,
  customDate?: Date,
): Date {
  const now = new Date();

  switch (option.type) {
    case 'minutes':
      return addMinutes(now, option.value);

    case 'time_today': {
      const candidate = setSeconds(setMinutes(setHours(now, option.hour), 0), 0);
      if (isAfter(candidate, now)) return candidate;
      // Past → use tomorrow
      return setSeconds(setMinutes(setHours(startOfTomorrow(), option.hour), 0), 0);
    }

    case 'time_tomorrow':
      return setSeconds(setMinutes(setHours(startOfTomorrow(), option.hour), 0), 0);

    case 'custom':
      if (!customDate) throw new Error('customDate required for custom postpone option');
      return customDate;
  }
}

export function formatPostponeTarget(date: Date): string {
  if (isToday(date))    return `Today at ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`;
  return format(date, 'EEE, MMM d \'at\' h:mm a');
}
