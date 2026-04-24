/**
 * Central access point for expo-notifications.
 *
 * Import `Notifications` from here instead of importing expo-notifications
 * directly. In a development build or production APK this returns the real
 * module. Setting it to null disables all notifications gracefully
 * (every caller already guards with `if (Notifications)`).
 *
 * NOTE: expo-notifications crashes in Expo Go SDK 53+ at module load time.
 * Run `npx expo run:android` (development build) to use notifications.
 */
export const Notifications = require('expo-notifications') as typeof import('expo-notifications');
