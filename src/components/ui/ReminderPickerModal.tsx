import React, { useState } from 'react';
import {
  Modal, View, Text, Pressable, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius, fontSize } from '../../theme';

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Convert a compound d/h/m/s breakdown to total offset_minutes (negative = before) */
function compoundToMinutes(d: number, h: number, m: number, s: number): number {
  return -(d * 1440 + h * 60 + m + s / 60);
}

export function formatReminderOffset(offset_minutes: number): string {
  if (offset_minutes === 0) return 'At due time';
  const totalSecs = Math.round(Math.abs(offset_minutes) * 60);
  const d = Math.floor(totalSecs / 86400);
  const h = Math.floor((totalSecs % 86400) / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.length > 0 ? `${parts.join(' ')} before` : 'At due time';
}

// ─── presets ──────────────────────────────────────────────────────────────────

const PRESETS: { label: string; offset: number }[] = [
  { label: 'At due time',    offset: 0     },
  { label: '5 min before',   offset: -5    },
  { label: '15 min before',  offset: -15   },
  { label: '30 min before',  offset: -30   },
  { label: '1 hr before',    offset: -60   },
  { label: '3 hr before',    offset: -180  },
  { label: '1 day before',   offset: -1440 },
  { label: '1 week before',  offset: -10080},
];

// ─── props ────────────────────────────────────────────────────────────────────

export interface ReminderPickerModalProps {
  visible: boolean;
  onClose: () => void;
  /** offset_minutes values that are currently active */
  activeOffsets: number[];
  /** Called when user taps a preset row (parent decides add vs remove) */
  onToggleOffset: (offset_minutes: number) => void;
  /** Called when user adds a fully custom offset */
  onAddCustom: (offset_minutes: number) => void;
  /** Called when user removes a custom (non-preset) reminder */
  onRemoveCustom: (offset_minutes: number) => void;
  /** If no due date is set, disable the whole picker */
  disabled?: boolean;
}

// ─── component ────────────────────────────────────────────────────────────────

export function ReminderPickerModal({
  visible,
  onClose,
  activeOffsets,
  onToggleOffset,
  onAddCustom,
  onRemoveCustom,
  disabled = false,
}: ReminderPickerModalProps) {
  const [days, setDays] = useState('');
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [secs, setSecs] = useState('');

  const presetOffsets = PRESETS.map((p) => p.offset);
  const customActiveOffsets = activeOffsets.filter((o) => !presetOffsets.includes(o));

  const d = parseInt(days  || '0', 10) || 0;
  const h = parseInt(hours || '0', 10) || 0;
  const m = parseInt(mins  || '0', 10) || 0;
  const s = parseInt(secs  || '0', 10) || 0;
  const totalSecs = d * 86400 + h * 3600 + m * 60 + s;
  const canAdd = totalSecs > 0;

  function handleAddCustom() {
    if (!canAdd) return;
    const offset = compoundToMinutes(d, h, m, s);
    onAddCustom(offset);
    setDays(''); setHours(''); setMins(''); setSecs('');
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
          <Pressable
            style={styles.card}
            onPress={(e) => e.stopPropagation?.()}
          >
            {/* Header */}
            <View style={styles.cardHeader}>
              <Feather name="bell" size={16} color={colors.accent.default} />
              <Text style={styles.cardTitle}>Remind me</Text>
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                <Feather name="x" size={18} color={colors.text.tertiary} />
              </Pressable>
            </View>

            {disabled ? (
              <Text style={styles.disabledNote}>Set a due date first to enable reminders.</Text>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Preset rows */}
                <Text style={styles.sectionLabel}>Quick options</Text>
                {PRESETS.map(({ label, offset }) => {
                  const active = activeOffsets.includes(offset);
                  return (
                    <Pressable
                      key={offset}
                      style={[styles.presetRow, active && styles.presetRowActive]}
                      onPress={() => onToggleOffset(offset)}
                    >
                      <View style={[styles.checkBox, active && styles.checkBoxActive]}>
                        {active && <Feather name="check" size={12} color={colors.bg.surface} />}
                      </View>
                      <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}

                {/* Active custom reminders */}
                {customActiveOffsets.length > 0 && (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: spacing[3] }]}>Custom</Text>
                    {customActiveOffsets.map((o) => (
                      <View key={o} style={[styles.presetRow, styles.presetRowActive]}>
                        <View style={[styles.checkBox, styles.checkBoxActive]}>
                          <Feather name="check" size={12} color={colors.bg.surface} />
                        </View>
                        <Text style={[styles.presetLabel, styles.presetLabelActive, { flex: 1 }]}>
                          {formatReminderOffset(o)}
                        </Text>
                        <Pressable onPress={() => onRemoveCustom(o)} hitSlop={8}>
                          <Feather name="trash-2" size={14} color={colors.text.tertiary} />
                        </Pressable>
                      </View>
                    ))}
                  </>
                )}

                {/* Compound d/h/m/s custom input */}
                <Text style={[styles.sectionLabel, { marginTop: spacing[3] }]}>Custom countdown</Text>
                <View style={styles.countdownCard}>
                  <View style={styles.countdownFields}>
                    {([
                      { label: 'Days',  val: days,  set: setDays  },
                      { label: 'Hours', val: hours, set: setHours },
                      { label: 'Mins',  val: mins,  set: setMins  },
                      { label: 'Secs',  val: secs,  set: setSecs  },
                    ] as const).map(({ label, val, set }, i) => (
                      <View key={label} style={styles.countdownField}>
                        {i > 0 && <Text style={styles.countdownColon}>:</Text>}
                        <TextInput
                          value={val}
                          onChangeText={(t) => set(t.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          placeholderTextColor={colors.text.tertiary}
                          keyboardType="number-pad"
                          maxLength={i === 0 ? 4 : 2}
                          style={styles.countdownInput}
                          returnKeyType="done"
                        />
                        <Text style={styles.countdownUnit}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    style={[styles.addBtn, !canAdd && styles.addBtnDisabled]}
                    onPress={handleAddCustom}
                    disabled={!canAdd}
                  >
                    <Feather name="plus" size={16} color={colors.bg.surface} />
                    <Text style={styles.addBtnText}>Add</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}

            {/* Done button */}
            <Pressable style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

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
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
  },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing[2],
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    marginBottom: spacing[1],
  },
  presetRowActive: {
    backgroundColor: colors.accent.soft ?? (colors.accent.default + '18'),
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
  presetLabel: {
    fontSize: fontSize.base,
    color: colors.text.secondary,
    flex: 1,
  },
  presetLabelActive: {
    color: colors.accent.default,
    fontWeight: '600',
  },
  countdownCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing[4],
    gap: spacing[3],
  },
  countdownFields: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  countdownField: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    flexDirection: 'column',
  },
  countdownColon: {
    position: 'absolute',
    left: -6,
    top: 10,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.tertiary,
  },
  countdownInput: {
    width: '100%',
    textAlign: 'center',
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    backgroundColor: colors.bg.input ?? colors.bg.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing[2],
  },
  countdownUnit: {
    fontSize: fontSize.xs,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    backgroundColor: colors.accent.default,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
  },
  addBtnText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.bg.surface,
  },
  disabledNote: {
    fontSize: fontSize.sm,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    textAlign: 'center',
  },
  doneBtn: {
    margin: spacing[4],
    marginTop: spacing[2],
    backgroundColor: colors.accent.default,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.bg.surface,
  },
});
