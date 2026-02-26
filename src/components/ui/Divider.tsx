import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';

interface DividerProps {
  horizontal?: boolean;
  spacing?: number;
}

export function Divider({ horizontal = true, spacing: gap = spacing[3] }: DividerProps) {
  if (horizontal) {
    return (
      <View style={[styles.horizontal, { marginVertical: gap }]} />
    );
  }
  return (
    <View style={[styles.vertical, { marginHorizontal: gap }]} />
  );
}

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    backgroundColor: colors.border.subtle,
    width: '100%',
  },
  vertical: {
    width: 1,
    backgroundColor: colors.border.subtle,
    alignSelf: 'stretch',
  },
});
