import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';

export function SheetHandle() {
  return (
    <View style={styles.container}>
      <View style={styles.handle} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border.strong,
  },
});
