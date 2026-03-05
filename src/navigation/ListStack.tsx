import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ListScreen } from '../screens/ListScreen';
import { NoteEditorScreen } from '../components/sheets/NoteEditorScreen';
import type { ListStackParamList } from './types';

const Stack = createNativeStackNavigator<ListStackParamList>();

export function ListStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="List" component={ListScreen} />
      <Stack.Screen
        name="NoteEditor"
        component={NoteEditorScreen}
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}
