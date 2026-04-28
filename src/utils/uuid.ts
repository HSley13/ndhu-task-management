import * as Crypto from "expo-crypto";

/** Cross-platform UUID v4 (works in Hermes/Expo Go without crypto polyfill). */
export function uuidv4(): string {
  return Crypto.randomUUID();
}
