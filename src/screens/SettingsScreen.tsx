import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "../store/useAuthStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { colors, spacing, radius, fontSize } from "../theme";
import { Button } from "../components/ui/Button";
import { Divider } from "../components/ui/Divider";
import { format } from "date-fns";

function Row({
  label,
  value,
  onPress,
  rightElement,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      {rightElement ??
        (value ? <Text style={styles.rowValue}>{value}</Text> : null)}
      {onPress && !rightElement && (
        <Feather name="chevron-right" size={16} color={colors.border.strong} />
      )}
    </Pressable>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { student_id: studentId, logout } = useAuthStore();
  const { autoReminders, setAutoReminders, lastSyncedAt } = useSettingsStore();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setLoggingOut(true);
          try {
            await logout();
          } finally {
            setLoggingOut(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + spacing[4] },
        ]}
      >
        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <View style={styles.card}>
          <Row label="Student ID" value={studentId ?? "—"} />
          <Divider spacing={0} />
          <Row
            label="Last Synced"
            value={
              lastSyncedAt
                ? format(new Date(lastSyncedAt), "MMM d, h:mm a")
                : "Never"
            }
          />
        </View>

        {/* Notifications */}
        <Text style={styles.section}>Notifications</Text>
        <View style={styles.card}>
          <Row
            label="Auto-Reminders"
            rightElement={
              <Switch
                value={autoReminders}
                onValueChange={setAutoReminders}
                trackColor={{
                  false: colors.border.default,
                  true: colors.accent.muted,
                }}
                thumbColor={
                  autoReminders ? colors.accent.default : colors.text.tertiary
                }
              />
            }
          />
        </View>

        {/* About */}
        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <Row label="Version" value="1.0.0" />
        </View>

        {/* Sign out */}
        <Button
          variant="danger"
          label="Sign Out"
          onPress={handleLogout}
          loading={loggingOut}
          style={styles.signOutBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  content: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  section: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing[4],
    marginBottom: spacing[1],
  },
  card: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text.primary,
  },
  rowValue: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    maxWidth: "50%",
    textAlign: "right",
  },
  signOutBtn: {
    marginTop: spacing[6],
  },
});
