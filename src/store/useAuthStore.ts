import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { login as apiLogin, refreshToken, logout as apiLogout, ApiError } from '../services/api';

// expo-secure-store is native-only. On web fall back to localStorage.
const storage = {
  async set(key: string, value: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async del(key: string) {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

const JWT_KEY = 'ndhu_jwt';
const STUDENT_ID_KEY = 'ndhu_student_id';

interface AuthStore {
  jwt: string | null;
  student_id: string | null;
  is_logged_in: boolean;
  is_loading: boolean;
  error: string | null;

  login(student_id: string, password: string): Promise<void>;
  logout(): Promise<void>;
  restoreSession(): Promise<void>;
  handleRevocation(): void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  jwt: null,
  student_id: null,
  is_logged_in: false,
  is_loading: false,
  error: null,

  async login(student_id, password) {
    set({ is_loading: true, error: null });
    try {
      const { jwt, assignments } = await apiLogin(student_id, password);

      await storage.set(JWT_KEY, jwt);
      await storage.set(STUDENT_ID_KEY, student_id);

      set({ jwt, student_id, is_logged_in: true, is_loading: false, error: null });

      // Sync assignments in background
      const { syncAssignments } = await import('../services/sync');
      syncAssignments(jwt).catch((err) => console.warn('[auth] syncAssignments error:', err));
    } catch (e) {
      const msg = (e as Error).message;
      console.error('[auth] login error:', msg, e);
      set({ is_loading: false, error: msg, is_logged_in: false });
      throw e;
    }
  },

  async logout() {
    const { jwt } = get();
    // Fire and forget — we clear state regardless
    if (jwt) {
      apiLogout(jwt).catch(() => undefined);
    }
    await storage.del(JWT_KEY).catch(() => undefined);
    await storage.del(STUDENT_ID_KEY).catch(() => undefined);
    set({ jwt: null, student_id: null, is_logged_in: false, error: null });
  },

  async restoreSession() {
    set({ is_loading: true });
    try {
      const storedJwt = await storage.get(JWT_KEY);
      const storedId  = await storage.get(STUDENT_ID_KEY);

      if (!storedJwt) {
        set({ is_loading: false, is_logged_in: false });
        return;
      }

      try {
        const { jwt: newJwt } = await refreshToken(storedJwt);
        await storage.set(JWT_KEY, newJwt);
        set({ jwt: newJwt, student_id: storedId, is_logged_in: true, is_loading: false });
      } catch (e) {
        if (e instanceof ApiError && e.isRevoked) {
          await storage.del(JWT_KEY).catch(() => undefined);
          await storage.del(STUDENT_ID_KEY).catch(() => undefined);
          set({ jwt: null, student_id: null, is_logged_in: false, is_loading: false });
        } else {
          // Network error — keep existing JWT for offline access
          set({ jwt: storedJwt, student_id: storedId, is_logged_in: true, is_loading: false });
        }
      }
    } catch {
      set({ is_loading: false, is_logged_in: false });
    }
  },

  handleRevocation() {
    storage.del(JWT_KEY).catch(() => undefined);
    storage.del(STUDENT_ID_KEY).catch(() => undefined);
    set({ jwt: null, student_id: null, is_logged_in: false, error: 'Session expired. Please log in again.' });
  },
}));
