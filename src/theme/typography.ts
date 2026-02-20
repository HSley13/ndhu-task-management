export const fontSize = {
  xs:  11, sm: 13, base: 15, md: 17,
  lg:  20, xl: 24, '2xl': 30, '3xl': 38,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
};

export const letterSpacing = {
  tight:  -0.5,
  normal:  0,
  wide:    0.3,
} as const;

export const lineHeight = {
  tight:  1.2,
  normal: 1.5,
  loose:  1.8,
} as const;
