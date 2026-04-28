import React from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { colors } from "../../theme";

interface PressableRowProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressableRow({
  onPress,
  onLongPress,
  style,
  children,
  ...rest
}: PressableRowProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      pressed.value === 1 ? colors.border.subtle : "transparent",
      { duration: 80 },
    ),
    transform: [
      {
        scale: withSpring(pressed.value === 1 ? 0.985 : 1, {
          damping: 15,
          stiffness: 400,
        }),
      },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
