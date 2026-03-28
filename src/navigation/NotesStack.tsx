import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotesScreen } from '../screens/NotesScreen';
import { NoteEditorScreen } from '../components/sheets/NoteEditorScreen';
import type { NotesStackParamList } from './types';

const Stack = createNativeStackNavigator<NotesStackParamList>();

export function NotesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Notes" component={NotesScreen} />
      <Stack.Screen
        name="NoteEditor"
        component={NoteEditorScreen}
        options={{ presentation: 'modal', gestureEnabled: true }}
      />
    </Stack.Navigator>
  );
}
