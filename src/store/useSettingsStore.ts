import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const SETTINGS_KEY = "ndhu_settings";

interface SettingsState {
  lastSyncedAt: number | null;
  defaultReminderOffsets: number[];
  autoReminders: boolean;
}

interface SettingsStore extends SettingsState {
  setLastSyncedAt(ts: number): void;
  setDefaultReminderOffsets(offsets: number[]): void;
  setAutoReminders(enabled: boolean): void;
  _loadFromStorage(): Promise<void>;
}

const DEFAULT_STATE: SettingsState = {
  lastSyncedAt: null,
  defaultReminderOffsets: [0, -60, -1440],
  autoReminders: true,
};

async function persistSettings(state: SettingsState): Promise<void> {
  await SecureStore.setItemAsync(SETTINGS_KEY, JSON.stringify(state));
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_STATE,

  setLastSyncedAt(ts) {
    set({ lastSyncedAt: ts });
    persistSettings({ ...get(), lastSyncedAt: ts }).catch(() => undefined);
  },

  setDefaultReminderOffsets(offsets) {
    set({ defaultReminderOffsets: offsets });
    persistSettings({ ...get(), defaultReminderOffsets: offsets }).catch(
      () => undefined,
    );
  },

  setAutoReminders(enabled) {
    set({ autoReminders: enabled });
    persistSettings({ ...get(), autoReminders: enabled }).catch(
      () => undefined,
    );
  },

  async _loadFromStorage() {
    try {
      const raw = await SecureStore.getItemAsync(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SettingsState>;
        set({
          lastSyncedAt: parsed.lastSyncedAt ?? DEFAULT_STATE.lastSyncedAt,
          defaultReminderOffsets:
            parsed.defaultReminderOffsets ??
            DEFAULT_STATE.defaultReminderOffsets,
          autoReminders: parsed.autoReminders ?? DEFAULT_STATE.autoReminders,
        });
      }
    } catch {
      // Use defaults if storage read fails
    }
  },
}));
