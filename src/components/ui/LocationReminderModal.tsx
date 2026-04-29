import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize } from "../../theme";
import type { LocationReminder } from "../../types";

// ─── radius presets ───────────────────────────────────────────────────────────

const RADIUS_OPTIONS: { label: string; value: number }[] = [
  { label: "100 m", value: 100 },
  { label: "200 m", value: 200 },
  { label: "500 m", value: 500 },
  { label: "1 km", value: 1000 },
];

// ─── props ────────────────────────────────────────────────────────────────────

export interface LocationReminderModalProps {
  visible: boolean;
  onClose: () => void;
  locationReminders: LocationReminder[];
  onAdd: (
    data: Omit<LocationReminder, "id" | "task_id" | "expo_notification_id">,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// ─── component ────────────────────────────────────────────────────────────────

export function LocationReminderModal({
  visible,
  onClose,
  locationReminders,
  onAdd,
  onDelete,
}: LocationReminderModalProps) {
  const [label, setLabel] = useState("");
  const [latStr, setLatStr] = useState("");
  const [lngStr, setLngStr] = useState("");
  const [radius_meters, setRadius] = useState(200);
  const [trigger, setTrigger] = useState<"arrive" | "depart">("arrive");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  const canAdd =
    label.trim().length > 0 &&
    !isNaN(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    !isNaN(lng) &&
    lng >= -180 &&
    lng <= 180;

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Allow location access to use current location.",
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatStr(pos.coords.latitude.toFixed(6));
      setLngStr(pos.coords.longitude.toFixed(6));
      if (!label.trim()) setLabel("Current location");
    } catch {
      Alert.alert("Error", "Could not fetch location.");
    } finally {
      setLocating(false);
    }
  }

  async function handleAdd() {
    if (!canAdd || saving) return;
    setSaving(true);
    try {
      // Request background permission before registering geofence
      const { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== "granted") {
        Alert.alert(
          "Background location needed",
          Platform.OS === "ios"
            ? "Go to Settings → Privacy → Location Services → this app → \"Always\"."
            : "Go to Settings → App → Permissions → Location → \"Allow all the time\".",
        );
        // Still allow adding — geofence will fail silently but data is saved
      }
      await onAdd({ label: label.trim(), latitude: lat, longitude: lng, radius_meters, trigger });
      setLabel("");
      setLatStr("");
      setLngStr("");
      setRadius(200);
      setTrigger("arrive");
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setLabel("");
    setLatStr("");
    setLngStr("");
    setRadius(200);
    setTrigger("arrive");
    setSaving(false);
    setLocating(false);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => { reset(); onClose(); }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Location reminders</Text>
            <Pressable onPress={() => { reset(); onClose(); }} hitSlop={8}>
              <Feather name="x" size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Existing reminders */}
            {locationReminders.length > 0 && (
              <View style={styles.section}>
                {locationReminders.map((lr) => (
                  <View key={lr.id} style={styles.existingRow}>
                    <Feather
                      name="map-pin"
                      size={14}
                      color={colors.accent.default}
                      style={{ marginTop: 1 }}
                    />
                    <View style={styles.existingInfo}>
                      <Text style={styles.existingLabel} numberOfLines={1}>
                        {lr.label}
                      </Text>
                      <Text style={styles.existingMeta}>
                        {lr.trigger === "arrive" ? "On arrival" : "On departure"}{" "}
                        · {lr.radius_meters >= 1000
                          ? `${lr.radius_meters / 1000} km`
                          : `${lr.radius_meters} m`}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => onDelete(lr.id)}
                      hitSlop={8}
                      style={styles.deleteBtn}
                    >
                      <Feather
                        name="trash-2"
                        size={14}
                        color={colors.text.tertiary}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.divider} />

            {/* Add new */}
            <Text style={styles.sectionLabel}>Add location reminder</Text>

            {/* Place name */}
            <TextInput
              style={styles.input}
              placeholder="Place name (e.g. Home, Campus)"
              placeholderTextColor={colors.text.tertiary}
              value={label}
              onChangeText={setLabel}
              returnKeyType="next"
            />

            {/* Lat / Lng row */}
            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Latitude"
                placeholderTextColor={colors.text.tertiary}
                value={latStr}
                onChangeText={setLatStr}
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
              <View style={styles.gap} />
              <TextInput
                style={[styles.input, styles.flex1]}
                placeholder="Longitude"
                placeholderTextColor={colors.text.tertiary}
                value={lngStr}
                onChangeText={setLngStr}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>

            {/* Use current location */}
            <Pressable
              style={styles.locBtn}
              onPress={useCurrentLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.accent.default} />
              ) : (
                <Feather
                  name="crosshair"
                  size={14}
                  color={colors.accent.default}
                />
              )}
              <Text style={styles.locBtnText}>
                {locating ? "Getting location…" : "Use current location"}
              </Text>
            </Pressable>

            {/* Radius selector */}
            <Text style={styles.fieldLabel}>Radius</Text>
            <View style={styles.segmentRow}>
              {RADIUS_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.segment,
                    radius_meters === opt.value && styles.segmentActive,
                  ]}
                  onPress={() => setRadius(opt.value)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      radius_meters === opt.value && styles.segmentTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Trigger toggle */}
            <Text style={styles.fieldLabel}>Notify when</Text>
            <View style={styles.segmentRow}>
              {(["arrive", "depart"] as const).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.segment,
                    styles.segmentWide,
                    trigger === t && styles.segmentActive,
                  ]}
                  onPress={() => setTrigger(t)}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      trigger === t && styles.segmentTextActive,
                    ]}
                  >
                    {t === "arrive" ? "I arrive" : "I leave"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Add button */}
            <Pressable
              style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.addBtnText}>Add reminder</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "90%",
    paddingTop: spacing[4],
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
  },
  title: {
    color: colors.text.primary,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  scroll: { flexGrow: 0 },
  scrollContent: { padding: spacing[5], paddingTop: 0 },
  section: { gap: spacing[2], marginBottom: spacing[3] },
  existingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  existingInfo: { flex: 1 },
  existingLabel: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  existingMeta: {
    color: colors.text.tertiary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  deleteBtn: { padding: spacing[1] },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginBottom: spacing[4],
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing[3],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    color: colors.text.primary,
    fontSize: fontSize.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
  },
  row: { flexDirection: "row" },
  flex1: { flex: 1 },
  gap: { width: spacing[2] },
  locBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    marginBottom: spacing[4],
  },
  locBtnText: {
    color: colors.accent.default,
    fontSize: fontSize.sm,
  },
  fieldLabel: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginBottom: spacing[2],
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  segmentRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.card,
  },
  segmentWide: { flex: 1 },
  segmentActive: {
    borderColor: colors.accent.default,
    backgroundColor: `${colors.accent.default}22`,
  },
  segmentText: {
    color: colors.text.secondary,
    fontSize: fontSize.sm,
  },
  segmentTextActive: {
    color: colors.accent.default,
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: colors.accent.default,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: "center",
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
