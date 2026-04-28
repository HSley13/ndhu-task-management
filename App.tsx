import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Notifications } from './src/services/notificationsShim';

import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastProvider } from './src/hooks/useToast';
import { useAuthStore } from './src/store/useAuthStore';
import { useTaskStore } from './src/store/useTaskStore';
import { useLabelStore } from './src/store/useLabelStore';
import { useSettingsStore } from './src/store/useSettingsStore';
import { rescheduleAllReminders } from './src/services/notifications';
import { colors } from './src/theme';

// Configure notification handler — controls foreground behaviour
Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Set up the Android channel and request permissions on all platforms. */
async function initNotifications(): Promise<void> {
  if (!Notifications) return; // web — not supported

  // Android 8+ requires a channel; must exist before any notification fires.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'Task Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      showBadge: false,
    });
  }

  // iOS and Android 13+ (API 33+) both require explicit permission.
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing !== 'granted') {
    await Notifications.requestPermissionsAsync();
  }
}

function AppInner() {
  const { restoreSession } = useAuthStore();
  const { loadTasks } = useTaskStore();
  const { loadLabels } = useLabelStore();
  const { _loadFromStorage } = useSettingsStore();

  useEffect(() => {
    // Set up channel + permissions; non-fatal if it fails (e.g. web).
    initNotifications().catch(() => {});

    // Navigate to task when a notification is tapped.
    const sub = Notifications?.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.['task_id'] as string | undefined;
      if (taskId) useTaskStore.getState().openTaskDetail(taskId);
    });
    return () => sub?.remove();
  }, []);

  useEffect(() => {
    // Bootstrap
    (async () => {
      await _loadFromStorage();
      await restoreSession();
      await Promise.all([loadTasks(), loadLabels()]);
      rescheduleAllReminders().catch(() => {});
    })();
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={colors.bg.base} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <ToastProvider>
            <AppInner />
          </ToastProvider>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
