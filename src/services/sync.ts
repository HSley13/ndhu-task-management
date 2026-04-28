import { format, fromUnixTime } from "date-fns";
import { getAssignments, ApiError } from "./api";
import { useTaskStore } from "../store/useTaskStore";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import type { RawAssignment } from "../types";

export function shouldSync(lastSyncedAt: number | null): boolean {
  return !lastSyncedAt || Date.now() - lastSyncedAt > 12 * 60 * 60 * 1000;
}

function showToast(message: string): void {
  // Deferred import to avoid circular dep — ToastProvider is a React context
  // We use a global emitter instead
  import("../hooks/useToast")
    .then(({ toastEmitter }) => {
      toastEmitter.emit("show", { message, type: "info" });
    })
    .catch(() => undefined);
}

export async function syncAssignments(
  jwt: string,
): Promise<{ new_count: number; updated_count: number }> {
  try {
    const settings = useSettingsStore.getState();
    const since = settings.lastSyncedAt ?? undefined;

    const { assignments, last_synced } = await getAssignments(jwt, since);

    let newCount = 0;
    let updatedCount = 0;

    const store = useTaskStore.getState();
    for (const raw of assignments) {
      const { isNew } = await store.upsertMoodleTask(raw);
      if (isNew) {
        newCount++;
        if (settings.autoReminders) {
          // Schedule reminders for newly added tasks
          const task = store.tasks.find((t) => t.moodle_event_id === raw.id);
          if (task) {
            const { scheduleRemindersForTask } =
              await import("./notifications");
            await scheduleRemindersForTask(
              task,
              settings.defaultReminderOffsets,
            );
          }
        }
      } else {
        updatedCount++;
      }
    }

    useSettingsStore.getState().setLastSyncedAt(Date.now());
    await useTaskStore.getState().loadTasks();

    return { new_count: newCount, updated_count: updatedCount };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.isRevoked) {
        useAuthStore.getState().handleRevocation();
        return { new_count: 0, updated_count: 0 };
      }
      if (e.status === 503) {
        showToast("Moodle unavailable, using cached data");
        return { new_count: 0, updated_count: 0 };
      }
    }
    console.error("[sync] syncAssignments error:", e);
    showToast("Sync failed");
    return { new_count: 0, updated_count: 0 };
  }
}
