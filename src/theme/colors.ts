export const colors = {
  bg: {
    base:     '#0A0A0F',
    surface:  '#111118',
    elevated: '#1A1A24',
    input:    '#16161F',
  },
  border: {
    subtle:  '#1E1E2E',
    default: '#2A2A3D',
    strong:  '#3D3D5C',
  },
  text: {
    primary:   '#F0F0FF',
    secondary: '#8888AA',
    tertiary:  '#55556A',
    inverse:   '#0A0A0F',
  },
  accent: {
    default: '#6C63FF',
    soft:    '#6C63FF22',
    muted:   '#6C63FF44',
    glow:    '#6C63FF66',
  },
  success: '#22D3A5',
  warning: '#F59E0B',
  danger:  '#FF4D6A',
  info:    '#38BDF8',
  labels:  [
    '#6C63FF', '#22D3A5', '#F59E0B', '#FF4D6A',
    '#38BDF8', '#E879F9', '#FB923C', '#A3E635',
  ],
} as const;

export type Colors = typeof colors;
