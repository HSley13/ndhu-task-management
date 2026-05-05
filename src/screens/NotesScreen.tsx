import React, { useRef, useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Keyboard,
  LayoutAnimation,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius, fontSize } from "../theme";
import { EmptyState } from "../components/ui/EmptyState";

// Notes are tasks with is_note === true
import { useTaskStore } from "../store/useTaskStore";
import type { Task } from "../types/index";
import { formatDueDate } from "../utils/date";

export function NotesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();
  const { tasks, openTaskDetail, togglePin, deleteTask, bulkDelete } = useTaskStore();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchInputRef = useRef<TextInput>(null);

  const isSelecting = selectedIds.length > 0;

  useFocusEffect(
    useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setSearchOpen(false);
      setSearch("");
      setSearchFocused(false);
      setSelectedIds([]);
      Keyboard.dismiss();
      searchInputRef.current?.blur();
    }, []),
  );

  function enterSelectMode(id: string) {
    setSelectedIds([id]);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function exitSelect() {
    setSelectedIds([]);
  }

  function openSearch() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchOpen(false);
    setSearch("");
    setSearchFocused(false);
    Keyboard.dismiss();
  }

  const notes = useMemo(
    () =>
      tasks
        .filter((t) => t.is_note)
        .filter((t) => {
          if (!search.trim()) return true;
          const q = search.toLowerCase();
          return (
            t.title.toLowerCase().includes(q) ||
            (t.note_content ?? "").toLowerCase().includes(q)
          );
        })
        .sort((a, b) => {
          if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
          const da = new Date(a.updated_at).getTime();
          const db = new Date(b.updated_at).getTime();
          return db - da;
        }),
    [tasks, search],
  );

  async function handleNotePress(item: Task) {
    await openTaskDetail(item.id);
    navigation.navigate("NoteEditor", { taskId: item.id });
  }

  function handleNoteLongPress(item: Task) {
    enterSelectMode(item.id);
  }

  async function handleBulkPin() {
    const selected = notes.filter((n) => selectedIds.includes(n.id));
    const allPinned = selected.every((n) => n.is_pinned);
    for (const note of selected) {
      if (allPinned || !note.is_pinned) await togglePin(note.id);
    }
    exitSelect();
  }

  async function handleBulkDelete() {
    Alert.alert(
      `Delete ${selectedIds.length} note${selectedIds.length > 1 ? "s" : ""}?`,
      "This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await bulkDelete(selectedIds);
            exitSelect();
          },
        },
      ],
    );
  }

  function renderNote({ item }: { item: Task }) {
    const isSelected = selectedIds.includes(item.id);
    const preview = (item.note_content ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return (
      <Pressable
        style={[
          styles.card,
          item.is_pinned && styles.cardPinned,
          isSelecting && isSelected && styles.cardSelected,
        ]}
        onPress={() => (isSelecting ? toggleSelect(item.id) : handleNotePress(item))}
        onLongPress={() => handleNoteLongPress(item)}
      >
        {isSelecting ? (
          <View style={[styles.selectCircle, isSelected && styles.selectCircleOn]}>
            {isSelected && <Feather name="check" size={12} color="#fff" />}
          </View>
        ) : (
          item.is_pinned && (
            <View style={styles.pinBadge}>
              <Feather name="bookmark" size={11} color={colors.accent.default} />
            </View>
          )
        )}
        <Text style={styles.noteTitle} numberOfLines={1}>
          {item.title}
        </Text>
        {preview.length > 0 && (
          <Text style={styles.notePreview} numberOfLines={3}>
            {preview}
          </Text>
        )}
        <Text style={styles.noteDate}>
          {formatDueDate(item.updated_at.split("T")[0])}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {!searchOpen ? (
          <>
            <Text style={styles.heading}>Notes</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={openSearch} hitSlop={8}>
              <Feather name="search" size={22} color={colors.text.secondary} />
            </Pressable>
          </>
        ) : (
          <>
            <View
              style={[
                styles.searchWrap,
                searchFocused && styles.searchWrapFocused,
              ]}
            >
              <Feather
                name="search"
                size={16}
                color={
                  searchFocused ? colors.accent.default : colors.text.tertiary
                }
                style={styles.searchIcon}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search notes…"
                placeholderTextColor={colors.text.tertiary}
                ref={searchInputRef}
                style={styles.searchInput}
                autoFocus={false}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </View>
            <Pressable
              onPress={closeSearch}
              hitSlop={8}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </>
        )}
      </View>

      {notes.length === 0 ? (
        <EmptyState
          illustration="notes"
          title="No notes yet"
          subtitle="Tap + to write a note."
          actionLabel="New note"
          onAction={() => navigation.navigate("NoteEditor" as any)}
        />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.id}
          renderItem={renderNote}
          numColumns={2}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          columnWrapperStyle={styles.row}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: tabBarHeight + spacing[8] },
          ]}
        />
      )}

      {/* FAB */}
      {!isSelecting && (
        <Pressable
          style={[styles.fab, { bottom: tabBarHeight + spacing[4] }]}
          onPress={() => navigation.navigate("NoteEditor" as any)}
        >
          <Feather name="plus" size={28} color="#fff" />
        </Pressable>
      )}

      {/* Bulk action bar */}
      {isSelecting && (
        <View style={[styles.bulkBar, { bottom: tabBarHeight }]}>
          <Pressable style={styles.bulkDoneBtn} onPress={exitSelect}>
            <Text style={styles.bulkCount}>{selectedIds.length} selected</Text>
            <Text style={styles.bulkDoneText}>Done</Text>
          </Pressable>
          <View style={styles.bulkActions}>
            <Pressable style={styles.bulkBtn} onPress={handleBulkPin}>
              <Feather name="bookmark" size={20} color={colors.text.secondary} />
              <Text style={styles.bulkBtnText}>
                {notes
                  .filter((n) => selectedIds.includes(n.id))
                  .every((n) => n.is_pinned)
                  ? "Unpin"
                  : "Pin"}
              </Text>
            </Pressable>
            <Pressable style={styles.bulkBtn} onPress={handleBulkDelete}>
              <Feather name="trash-2" size={20} color={colors.danger} />
              <Text style={[styles.bulkBtnText, { color: colors.danger }]}>Delete</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[2],
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.text.primary,
    letterSpacing: -0.5,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchWrapFocused: {
    borderColor: colors.accent.default,
    backgroundColor: colors.accent.muted,
  },
  searchIcon: {
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.base,
    lineHeight: 20,
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingLeft: spacing[3],
  },
  cancelText: {
    color: colors.accent.default,
    fontSize: fontSize.base,
  },
  list: {
    paddingHorizontal: spacing[2],
    paddingBottom: 40,
  },
  row: {
    justifyContent: "space-between",
    paddingHorizontal: spacing[2],
    gap: spacing[3],
  },
  card: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardPinned: {
    borderColor: colors.accent.default,
  },
  pinBadge: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
  },
  noteTitle: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.text.primary,
  },
  notePreview: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    lineHeight: fontSize.xs * 1.5,
  },
  noteDate: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing[1],
  },
  cardSelected: {
    borderColor: colors.accent.default,
    backgroundColor: colors.accent.muted,
  },
  selectCircle: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.bg.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  selectCircleOn: {
    backgroundColor: colors.accent.default,
    borderColor: colors.accent.default,
  },
  bulkBar: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.bg.elevated,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  bulkDoneBtn: {
    flex: 1,
    gap: 2,
  },
  bulkCount: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: "600",
  },
  bulkDoneText: {
    fontSize: fontSize.sm,
    color: colors.accent.default,
    fontWeight: "700",
  },
  bulkActions: {
    flexDirection: "row",
    gap: spacing[2],
  },
  bulkBtn: {
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: 4,
  },
  bulkBtnText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: spacing[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent.default,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
