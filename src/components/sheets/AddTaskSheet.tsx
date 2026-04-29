import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useTaskStore } from "../../store/useTaskStore";
import { useLabelStore } from "../../store/useLabelStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { colors, spacing, radius, fontSize } from "../../theme";
import { Button } from "../ui/Button";
import { SheetHandle } from "../ui/SheetHandle";
import { Chip } from "../ui/Chip";
import { AttachmentRow } from "../ui/AttachmentRow";
import {
  ReminderPickerModal,
  formatReminderOffset,
} from "../ui/ReminderPickerModal";
import { LabelPickerModal } from "../ui/LabelPickerModal";
import { LocationReminderModal } from "../ui/LocationReminderModal";
import type { LocationReminder } from "../../types";
import { uuidv4 } from "../../utils/uuid";

// Platform-safe date picker: native only (web uses HTML input type="date")
const NativeDatePicker: React.ComponentType<any> =
  Platform.OS !== "web"
    ? require("@react-native-community/datetimepicker").default
    : View;

interface AddTaskSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  initialDate?: string; // yyyy-MM-dd — pre-fills the due date when sheet opens
}

export function AddTaskSheet({ sheetRef, initialDate }: AddTaskSheetProps) {
  const { addTask, addAttachment, addReminder, setTaskLabels, addLocationReminder } =
    useTaskStore();
  const { labels: allLabels } = useLabelStore();
  const { defaultReminderOffsets, autoReminders } = useSettingsStore();
  const snapPoints = useMemo(() => ["70%", "92%"], []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    Array<{ uri: string; name: string; mime_type: string; size_bytes: number }>
  >([]);
  const [course, setCourse] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueTime, setDueTime] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [pendingReminderOffsets, setPendingReminderOffsets] = useState<
    number[]
  >([]);
  const [pendingLocationReminders, setPendingLocationReminders] = useState<
    LocationReminder[]
  >([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0 && initialDate) {
        setDueDate(parseISO(initialDate));
      }
      if (index === -1) {
        reset();
      }
    },
    [initialDate],
  );

  function reset() {
    setTitle("");
    setDescription("");
    setPendingAttachments([]);
    setCourse("");
    setDueDate(null);
    setDueTime(null);
    setSelectedLabels([]);
    setPendingReminderOffsets([]);
    setPendingLocationReminders([]);
    setShowReminderModal(false);
    setShowLabelModal(false);
    setShowLocationModal(false);
    setLoading(false);
  }

  async function handleCreate() {
    const t = title.trim();
    if (!t) return;
    setLoading(true);
    try {
      const task = await addTask({
        title: t,
        course: course.trim() || null,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        due_time: dueTime ? format(dueTime, "HH:mm:ss") : null,
        source: "manual",
        status: "pending",
        is_pinned: false,
        is_note: false,
        note_content: description.trim() || null,
        moodle_url: null,
        moodle_event_id: null,
        postponed_until: null,
      });
      for (const att of pendingAttachments) {
        await addAttachment(task.id, { ...att, task_id: task.id });
      }
      // If user didn't pick reminders manually, fall back to auto-defaults (when enabled and a due date is set)
      const remindersToSchedule =
        pendingReminderOffsets.length > 0
          ? pendingReminderOffsets
          : autoReminders && dueDate
            ? defaultReminderOffsets
            : [];
      for (const offset of remindersToSchedule) {
        await addReminder(task.id, offset);
      }
      if (selectedLabels.length > 0) {
        await setTaskLabels(task.id, selectedLabels);
      }
      for (const lr of pendingLocationReminders) {
        await addLocationReminder(task.id, {
          label: lr.label,
          latitude: lr.latitude,
          longitude: lr.longitude,
          radius_meters: lr.radius_meters,
          trigger: lr.trigger,
        });
      }
      reset();
      sheetRef.current?.dismiss();
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow photo library access.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (result.canceled) return;
    const newAtts = result.assets.map((asset) => {
      const ext = asset.uri.split(".").pop() ?? "jpg";
      return {
        uri: asset.uri,
        name: asset.fileName ?? `image.${ext}`,
        mime_type: `image/${ext === "png" ? "png" : "jpeg"}`,
        size_bytes: asset.fileSize ?? 0,
      };
    });
    setPendingAttachments((prev) => [...prev, ...newAtts]);
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const newAtts = await Promise.all(
      result.assets.map(async (file) => {
        let uri = file.uri;
        if (Platform.OS !== "web") {
          const dir = `${FileSystem.documentDirectory}attachments/`;
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          const dest = `${dir}${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          await FileSystem.copyAsync({ from: file.uri, to: dest });
          uri = dest;
        }
        return {
          uri,
          name: file.name,
          mime_type: file.mimeType ?? "application/octet-stream",
          size_bytes: file.size ?? 0,
        };
      }),
    );
    setPendingAttachments((prev) => [...prev, ...newAtts]);
  }

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleComponent={SheetHandle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      onChange={handleSheetChange}
    >
      <BottomSheetScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>New Task</Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Task title…"
          placeholderTextColor={colors.text.tertiary}
          style={styles.titleInput}
          returnKeyType="next"
        />

        {/* Description + attach area */}
        <View style={styles.descWrap}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Add description, notes… (optional)"
            placeholderTextColor={colors.text.tertiary}
            style={styles.descInput}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {/* Pending attachments list */}
          {pendingAttachments.length > 0 && (
            <View style={styles.descAttList}>
              {pendingAttachments.map((att, i) => (
                <AttachmentRow
                  key={i}
                  attachment={{ ...att, id: String(i), task_id: "" }}
                  onDelete={() =>
                    setPendingAttachments((p) =>
                      p.filter((_, idx) => idx !== i),
                    )
                  }
                />
              ))}
            </View>
          )}
          {/* Attach buttons row */}
          <View style={styles.descAttRow}>
            <Pressable
              style={styles.descAttBtn}
              onPress={pickImage}
              hitSlop={6}
            >
              <Feather name="image" size={16} color={colors.text.secondary} />
            </Pressable>
            <Pressable style={styles.descAttBtn} onPress={pickFile} hitSlop={6}>
              <Feather
                name="paperclip"
                size={16}
                color={colors.text.secondary}
              />
            </Pressable>
            <Pressable
              style={[
                styles.descAttBtn,
                selectedLabels.length > 0 && styles.descAttBtnActive,
              ]}
              onPress={() => setShowLabelModal(true)}
              hitSlop={6}
            >
              <Feather
                name="tag"
                size={16}
                color={
                  selectedLabels.length > 0
                    ? colors.accent.default
                    : colors.text.secondary
                }
              />
            </Pressable>
            {selectedLabels.length > 0 && (
              <View style={styles.labelDotsRow}>
                {selectedLabels.slice(0, 4).map((id) => {
                  const col = allLabels.find((l) => l.id === id)?.color;
                  return col ? (
                    <View
                      key={id}
                      style={[styles.labelDotSmall, { backgroundColor: col }]}
                    />
                  ) : null;
                })}
              </View>
            )}
            {pendingAttachments.length > 0 && (
              <Text style={styles.descAttCount}>
                {pendingAttachments.length} attached
              </Text>
            )}
          </View>
        </View>

        <TextInput
          value={course}
          onChangeText={setCourse}
          placeholder="Course (optional)"
          placeholderTextColor={colors.text.tertiary}
          style={styles.courseInput}
          returnKeyType="done"
        />

        {/* Due date/time row */}
        <View style={styles.dateRow}>
          <Pressable
            style={styles.datePill}
            onPress={() => setShowDatePicker(true)}
          >
            <Feather
              name="calendar"
              size={14}
              color={dueDate ? colors.accent.default : colors.text.tertiary}
            />
            <Text style={[styles.datePillText, dueDate && styles.dateActive]}>
              {dueDate ? format(dueDate, "MMM d, yyyy") : "Due date"}
            </Text>
            {dueDate && (
              <Pressable onPress={() => setDueDate(null)} hitSlop={8}>
                <Feather name="x" size={13} color={colors.text.tertiary} />
              </Pressable>
            )}
          </Pressable>

          {dueDate && (
            <Pressable
              style={styles.datePill}
              onPress={() => setShowTimePicker(true)}
            >
              <Feather
                name="clock"
                size={14}
                color={dueTime ? colors.accent.default : colors.text.tertiary}
              />
              <Text style={[styles.datePillText, dueTime && styles.dateActive]}>
                {dueTime ? format(dueTime, "h:mm a") : "Time"}
              </Text>
              {dueTime && (
                <Pressable onPress={() => setDueTime(null)} hitSlop={8}>
                  <Feather name="x" size={13} color={colors.text.tertiary} />
                </Pressable>
              )}
            </Pressable>
          )}

          {/* Remind me chip — only when a due date is set */}
          {dueDate && (
            <Pressable
              style={[
                styles.datePill,
                pendingReminderOffsets.length > 0 && styles.datePillActive,
              ]}
              onPress={() => setShowReminderModal(true)}
            >
              <Feather
                name="bell"
                size={14}
                color={
                  pendingReminderOffsets.length > 0
                    ? colors.accent.default
                    : colors.text.tertiary
                }
              />
              <Text
                style={[
                  styles.datePillText,
                  pendingReminderOffsets.length > 0 && styles.dateActive,
                ]}
              >
                {pendingReminderOffsets.length > 0
                  ? pendingReminderOffsets.length === 1
                    ? formatReminderOffset(pendingReminderOffsets[0])
                    : `${pendingReminderOffsets.length} reminders`
                  : "Remind me"}
              </Text>
            </Pressable>
          )}

          {/* Location reminder chip — always visible */}
          <Pressable
            style={[
              styles.datePill,
              pendingLocationReminders.length > 0 && styles.datePillActive,
            ]}
            onPress={() => setShowLocationModal(true)}
          >
            <Feather
              name="map-pin"
              size={14}
              color={
                pendingLocationReminders.length > 0
                  ? colors.accent.default
                  : colors.text.tertiary
              }
            />
            <Text
              style={[
                styles.datePillText,
                pendingLocationReminders.length > 0 && styles.dateActive,
              ]}
            >
              {pendingLocationReminders.length > 0
                ? pendingLocationReminders.length === 1
                  ? pendingLocationReminders[0].label
                  : `${pendingLocationReminders.length} locations`
                : "Location"}
            </Text>
          </Pressable>
        </View>

        {showDatePicker && Platform.OS !== "web" && (
          <NativeDatePicker
            value={dueDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_: any, d?: Date) => {
              setShowDatePicker(false);
              if (d) setDueDate(d);
            }}
            minimumDate={new Date()}
            textColor="#FFFFFF"
          />
        )}
        {showDatePicker &&
          Platform.OS === "web" &&
          React.createElement("input", {
            type: "date",
            value: dueDate ? format(dueDate, "yyyy-MM-dd") : "",
            onChange: (e: any) => {
              setShowDatePicker(false);
              if (e.target.value) setDueDate(parseISO(e.target.value));
            },
            style: {
              colorScheme: "dark",
              color: colors.text.primary,
              background: colors.bg.elevated,
              border: `1px solid ${colors.border.default}`,
              borderRadius: `${radius.md}px`,
              padding: `${spacing[2]}px ${spacing[3]}px`,
              fontSize: `${fontSize.sm}px`,
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "inherit",
            },
          })}
        {showTimePicker && Platform.OS !== "web" && (
          <NativeDatePicker
            value={dueTime ?? new Date()}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_: any, d?: Date) => {
              setShowTimePicker(false);
              if (d) setDueTime(d);
            }}
            textColor="#FFFFFF"
          />
        )}
        {showTimePicker &&
          Platform.OS === "web" &&
          React.createElement("input", {
            type: "time",
            value: dueTime ? format(dueTime, "HH:mm") : "",
            onChange: (e: any) => {
              setShowTimePicker(false);
              if (e.target.value) {
                const d = dueDate ? new Date(dueDate) : new Date();
                const [h, m] = e.target.value.split(":").map(Number);
                d.setHours(h, m, 0, 0);
                setDueTime(d);
              }
            },
            style: {
              colorScheme: "dark",
              color: colors.text.primary,
              background: colors.bg.elevated,
              border: `1px solid ${colors.border.default}`,
              borderRadius: `${radius.md}px`,
              padding: `${spacing[2]}px ${spacing[3]}px`,
              fontSize: `${fontSize.sm}px`,
              outline: "none",
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "inherit",
            },
          })}

        {/* Reminder picker modal */}
        {dueDate && (
          <ReminderPickerModal
            visible={showReminderModal}
            onClose={() => setShowReminderModal(false)}
            activeOffsets={pendingReminderOffsets}
            onToggleOffset={(offset) =>
              setPendingReminderOffsets((prev) =>
                prev.includes(offset)
                  ? prev.filter((o) => o !== offset)
                  : [...prev, offset],
              )
            }
            onAddCustom={(offset) =>
              setPendingReminderOffsets((prev) =>
                prev.includes(offset) ? prev : [...prev, offset],
              )
            }
            onRemoveCustom={(offset) =>
              setPendingReminderOffsets((prev) =>
                prev.filter((o) => o !== offset),
              )
            }
          />
        )}

        <LabelPickerModal
          visible={showLabelModal}
          onClose={() => setShowLabelModal(false)}
          selectedIds={selectedLabels}
          onApply={(ids) => setSelectedLabels(ids)}
        />

        <LocationReminderModal
          visible={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          locationReminders={pendingLocationReminders}
          onAdd={async (data) => {
            setPendingLocationReminders((prev) => [
              ...prev,
              { ...data, id: uuidv4(), task_id: "", expo_notification_id: null },
            ]);
          }}
          onDelete={async (id) => {
            setPendingLocationReminders((prev) =>
              prev.filter((lr) => lr.id !== id),
            );
          }}
        />

        <Button
          label="Create Task"
          onPress={handleCreate}
          loading={loading}
          disabled={!title.trim()}
          style={styles.createBtn}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: colors.bg.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: 40,
    gap: spacing[4],
    ...Platform.select({
      web: { maxWidth: 600, alignSelf: "center" as const, width: "100%" },
    }),
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
    paddingTop: spacing[2],
  },
  titleInput: {
    fontSize: fontSize.lg,
    color: colors.text.primary,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  courseInput: {
    fontSize: fontSize.base,
    color: colors.text.secondary,
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  descWrap: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: "hidden",
  },
  descInput: {
    fontSize: fontSize.base,
    color: colors.text.primary,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    minHeight: 96,
    textAlignVertical: "top",
  },
  descAttList: {
    paddingHorizontal: spacing[3],
    gap: spacing[2],
    paddingBottom: spacing[2],
  },
  descAttRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  descAttBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.bg.input,
    alignItems: "center",
    justifyContent: "center",
  },
  descAttBtnActive: {
    backgroundColor: colors.accent.soft ?? colors.accent.default + "18",
  },
  labelDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 2,
  },
  labelDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  descAttCount: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginLeft: spacing[1],
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing[2],
    flexWrap: "wrap",
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  datePillText: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  dateActive: {
    color: colors.accent.default,
  },
  datePillActive: {
    borderColor: colors.accent.muted ?? colors.accent.default,
  },
  webDateInput: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  labelsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  createBtn: {
    marginTop: spacing[2],
  },
});
