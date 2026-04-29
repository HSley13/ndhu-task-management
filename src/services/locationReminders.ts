/**
 * Location-based reminder service.
 *
 * Uses expo-location geofencing + expo-task-manager to fire local notifications
 * when the user enters or exits a defined region.
 *
 * IMPORTANT: TaskManager.defineTask MUST be called at module top-level.
 * Import this file once near the app entry point so the task is registered
 * before any background event could fire.
 */
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import type { LocationReminder } from "../types";

export const GEOFENCE_TASK = "NDHU_GEOFENCE_TASK";

// ─── background task definition ───────────────────────────────────────────────

TaskManager.defineTask(
  GEOFENCE_TASK,
  async ({
    data,
    error,
  }: {
    data: { eventType: Location.GeofencingEventType; region: Location.LocationRegion };
    error: TaskManager.TaskManagerError | null;
  }) => {
    if (error) {
      console.warn("[geofence] task error:", error.message);
      return;
    }

    const { eventType, region } = data;
    const isArrive = eventType === Location.GeofencingEventType.Enter;
    const isDepart = eventType === Location.GeofencingEventType.Exit;

    if (!isArrive && !isDepart) return;
    if (!region.identifier) return;

    // identifier format: "<locationReminderId>:<trigger>:<label>"
    const [, trigger, ...labelParts] = region.identifier.split(":");
    const label = labelParts.join(":");

    if ((trigger === "arrive" && isArrive) || (trigger === "depart" && isDepart)) {
      // Dynamically import to avoid circular deps / ensure this works in background
      const { Notifications } = await import("./notificationsShim");
      if (Notifications) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📍 Location reminder`,
            body: label,
            data: { locationReminderId: region.identifier.split(":")[0] },
          },
          trigger: null, // fire immediately
        });
      }
    }
  },
);

// ─── permission helpers ────────────────────────────────────────────────────────

export async function requestLocationPermissions(): Promise<boolean> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== "granted") return false;
  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  return bg === "granted";
}

export async function hasSufficientLocationPermission(): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== "granted") return false;
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === "granted";
}

// ─── geofence management ──────────────────────────────────────────────────────

/**
 * Refresh the geofencing region list to match the given location_reminders.
 * Expo replaces all existing regions registered under GEOFENCE_TASK.
 */
export async function syncGeofencesForTask(
  taskId: string,
  locationReminders: LocationReminder[],
  allTaskLocationReminders: LocationReminder[],
): Promise<void> {
  // Build the full set of regions: remove old ones for this task, keep others
  const others = allTaskLocationReminders.filter((lr) => lr.task_id !== taskId);
  const combined = [...others, ...locationReminders];
  await applyGeofences(combined);
}

export async function applyGeofences(
  locationReminders: LocationReminder[],
): Promise<void> {
  if (locationReminders.length === 0) {
    const active = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
    if (active) {
      await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});
    }
    return;
  }

  const hasPermission = await hasSufficientLocationPermission();
  if (!hasPermission) {
    console.warn("[geofence] insufficient permissions — skipping geofence sync");
    return;
  }

  const regions: Location.LocationRegion[] = locationReminders.map((lr) => ({
    identifier: `${lr.id}:${lr.trigger}:${lr.label}`,
    latitude: lr.latitude,
    longitude: lr.longitude,
    radius: lr.radius_meters,
    notifyOnEnter: lr.trigger === "arrive",
    notifyOnExit: lr.trigger === "depart",
  }));

  await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
}
