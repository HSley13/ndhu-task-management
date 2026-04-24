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

// Configure notification handler and Android channel
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('task-reminders', {
    name: 'Task Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    showBadge: false,
  });
}

function AppInner() {
  const { restoreSession } = useAuthStore();
  const { loadTasks } = useTaskStore();
  const { loadLabels } = useLabelStore();
  const { _loadFromStorage } = useSettingsStore();

  useEffect(() => {
    // Request notification permissions
    Notifications.requestPermissionsAsync().catch(() => {});

    // Navigate to task when notification is tapped
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.['task_id'] as string | undefined;
      if (taskId) useTaskStore.getState().openTaskDetail(taskId);
    });
    return () => sub.remove();
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
