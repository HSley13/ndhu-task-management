import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLabelStore } from '../../store/useLabelStore';
import { colors, spacing, radius, fontSize } from '../../theme';

const PALETTE = colors.labels as readonly string[];

export interface LabelPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** Label IDs currently applied to the task (or pending in AddTaskSheet) */
  selectedIds: string[];
  /** Called with the new full set of selected IDs when user taps Apply */
  onApply: (ids: string[]) => void;
}

export function LabelPickerModal({
  visible,
  onClose,
  selectedIds,
  onApply,
}: LabelPickerModalProps) {
  const { labels, addLabel } = useLabelStore();

  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]);
  const [creating, setCreating] = useState(false);

  // Sync draft when modal opens
  useEffect(() => {
    if (visible) {
      setDraft(selectedIds);
      setShowNew(false);
      setNewName('');
      setNewColor(PALETTE[0]);
    }
  }, [visible]);

  function toggle(id: string) {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  }

  async function handleCreate() {
    const n = newName.trim();
    if (!n) return;
    setCreating(true);
    try {
      const label = await addLabel(n, newColor);
      setDraft((prev) => [...prev, label.id]);
      setNewName('');
      setShowNew(false);
    } finally {
      setCreating(false);
    }
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>

            {/* Header */}
            <View style={styles.cardHeader}>
              <Feather name="tag" size={16} color={colors.accent.default} />
              <Text style={styles.cardTitle}>Labels</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Feather name="x" size={18} color={colors.text.tertiary} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {labels.length === 0 && !showNew && (
                <Text style={styles.emptyNote}>No labels yet. Create one below.</Text>
              )}

              {/* Label rows */}
              {labels.map((label) => {
                const active = draft.includes(label.id);
                return (
                  <Pressable
                    key={label.id}
                    style={[styles.row, active && styles.rowActive]}
                    onPress={() => toggle(label.id)}
                  >
                    <View style={[styles.dot, { backgroundColor: label.color }]} />
                    <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                      {label.name}
                    </Text>
                    <View style={[styles.checkBox, active && styles.checkBoxActive]}>
                      {active && <Feather name="check" size={12} color={colors.bg.surface} />}
                    </View>
                  </Pressable>
                );
              })}

              {/* New label form */}
              {showNew ? (
                <View style={styles.newForm}>
                  <TextInput
                    value={newName}
                    onChangeText={setNewName}
                    placeholder="Label name…"
                    placeholderTextColor={colors.text.tertiary}
                    style={styles.newInput}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={handleCreate}
                  />
                  <View style={styles.paletteRow}>
                    {PALETTE.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setNewColor(c)}
                        style={[
                          styles.swatch,
                          { backgroundColor: c },
                          newColor === c && styles.swatchActive,
                        ]}
                      >
                        {newColor === c && (
                          <Feather name="check" size={12} color="#fff" />
                        )}
                      </Pressable>
                    ))}
                  </View>
                  <View style={styles.newActions}>
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => { setShowNew(false); setNewName(''); }}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.createBtn, (!newName.trim() || creating) && styles.createBtnDisabled]}
                      onPress={handleCreate}
                      disabled={!newName.trim() || creating}
                    >
                      <Text style={styles.createBtnText}>
                        {creating ? 'Creating…' : 'Create'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable style={styles.newRow} onPress={() => setShowNew(true)}>
                  <View style={styles.newRowIconWrap}>
                    <Feather name="plus" size={14} color={colors.accent.default} />
                  </View>
                  <Text style={styles.newRowText}>New label</Text>
                </Pressable>
              )}
            </ScrollView>

            {/* Apply button */}
            <Pressable style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
  },
  kav: {
    width: '100%',
    maxWidth: 420,
  },
  card: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    maxHeight: '85%' as any,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  cardTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeBtn: {
    padding: spacing[1],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[2],
  },
  emptyNote: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    paddingVertical: spacing[3],
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
    marginBottom: 2,
  },
  rowActive: {
    backgroundColor: colors.accent.soft ?? (colors.accent.default + '18'),
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  rowLabel: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.text.secondary,
  },
  rowLabelActive: {
    color: colors.accent.default,
    fontWeight: '600',
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: colors.accent.default,
    borderColor: colors.accent.default,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    marginTop: spacing[1],
  },
  newRowIconWrap: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.accent.default,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRowText: {
    fontSize: fontSize.base,
    color: colors.accent.default,
    fontWeight: '500',
  },
  newForm: {
    gap: spacing[3],
    paddingTop: spacing[3],
    paddingHorizontal: spacing[1],
  },
  newInput: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    color: colors.text.primary,
    fontSize: fontSize.base,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
  },
  paletteRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: {
    borderWidth: 2.5,
    borderColor: colors.bg.surface,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  newActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelBtnText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  createBtn: {
    flex: 2,
    backgroundColor: colors.accent.default,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.bg.surface,
  },
  applyBtn: {
    margin: spacing[4],
    marginTop: spacing[2],
    backgroundColor: colors.accent.default,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.bg.surface,
  },
});
