import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NavigationContainer } from '@react-navigation/native';
import { SQLiteProvider } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { runMigrations } from './src/db/client';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ToastProvider } from './src/hooks/useToast';
import { useAuthStore } from './src/store/useAuthStore';
import { useTaskStore } from './src/store/useTaskStore';
import { useLabelStore } from './src/store/useLabelStore';
import { useSettingsStore } from './src/store/useSettingsStore';
import { rescheduleAllReminders } from './src/services/notifications';
import { colors } from './src/theme';

// Configure notification handler (shown while app is foregrounded)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppInner() {
  const { restoreSession } = useAuthStore();
  const { loadTasks } = useTaskStore();
  const { loadLabels } = useLabelStore();
  const { _loadFromStorage } = useSettingsStore();

  useEffect(() => {
    // Request notification permissions
    Notifications.requestPermissionsAsync().catch(() => {});

    // Bootstrap
    (async () => {
      await _loadFromStorage();
      await restoreSession();
      await Promise.all([loadTasks(), loadLabels()]);
      rescheduleAllReminders().catch(() => {});
    })();

    // Notification response listener — navigate to task when tapped
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.['task_id'] as string | undefined;
      if (taskId) {
        useTaskStore.getState().openTaskDetail(taskId);
      }
    });
    return () => sub.remove();
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
        <SQLiteProvider databaseName="ndhu.db" onInit={runMigrations}>
          <BottomSheetModalProvider>
            <ToastProvider>
              <AppInner />
            </ToastProvider>
          </BottomSheetModalProvider>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
