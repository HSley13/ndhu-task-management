import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect, Circle, Line, G, Path } from 'react-native-svg';
import { colors, spacing, fontSize, radius } from '../../theme';
import { Button } from './Button';

type IllustrationType = 'calendar' | 'notes' | 'search' | 'done';

interface EmptyStateProps {
  illustration: IllustrationType;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
}

function CalendarIllustration() {
  const dots = [
    { cx: 20, cy: 20 }, { cx: 40, cy: 20 }, { cx: 60, cy: 20 }, { cx: 80, cy: 20 },
    { cx: 20, cy: 40 }, { cx: 40, cy: 40 },                       { cx: 80, cy: 40 },
    { cx: 20, cy: 60 },                       { cx: 60, cy: 60 }, { cx: 80, cy: 60 },
    { cx: 20, cy: 80 }, { cx: 40, cy: 80 }, { cx: 60, cy: 80 },
  ];
  const accentDots = [{ cx: 60, cy: 40 }, { cx: 40, cy: 60 }];
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      {dots.map((d, i) => (
        <Rect key={i} x={d.cx - 6} y={d.cy - 6} width={10} height={10} rx={3} fill={colors.border.default} />
      ))}
      {accentDots.map((d, i) => (
        <Rect key={i} x={d.cx - 6} y={d.cy - 6} width={10} height={10} rx={3} fill={colors.accent.default} />
      ))}
    </Svg>
  );
}

function NotesIllustration() {
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Rect x={14} y={20} width={72} height={60} rx={6} fill={colors.border.subtle} />
      <Rect x={10} y={14} width={72} height={60} rx={6} fill={colors.bg.elevated} stroke={colors.border.default} strokeWidth={1.5} />
      {/* Corner fold */}
      <Path d="M54 14 L82 14 L82 30 Z" fill={colors.accent.default} opacity={0.6} />
      {/* Text lines */}
      <Line x1={22} y1={34} x2={60} y2={34} stroke={colors.border.strong} strokeWidth={2} strokeLinecap="round" />
      <Line x1={22} y1={44} x2={72} y2={44} stroke={colors.border.strong} strokeWidth={2} strokeLinecap="round" />
      <Line x1={22} y1={54} x2={68} y2={54} stroke={colors.border.strong} strokeWidth={2} strokeLinecap="round" />
      <Line x1={22} y1={64} x2={50} y2={64} stroke={colors.border.strong} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

function SearchIllustration() {
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Circle cx={42} cy={42} r={26} fill={colors.bg.elevated} stroke={colors.border.default} strokeWidth={2} />
      <Line x1={62} y1={62} x2={82} y2={82} stroke={colors.border.strong} strokeWidth={4} strokeLinecap="round" />
      {/* dot grid inside */}
      {[30, 42, 54].flatMap((x) =>
        [30, 42, 54].map((y, i) => (
          <Circle key={`${x}-${y}`} cx={x} cy={y} r={2.5} fill={colors.border.strong} />
        ))
      )}
    </Svg>
  );
}

function DoneIllustration() {
  return (
    <Svg width={100} height={100} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={34} fill={colors.accent.soft} stroke={colors.accent.default} strokeWidth={2} />
      <Path
        d="M33 50 L44 62 L67 38"
        stroke={colors.accent.default}
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Radiating lines */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 40;
        const y1 = 50 + Math.sin(rad) * 40;
        const x2 = 50 + Math.cos(rad) * 46;
        const y2 = 50 + Math.sin(rad) * 46;
        return (
          <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={colors.accent.default} strokeWidth={2} strokeLinecap="round" opacity={0.6} />
        );
      })}
    </Svg>
  );
}

const ILLUSTRATIONS: Record<IllustrationType, React.FC> = {
  calendar: CalendarIllustration,
  notes:    NotesIllustration,
  search:   SearchIllustration,
  done:     DoneIllustration,
};

export function EmptyState({ illustration, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  const scale   = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value   = withSpring(1, { damping: 14, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 300 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const Illustration = ILLUSTRATIONS[illustration];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.illustrationWrap, animStyle]}>
        <Illustration />
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {actionLabel && onAction && (
        <Button
          label={actionLabel}
          onPress={onAction}
          variant="ghost"
          style={styles.action}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[8],
    gap: spacing[4],
  },
  illustrationWrap: {
    marginBottom: spacing[4],
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: fontSize.sm * 1.5,
  },
  action: {
    marginTop: spacing[4],
  },
});
