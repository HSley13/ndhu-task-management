import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import { Feather } from "@expo/vector-icons";
import { useTaskStore } from "../../store/useTaskStore";
import { useLabelStore } from "../../store/useLabelStore";
import { useSettingsStore } from "../../store/useSettingsStore";
import { colors, spacing, radius, fontSize, shadows } from "../../theme";
import { Checkbox } from "../ui/Checkbox";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Divider } from "../ui/Divider";
import { SheetHandle } from "../ui/SheetHandle";
import { SubtaskRow } from "../task/SubtaskRow";
import { AttachmentRow } from "../ui/AttachmentRow";
import { format, parseISO } from "date-fns";
import {
  ReminderPickerModal,
  formatReminderOffset,
} from "../ui/ReminderPickerModal";
import { LabelPickerModal } from "../ui/LabelPickerModal";
import { LocationReminderModal } from "../ui/LocationReminderModal";
import type { TaskFull } from "../../types";

// Platform-safe date picker: native only (web uses HTML input type="date")
const NativeDatePicker: React.ComponentType<any> =
  Platform.OS !== "web"
    ? require("@react-native-community/datetimepicker").default
    : View;

interface TaskDetailSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onOpenNoteEditor: () => void;
}

export function TaskDetailSheet({
  sheetRef,
  onOpenNoteEditor,
}: TaskDetailSheetProps) {
  const {
    openTask: task,
    toggleDone,
    togglePin,
    addSubtask,
    deleteTask,
    closeTaskDetail,
    updateTask,
    deleteAttachment,
    addAttachment,
    addReminder,
    deleteReminderByOffset,
    addLocationReminder,
    deleteLocationReminder,
  } = useTaskStore();
  const { labels: allLabels } = useLabelStore();
  const snapPoints = useMemo(() => ["60%", "90%"], []);

  const [newSubtask, setNewSubtask] = useState("");
  const [effortVal, setEffortVal] = useState<number>(2);

  // Inline-editable fields — auto-save on blur / immediate on picker confirm
  const [titleVal, setTitleVal] = useState("");
  const [courseVal, setCourseVal] = useState("");
  const [editingCourse, setEditingCourse] = useState(false);
  const [dueDateVal, setDueDateVal] = useState<Date | null>(null);
  const [dueTimeVal, setDueTimeVal] = useState<Date | null>(null);
  const [activePanel, setActivePanel] = useState<
    "date" | "time" | "reminder" | "label" | "location" | null
  >(null);

  async function pickImage() {
    if (Platform.OS !== "web") {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow photo library access.");
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !task) return;
    const asset = result.assets[0];
    if (!asset) return;
    const ext = asset.uri.split(".").pop() ?? "jpg";
    const mime = `image/${ext === "png" ? "png" : "jpeg"}`;
    await addAttachment(task.id, {
      task_id: task.id,
      uri: asset.uri,
      name: asset.fileName ?? `image_${Date.now()}.${ext}`,
      mime_type: mime,
      size_bytes: asset.fileSize ?? 0,
    });
  }

  async function takePhoto() {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow camera access.");
        return;
      }
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !task) return;
    const asset = result.assets[0];
    if (!asset) return;
    await addAttachment(task.id, {
      task_id: task.id,
      uri: asset.uri,
      name: asset.fileName ?? `photo_${Date.now()}.jpg`,
      mime_type: "image/jpeg",
      size_bytes: asset.fileSize ?? 0,
    });
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });
    if (result.canceled || !task) return;
    const file = result.assets[0];
    if (!file) return;
    let uri = file.uri;
    if (Platform.OS !== "web") {
      const dir = `${FileSystem.documentDirectory}attachments/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const dest = `${dir}${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await FileSystem.copyAsync({ from: file.uri, to: dest });
      uri = dest;
    }
    await addAttachment(task.id, {
      task_id: task.id,
      uri,
      name: file.name,
      mime_type: file.mimeType ?? "application/octet-stream",
      size_bytes: file.size ?? 0,
    });
  }

  useEffect(() => {
    if (task) {
      setTitleVal(task.title);
      setCourseVal(task.course ?? "");
      setDueDateVal(task.due_date ? parseISO(task.due_date) : null);
      setDueTimeVal(
        task.due_time ? parseISO(`2000-01-01T${task.due_time}`) : null,
      );
    }
    setEffortVal(task?.effort ?? 2);
    setEditingCourse(false);
    setActivePanel(null);
  }, [task?.id]);

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

  const taskLabels = allLabels.filter((l) =>
    task?.labels?.some((tl: any) => tl.label_id === l.id || tl.id === l.id),
  );

  // Auto-save helpers
  async function saveTitle() {
    const t = titleVal.trim();
    if (!task || !t || t === task.title) return;
    await updateTask(task.id, { title: t });
  }

  async function saveCourse() {
    if (!task) return;
    const c = courseVal.trim() || null;
    setEditingCourse(false);
    if (c === (task.course ?? null)) return;
    await updateTask(task.id, { course: c });
  }

  async function saveDueDate(d: Date | null) {
    if (!task) return;
    setDueDateVal(d);
    await updateTask(task.id, { due_date: d ? format(d, "yyyy-MM-dd") : null });
  }

  async function saveDueTime(t: Date | null) {
    if (!task) return;
    setDueTimeVal(t);
    await updateTask(task.id, { due_time: t ? format(t, "HH:mm:ss") : null });
  }

  async function handleToggleOffset(offset: number) {
    if (!task) return;
    const active = task.reminders?.some((r) => r.offset_minutes === offset);
    if (active) {
      await deleteReminderByOffset(task.id, offset);
    } else {
      await addReminder(task.id, offset);
    }
  }

  async function handleAddCustom(offset_minutes: number) {
    if (!task) return;
    await addReminder(task.id, offset_minutes);
  }

  async function handleRemoveCustom(offset: number) {
    if (!task) return;
    await deleteReminderByOffset(task.id, offset);
  }

  async function handleAddSubtask() {
    const t = newSubtask.trim();
    if (!t) return;
    setNewSubtask("");
    await addSubtask(task!.id, t);
  }

  function handleOpenUrl() {
    if (task!.moodle_url) Linking.openURL(task!.moodle_url);
  }

  const activeReminderOffsets = [
    ...new Set((task?.reminders ?? []).map((r) => r.offset_minutes)),
  ];

  if (!task) return null;

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleComponent={SheetHandle}
      onDismiss={closeTaskDetail}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        {/* Header: inline-editable title */}
        <View style={styles.header}>
          <Checkbox
            checked={task.status === "done"}
            onChange={() => toggleDone(task.id)}
          />
          <TextInput
            value={titleVal}
            onChangeText={setTitleVal}
            onBlur={saveTitle}
            style={[
              styles.title,
              styles.titleInput,
              task.status === "done" && styles.titleDone,
            ]}
            multiline
            returnKeyType="done"
            blurOnSubmit
          />
          <Pressable onPress={() => togglePin(task.id)} hitSlop={8}>
            <Feather
              name="bookmark"
              size={22}
              color={
                task.is_pinned ? colors.accent.default : colors.border.strong
              }
            />
          </Pressable>
        </View>

        {/* Meta row: tappable course + date/time + source */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.metaRow}
          contentContainerStyle={styles.metaRowContent}
          keyboardShouldPersistTaps="handled"
        >
          {editingCourse ? (
            <TextInput
              value={courseVal}
              onChangeText={setCourseVal}
              onBlur={saveCourse}
              placeholder="Course (optional)"
              placeholderTextColor={colors.text.tertiary}
              style={styles.courseInlineInput}
              returnKeyType="done"
              onSubmitEditing={saveCourse}
              autoFocus
            />
          ) : (
            <Pressable
              style={styles.metaChip}
              onPress={() => setEditingCourse(true)}
            >
              <Feather
                name="book-open"
                size={12}
                color={colors.text.tertiary}
              />
              <Text style={styles.metaText}>{courseVal || "Add course"}</Text>
            </Pressable>
          )}

          {/* Due date pill — always tappable */}
          <Pressable
            style={[styles.metaChip, dueDateVal && styles.metaChipActive]}
            onPress={() => setActivePanel("date")}
          >
            <Feather
              name="calendar"
              size={12}
              color={dueDateVal ? colors.accent.default : colors.text.tertiary}
            />
            <Text
              style={[
                styles.metaText,
                dueDateVal && { color: colors.text.secondary },
              ]}
            >
              {dueDateVal ? format(dueDateVal, "MMM d, yyyy") : "Add due date"}
            </Text>
            {dueDateVal && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  saveDueDate(null);
                }}
                hitSlop={6}
              >
                <Feather name="x" size={11} color={colors.text.tertiary} />
              </Pressable>
            )}
          </Pressable>

          {dueDateVal && (
            <Pressable
              style={[styles.metaChip, dueTimeVal && styles.metaChipActive]}
              onPress={() => setActivePanel("time")}
            >
              <Feather
                name="clock"
                size={12}
                color={
                  dueTimeVal ? colors.accent.default : colors.text.tertiary
                }
              />
              <Text
                style={[
                  styles.metaText,
                  dueTimeVal && { color: colors.text.secondary },
                ]}
              >
                {dueTimeVal ? format(dueTimeVal, "h:mm a") : "Add time"}
              </Text>
              {dueTimeVal && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    saveDueTime(null);
                  }}
                  hitSlop={6}
                >
                  <Feather name="x" size={11} color={colors.text.tertiary} />
                </Pressable>
              )}
            </Pressable>
          )}

          {task.source === "moodle" && (
            <View
              style={[styles.metaChip, { backgroundColor: colors.info + "22" }]}
            >
              <Feather name="zap" size={12} color={colors.info} />
              <Text style={[styles.metaText, { color: colors.info }]}>
                Moodle
              </Text>
            </View>
          )}

          {/* Reminder chip — lives in meta row alongside date/time */}
          {dueDateVal && (
            <Pressable
              style={[
                styles.metaChip,
                activeReminderOffsets.length > 0 && styles.metaChipActive,
              ]}
              onPress={() => setActivePanel("reminder")}
            >
              <Feather
                name="bell"
                size={12}
                color={
                  activeReminderOffsets.length > 0
                    ? colors.accent.default
                    : colors.text.tertiary
                }
              />
              <Text
                style={[
                  styles.metaText,
                  activeReminderOffsets.length > 0 && {
                    color: colors.accent.default,
                  },
                ]}
              >
                {activeReminderOffsets.length > 0
                  ? activeReminderOffsets.length === 1
                    ? formatReminderOffset(activeReminderOffsets[0])
                    : `${activeReminderOffsets.length} reminders`
                  : "Remind me"}
              </Text>
            </Pressable>
          )}

          {/* Label tag chip in meta row */}
          <Pressable
            style={[
              styles.metaChip,
              taskLabels.length > 0 && styles.metaChipActive,
            ]}
            onPress={() => setActivePanel("label")}
          >
            <Feather
              name="tag"
              size={12}
              color={
                taskLabels.length > 0
                  ? colors.accent.default
                  : colors.text.tertiary
              }
            />
            {taskLabels.slice(0, 4).map((l) => (
              <View
                key={l.id}
                style={[styles.labelDotInline, { backgroundColor: l.color }]}
              />
            ))}
          </Pressable>

          {/* Location reminder chip */}
          <Pressable
            style={[
              styles.metaChip,
              (task?.location_reminders?.length ?? 0) > 0 &&
                styles.metaChipActive,
            ]}
            onPress={() => setActivePanel("location")}
          >
            <Feather
              name="map-pin"
              size={12}
              color={
                (task?.location_reminders?.length ?? 0) > 0
                  ? colors.accent.default
                  : colors.text.tertiary
              }
            />
            <Text
              style={[
                styles.metaText,
                (task?.location_reminders?.length ?? 0) > 0 && {
                  color: colors.accent.default,
                },
              ]}
            >
              {(task?.location_reminders?.length ?? 0) > 0
                ? task!.location_reminders.length === 1
                  ? task!.location_reminders[0].label
                  : `${task!.location_reminders.length} locations`
                : "Location"}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Effort picker */}
        <View style={styles.effortRow}>
          <Feather name="zap" size={13} color={colors.text.tertiary} />
          <Text style={styles.effortLabel}>Effort</Text>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              style={[styles.effortBtn, effortVal === n && styles.effortBtnOn]}
              onPress={async () => {
                setEffortVal(n);
                if (task) await updateTask(task.id, { effort: n });
              }}
            >
              <Text style={[styles.effortBtnText, effortVal === n && styles.effortBtnTextOn]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>

        {dueDateVal && (
          <ReminderPickerModal
            visible={activePanel === "reminder"}
            onClose={() => setActivePanel(null)}
            activeOffsets={activeReminderOffsets}
            onToggleOffset={handleToggleOffset}
            onAddCustom={handleAddCustom}
            onRemoveCustom={handleRemoveCustom}
          />
        )}

        <LocationReminderModal
          visible={activePanel === "location"}
          onClose={() => setActivePanel(null)}
          locationReminders={task?.location_reminders ?? []}
          onAdd={(data) => addLocationReminder(task!.id, data)}
          onDelete={deleteLocationReminder}
        />

        {/* Date/time pickers */}
        {activePanel === "date" && Platform.OS !== "web" && (
          <NativeDatePicker
            value={dueDateVal ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_: any, d?: Date) => {
              setActivePanel(null);
              if (d) saveDueDate(d);
            }}
            textColor="#FFFFFF"
          />
        )}
        {activePanel === "date" &&
          Platform.OS === "web" &&
          React.createElement("input", {
            type: "date",
            value: dueDateVal ? format(dueDateVal, "yyyy-MM-dd") : "",
            onChange: (e: any) => {
              setActivePanel(null);
              if (e.target.value) saveDueDate(parseISO(e.target.value));
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
        {activePanel === "time" && Platform.OS !== "web" && (
          <NativeDatePicker
            value={dueTimeVal ?? new Date()}
            mode="time"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_: any, d?: Date) => {
              setActivePanel(null);
              if (d) saveDueTime(d);
            }}
            textColor="#FFFFFF"
          />
        )}
        {activePanel === "time" &&
          Platform.OS === "web" &&
          React.createElement("input", {
            type: "time",
            value: dueTimeVal ? format(dueTimeVal, "HH:mm") : "",
            onChange: (e: any) => {
              setActivePanel(null);
              if (e.target.value) {
                const d = dueDateVal ? new Date(dueDateVal) : new Date();
                const [h, m] = e.target.value.split(":").map(Number);
                d.setHours(h, m, 0, 0);
                saveDueTime(d);
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

        <Divider />

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <Pressable onPress={onOpenNoteEditor} style={styles.notePreview}>
            {task.note_content ? (
              <Text style={styles.noteText} numberOfLines={4}>
                {task.note_content
                  .replace(/<[^>]*>/g, " ")
                  .replace(/&nbsp;/g, " ")
                  .replace(/&amp;/g, "&")
                  .replace(/&lt;/g, "<")
                  .replace(/&gt;/g, ">")
                  .replace(/\s+/g, " ")
                  .trim()}
              </Text>
            ) : (
              <Text style={styles.notePlaceholder}>
                Tap to add a description…
              </Text>
            )}
            <Feather
              name="edit-2"
              size={14}
              color={colors.text.tertiary}
              style={{ alignSelf: "flex-start", marginTop: 2 }}
            />
          </Pressable>
        </View>

        <Divider />

        {/* Subtasks */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Subtasks</Text>
          {task.subtasks?.map((s) => (
            <SubtaskRow key={s.id} subtask={s} />
          ))}
          <View style={styles.addSubtask}>
            <Feather name="plus" size={16} color={colors.text.tertiary} />
            <TextInput
              value={newSubtask}
              onChangeText={setNewSubtask}
              placeholder="Add subtask…"
              placeholderTextColor={colors.text.tertiary}
              style={styles.subtaskInput}
              returnKeyType="done"
              onSubmitEditing={handleAddSubtask}
            />
          </View>
        </View>

        <Divider />

        {/* Attachments */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Attachments</Text>
            <View style={styles.attActions}>
              <Pressable
                style={styles.attActionBtn}
                onPress={pickImage}
                hitSlop={8}
              >
                <Feather name="image" size={16} color={colors.text.tertiary} />
              </Pressable>
              <Pressable
                style={styles.attActionBtn}
                onPress={takePhoto}
                hitSlop={8}
              >
                <Feather
                  name="camera"
                  size={16}
                  color={colors.text.tertiary}
                />
              </Pressable>
              <Pressable
                style={styles.attActionBtn}
                onPress={pickFile}
                hitSlop={8}
              >
                <Feather
                  name="paperclip"
                  size={16}
                  color={colors.text.tertiary}
                />
              </Pressable>
            </View>
          </View>
          {(task.attachments?.length ?? 0) === 0 ? (
            <Text style={styles.emptyAtt}>
              No attachments — tap an icon above to add
            </Text>
          ) : (
            <View style={styles.attachmentList}>
              {task.attachments.map((att) => (
                <AttachmentRow
                  key={att.id}
                  attachment={att}
                  onDelete={() => deleteAttachment(att.id)}
                />
              ))}
            </View>
          )}
        </View>

        <Divider />

        <LabelPickerModal
          visible={activePanel === "label"}
          onClose={() => setActivePanel(null)}
          selectedIds={taskLabels.map((l) => l.id)}
          onApply={async (ids) => {
            if (task) await useTaskStore.getState().setTaskLabels(task.id, ids);
          }}
        />

        {/* Actions */}
        <View style={styles.actions}>
          {task.moodle_url && (
            <Button
              variant="ghost"
              label="Open in Moodle"
              icon={
                <Feather
                  name="external-link"
                  size={16}
                  color={colors.text.secondary}
                />
              }
              onPress={handleOpenUrl}
              style={styles.actionBtn}
            />
          )}
          {!task.is_note && (
            <Button
              variant="ghost"
              label="Convert to Note"
              icon={
                <Feather
                  name="file-text"
                  size={16}
                  color={colors.text.secondary}
                />
              }
              onPress={async () => {
                await updateTask(task.id, { is_note: true });
                sheetRef.current?.close();
              }}
              style={styles.actionBtn}
            />
          )}
          <Button
            variant="danger"
            label="Delete Task"
            icon={<Feather name="trash-2" size={16} color={colors.danger} />}
            onPress={() => {
              deleteTask(task.id);
              sheetRef.current?.close();
            }}
            style={styles.actionBtn}
          />
        </View>
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
    paddingBottom: 48,
    ...Platform.select({
      web: { maxWidth: 600, alignSelf: "center" as const, width: "100%" },
    }),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    paddingVertical: spacing[3],
  },
  title: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text.primary,
    lineHeight: fontSize.lg * 1.4,
  },
  titleDone: {
    textDecorationLine: "line-through",
    opacity: 0.45,
  },
  titleInput: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 40,
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
    marginBottom: spacing[2],
  },
  metaRow: {
    paddingBottom: spacing[3],
  },
  metaRowContent: {
    flexDirection: "row",
    gap: spacing[2],
    alignItems: "center",
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  metaChipActive: {
    borderColor: colors.accent.muted,
  },
  labelDotInline: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
  },
  courseInlineInput: {
    width: 180,
    fontSize: fontSize.xs,
    color: colors.text.primary,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accent.muted,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  effortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  effortLabel: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginRight: 4,
  },
  effortBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    alignItems: "center",
    justifyContent: "center",
  },
  effortBtnOn: {
    backgroundColor: colors.accent.default,
    borderColor: colors.accent.default,
  },
  effortBtnText: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    color: colors.text.tertiary,
  },
  effortBtnTextOn: {
    color: "#fff",
  },
  section: {
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelIconBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.accent.soft ?? colors.accent.default + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  addChipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderStyle: "dashed",
  },
  addChipText: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
  },
  addSubtask: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingVertical: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    marginTop: spacing[1],
  },
  subtaskInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.base,
    paddingVertical: 0,
  },
  notePreview: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
  },
  noteText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text.secondary,
    lineHeight: fontSize.base * 1.6,
  },
  notePlaceholder: {
    fontSize: fontSize.base,
    color: colors.text.tertiary,
    fontStyle: "italic",
    flex: 1,
  },
  attachmentList: {
    gap: spacing[2],
    marginTop: spacing[1],
  },
  attActions: {
    flexDirection: "row",
    gap: spacing[3],
  },
  attActionBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAtt: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    fontStyle: "italic",
    marginTop: spacing[1],
  },
  actions: {
    gap: spacing[3],
    paddingTop: spacing[4],
  },
  actionBtn: {
    alignSelf: "stretch",
  },
});
