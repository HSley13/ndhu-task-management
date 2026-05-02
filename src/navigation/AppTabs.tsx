import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { Platform, View } from "react-native";
import { BlurView } from "expo-blur";
import { CalendarStack } from "./CalendarStack";
import { ListStack } from "./ListStack";
import { NotesStack } from "./NotesStack";
import { SettingsScreen } from "../screens/SettingsScreen";
import { StatsScreen } from "../screens/StatsScreen";
import { colors, radius, spacing } from "../theme";
import type { AppTabsParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabsParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent.default,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          position: "absolute",
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={80}
              tint="dark"
              style={{
                flex: 1,
                borderTopWidth: 1,
                borderTopColor: colors.border.subtle,
                borderRadius: 0,
              }}
            />
          ) : (
            <View
              style={{
                flex: 1,
                backgroundColor: colors.bg.surface + "F0",
                borderTopWidth: 1,
                borderTopColor: colors.border.subtle,
              }}
            />
          ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 6 : 8,
        },
        tabBarItemStyle: {
          paddingTop: 4,
          paddingBottom: 6,
        },
      }}
    >
      <Tab.Screen
        name="CalendarTab"
        component={CalendarStack}
        options={{
          tabBarLabel: "Calendar",
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ListTab"
        component={ListStack}
        options={{
          tabBarLabel: "Tasks",
          tabBarIcon: ({ color, size }) => (
            <Feather name="check-square" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="NotesTab"
        component={NotesStack}
        options={{
          tabBarLabel: "Notes",
          tabBarIcon: ({ color, size }) => (
            <Feather name="file-text" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={StatsScreen}
        options={{
          tabBarLabel: "Stats",
          tabBarIcon: ({ color, size }) => (
            <Feather name="bar-chart-2" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Feather name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
