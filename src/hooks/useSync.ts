import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { syncAssignments, shouldSync } from "../services/sync";

export function useSync(): {
  progressStyle: ReturnType<typeof useAnimatedStyle>;
} {
  const progressWidth = useSharedValue(0);
  const isSyncing = useRef(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%` as unknown as number,
    height: 2,
    backgroundColor: "#6C63FF",
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 9999,
  }));

  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      async (nextState) => {
        const wasBackground =
          appState.current === "background" || appState.current === "inactive";
        appState.current = nextState;

        if (nextState === "active" && wasBackground) {
          const { jwt } = useAuthStore.getState();
          const { lastSyncedAt } = useSettingsStore.getState();

          if (!jwt || !shouldSync(lastSyncedAt) || isSyncing.current) return;

          isSyncing.current = true;
          progressWidth.value = withTiming(80, { duration: 2000 });

          try {
            await syncAssignments(jwt);
          } finally {
            progressWidth.value = withTiming(100, { duration: 300 });
            setTimeout(() => {
              progressWidth.value = withTiming(0, { duration: 200 });
              isSyncing.current = false;
            }, 500);
          }
        }
      },
    );

    return () => subscription.remove();
  }, []);

  return { progressStyle };
}
