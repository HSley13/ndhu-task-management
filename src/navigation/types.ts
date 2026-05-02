import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from "@react-navigation/native";

// ─── Calendar Stack ────────────────────────────────────────────────────────────
export type CalendarStackParamList = {
  Calendar: undefined;
  DayDetail: { date: string };
  NoteEditor: { taskId?: string };
};

// ─── List Stack ────────────────────────────────────────────────────────────────
export type ListStackParamList = {
  List: undefined;
  NoteEditor: { taskId?: string };
};

// ─── Notes Stack ───────────────────────────────────────────────────────────────
export type NotesStackParamList = {
  Notes: undefined;
  NoteEditor: { taskId?: string };
};

// ─── App Tabs ──────────────────────────────────────────────────────────────────
export type AppTabsParamList = {
  CalendarTab: NavigatorScreenParams<CalendarStackParamList>;
  ListTab: NavigatorScreenParams<ListStackParamList>;
  NotesTab: NavigatorScreenParams<NotesStackParamList>;
  StatsTab: undefined;
  SettingsTab: undefined;
};

// ─── Root Navigator ────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Login: undefined;
  App: NavigatorScreenParams<AppTabsParamList>;
};

// ─── Convenience screen prop types ────────────────────────────────────────────
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type AppTabsScreenProps<T extends keyof AppTabsParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<AppTabsParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
