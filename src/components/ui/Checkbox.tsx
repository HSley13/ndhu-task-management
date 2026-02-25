import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../theme';
import { useHaptics } from '../../hooks/useHaptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  size?: number;
}

export function Checkbox({ checked, onChange, size = 22 }: CheckboxProps) {
  const haptics = useHaptics();
  const scale = useSharedValue(1);
  const checkProgress = useSharedValue(checked ? 1 : 0);
  const fillOpacity = useSharedValue(checked ? 1 : 0);

  // Total path length for the checkmark — approximate for a 22px circle
  const pathLength = size * 0.7;

  useEffect(() => {
    checkProgress.value = withTiming(checked ? 1 : 0, { duration: 220 });
    fillOpacity.value = withTiming(checked ? 1 : 0, { duration: 180 });
  }, [checked]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const circleProps = useAnimatedProps(() => ({
    fill: checked ? colors.accent.default : 'transparent',
    fillOpacity: fillOpacity.value,
    stroke: checked ? colors.accent.default : colors.border.default,
  }));

  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: pathLength * (1 - checkProgress.value),
  }));

  function handlePress() {
    haptics.light();
    scale.value = withSequence(
      withSpring(1.2, { damping: 10 }),
      withSpring(1.0, { damping: 10 }),
    );
    onChange();
  }

  const r = size / 2 - 1.5;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={outerStyle}>
        <Svg width={size} height={size}>
          <AnimatedCircle
            cx={cx}
            cy={cy}
            r={r}
            strokeWidth={1.8}
            animatedProps={circleProps}
          />
          <AnimatedPath
            d={`M ${cx - r * 0.42} ${cy} L ${cx - r * 0.1} ${cy + r * 0.38} L ${cx + r * 0.45} ${cy - r * 0.38}`}
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={pathLength}
            animatedProps={pathProps}
          />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}
