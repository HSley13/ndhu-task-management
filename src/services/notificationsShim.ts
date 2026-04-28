/**
 * Central access point for expo-notifications.
 *
 * Import `Notifications` from here instead of importing expo-notifications
 * directly. On native (iOS/Android) this returns the real module. On web it
 * returns null so every caller can guard with `if (!Notifications) return`.
 *
 * NOTE: expo-notifications is not supported in Expo Go SDK 53+. You must use
 * a development build (`npx expo run:android` / `npx expo run:ios`).
 */
import { Platform } from 'react-native';

export const Notifications: typeof import('expo-notifications') | null =
  Platform.OS === 'web'
    ? null
    : (require('expo-notifications') as typeof import('expo-notifications'));
