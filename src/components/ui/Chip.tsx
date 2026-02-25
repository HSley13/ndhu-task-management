import React from 'react';
import { Text, Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, radius, fontSize } from '../../theme';

interface ChipProps {
  label: string;
  color?: string;
  active?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

export function Chip({ label, color = colors.accent.default, active = false, onPress, onRemove }: ChipProps) {
  const bg      = active ? color + '22' : 'transparent';
  const border  = active ? color : colors.border.subtle;
  const textCol = active ? color : colors.text.secondary;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg, borderColor: border }]}
    >
      <Text style={[styles.label, { color: textCol }]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={6} style={styles.removeBtn}>
          <Text style={[styles.removeText, { color: textCol }]}>×</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    gap: spacing[1],
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  removeBtn: {
    marginLeft: 2,
  },
  removeText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    lineHeight: 18,
  },
});
