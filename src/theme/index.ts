import { useCallback } from 'react';
import { colors, type Colors } from './colors';
import { fontSize, fontWeight, letterSpacing, lineHeight } from './typography';
import { spacing, radius } from './spacing';

export { colors, fontSize, fontWeight, letterSpacing, lineHeight, spacing, radius };
export type { Colors };

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.accent.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 12,
  },
} as const;

export const theme = {
  colors,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  spacing,
  radius,
  shadows,
} as const;

export type Theme = typeof theme;

export function useTheme(): Theme {
  return theme;
}
