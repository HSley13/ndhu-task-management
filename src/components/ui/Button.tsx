import React from "react";
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { colors, fontSize, spacing, radius } from "../../theme";
import { useHaptics } from "../../hooks/useHaptics";

type ButtonVariant = "primary" | "ghost" | "danger";

interface ButtonProps {
  variant?: ButtonVariant;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  variant = "primary",
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const haptics = useHaptics();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }
  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }
  function handlePress() {
    haptics.light();
    onPress();
  }

  const containerStyle = [
    styles.base,
    variant === "primary" && styles.primary,
    variant === "ghost" && styles.ghost,
    variant === "danger" && styles.danger,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.label,
    variant === "primary" && styles.labelPrimary,
    variant === "ghost" && styles.labelGhost,
    variant === "danger" && styles.labelDanger,
  ];

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[animatedStyle, containerStyle]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? "#fff" : colors.accent.default}
        />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "transparent",
  },
  primary: {
    backgroundColor: colors.accent.default,
    borderColor: colors.accent.default,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: colors.border.default,
  },
  danger: {
    backgroundColor: "transparent",
    borderColor: colors.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: fontSize.base,
    fontWeight: "600",
  },
  labelPrimary: {
    color: "#fff",
  },
  labelGhost: {
    color: colors.text.primary,
  },
  labelDanger: {
    color: colors.danger,
  },
});
