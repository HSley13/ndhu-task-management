import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fontSize, radius, spacing } from "../../theme";

interface BadgeProps {
  count: number;
  color?: string;
}

export function Badge({ count, color = colors.accent.default }: BadgeProps) {
  if (count === 0) return null;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + "33", borderColor: color },
      ]}
    >
      <Text style={[styles.text, { color }]}>{count > 99 ? "99+" : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: "700",
    lineHeight: 14,
  },
});
