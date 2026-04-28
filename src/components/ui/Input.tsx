import React, { useRef, useState } from "react";
import {
  TextInput,
  View,
  Pressable,
  StyleSheet,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { colors, spacing, radius, fontSize } from "../../theme";

interface InputProps extends TextInputProps {
  icon?: React.ReactNode;
  rightAction?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  icon,
  rightAction,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = useSharedValue(colors.border.subtle);

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: withTiming(
      focused ? colors.accent.default : colors.border.subtle,
      { duration: 180 },
    ),
  }));

  return (
    <Animated.View style={[styles.container, animatedBorder, containerStyle]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <TextInput
        placeholderTextColor={colors.text.tertiary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, !icon && styles.inputNoIcon, style]}
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  icon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: fontSize.base,
    paddingLeft: spacing[2],
    paddingVertical: 0,
  },
  inputNoIcon: {
    paddingLeft: 0,
  },
  rightAction: {
    marginLeft: spacing[2],
  },
});
