import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { Feather } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize } from "../../theme";
import type { LocationReminder } from "../../types";
import { MapPickerModal } from "./MapPickerModal";

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
  const [showMap, setShowMap] = useState(false);
  const [stagedLat, setStagedLat] = useState<number | null>(null);
  const [stagedLng, setStagedLng] = useState<number | null>(null);
  const [stagedLabel, setStagedLabel] = useState("");
  const [radius_meters, setRadius] = useState(200);
  const [trigger, setTrigger] = useState<"arrive" | "depart">("arrive");
  const [saving, setSaving] = useState(false);

  const hasLocation = stagedLat !== null && stagedLng !== null;

  function handleMapConfirm(lat: number, lng: number, label: string) {
    setStagedLat(lat);
    setStagedLng(lng);
    setStagedLabel(label);
  }

  async function handleAdd() {
    if (!hasLocation || saving) return;
    setSaving(true);
    try {
      try {
        const { status: bgStatus } =
          await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== "granted") {
          Alert.alert(
            "Background location needed",
            Platform.OS === "ios"
              ? 'Go to Settings → Privacy → Location Services → this app → "Always".'
              : 'Go to Settings → App → Permissions → Location → "Allow all the time".',
          );
        }
      } catch {
        // Permission API unavailable (e.g. simulator); proceed without check
      }
      await onAdd({
        label: stagedLabel || "Selected location",
        latitude: stagedLat!,
        longitude: stagedLng!,
        radius_meters,
        trigger,
      });
      setStagedLat(null);
      setStagedLng(null);
      setStagedLabel("");
      setRadius(200);
      setTrigger("arrive");
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setStagedLat(null);
    setStagedLng(null);
    setStagedLabel("");
    setRadius(200);
    setTrigger("arrive");
    setSaving(false);
    setShowMap(false);
  }

  return (
    <>
      <Modal
        visible={visible && !showMap}
        transparent
        animationType="fade"
        onRequestClose={() => {
          reset();
          onClose();
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* ── Header ── */}
            <View style={styles.header}>
              <Text style={styles.title}>Location reminders</Text>
              <Pressable
                onPress={() => {
                  reset();
                  onClose();
                }}
                hitSlop={8}
              >
                <Feather name="x" size={20} color={colors.text.secondary} />
              </Pressable>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              {/* ── Existing reminders ── */}
              {locationReminders.length > 0 && (
                <>
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
                          {lr.trigger === "arrive"
                            ? "On arrival"
                            : "On departure"}
                          {" · "}
                          {lr.radius_meters >= 1000
                            ? `${lr.radius_meters / 1000} km`
                            : `${lr.radius_meters} m`}
                        </Text>
                      </View>
                      <Pressable onPress={() => onDelete(lr.id)} hitSlop={8}>
                        <Feather
                          name="trash-2"
                          size={14}
                          color={colors.text.tertiary}
                        />
                      </Pressable>
                    </View>
                  ))}
                  <View style={styles.divider} />
                </>
              )}

              {/* ── Add section ── */}
              <Text style={styles.sectionLabel}>Add location reminder</Text>

              {/* Pick on map / preview card */}
              {!hasLocation ? (
                <Pressable
                  style={styles.pickMapBtn}
                  onPress={() => setShowMap(true)}
                >
                  <Feather
                    name="map"
                    size={22}
                    color={colors.accent.default}
                  />
                  <Text style={styles.pickMapBtnText}>Pick on map</Text>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={colors.text.tertiary}
                  />
                </Pressable>
              ) : (
                <Pressable
                  style={styles.pickedCard}
                  onPress={() => setShowMap(true)}
                >
                  <Feather
                    name="map-pin"
                    size={16}
                    color={colors.accent.default}
                  />
                  <View style={styles.pickedInfo}>
                    <Text style={styles.pickedLabel} numberOfLines={1}>
                      {stagedLabel}
                    </Text>
                    <Text style={styles.pickedCoords}>
                      Tap to change location
                    </Text>
                  </View>
                  <Feather
                    name="edit-2"
                    size={14}
                    color={colors.text.tertiary}
                  />
                </Pressable>
              )}

              {/* ── Radius ── */}
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

              {/* ── Trigger ── */}
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

              {/* ── Add button ── */}
              <Pressable
                style={[styles.addBtn, !hasLocation && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!hasLocation || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addBtnText}>Add reminder</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Map picker — full-screen slide-up on top */}
      <MapPickerModal
        visible={showMap}
        onClose={() => setShowMap(false)}
        onConfirm={handleMapConfirm}
        initialLat={stagedLat ?? undefined}
        initialLng={stagedLng ?? undefined}
        initialLabel={stagedLabel}
      />
    </>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "88%",
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
  scrollContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: Platform.OS === "ios" ? 36 : spacing[5],
  },
  existingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    padding: spacing[3],
    marginBottom: spacing[2],
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
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing[4],
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginBottom: spacing[3],
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  pickMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderStyle: "dashed",
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  pickMapBtnText: {
    flex: 1,
    color: colors.accent.default,
    fontSize: fontSize.base,
    fontWeight: "500",
  },
  pickedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: `${colors.accent.default}18`,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.accent.default}44`,
    padding: spacing[3],
    marginBottom: spacing[4],
  },
  pickedInfo: { flex: 1 },
  pickedLabel: {
    color: colors.text.primary,
    fontSize: fontSize.sm,
    fontWeight: "500",
  },
  pickedCoords: {
    color: colors.text.tertiary,
    fontSize: fontSize.xs,
    marginTop: 2,
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
  addBtnDisabled: { opacity: 0.35 },
  addBtnText: {
    color: "#fff",
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
