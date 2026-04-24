import { useAuthStore } from '../store/useAuthStore';
import type { RawAssignment } from '../types';

const BASE_URL = process.env['EXPO_PUBLIC_API_URL'] ?? 'https://ndhutaskmanagement.hslay13.online';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public isRevoked: boolean = false,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authenticatedFetch(
  jwt: string,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 204) return res;

  if (res.status === 401) {
    let message = 'Unauthorized';
    try {
      const body = (await res.json()) as { error?: string };
      message = body.error ?? message;
    } catch { /* ignore parse errors */ }
    const err = new ApiError(401, message, true);
    // Side-effect: clear session automatically from anywhere in the app
    useAuthStore.getState().handleRevocation();
    throw err;
  }

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      message = body.error ?? message;
    } catch { /* ignore parse errors */ }
    throw new ApiError(res.status, message);
  }

  return res;
}

export async function login(
  student_id: string,
  password: string,
): Promise<{ jwt: string; assignments: RawAssignment[] }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id, password }),
  });

  if (res.status === 400) {
    const body = (await res.json()) as { error?: string };
    throw new ApiError(400, body.error ?? 'Bad request');
  }
  if (res.status === 401) {
    throw new ApiError(401, 'Invalid credentials');
  }
  if (res.status === 503) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(503, body.error ?? 'Moodle unavailable');
  }
  if (!res.ok) {
    const body = (await res.json()) as { error?: string };
    throw new ApiError(res.status, body.error ?? 'Login failed');
  }

  return res.json() as Promise<{ jwt: string; assignments: RawAssignment[] }>;
}

export async function refreshToken(jwt: string): Promise<{ jwt: string }> {
  const res = await authenticatedFetch(jwt, '/auth/refresh', { method: 'POST' });
  return res.json() as Promise<{ jwt: string }>;
}

export async function logout(jwt: string): Promise<void> {
  await authenticatedFetch(jwt, '/auth/logout', { method: 'POST' });
}

export async function getAssignments(
  jwt: string,
  since?: number,
): Promise<{ assignments: RawAssignment[]; last_synced: number }> {
  const url = since != null ? `/assignments?since=${Math.floor(since / 1000)}` : '/assignments';
  const res = await authenticatedFetch(jwt, url);
  return res.json() as Promise<{ assignments: RawAssignment[]; last_synced: number }>;
}

export async function registerPushToken(
  jwt: string,
  expo_push_token: string,
): Promise<void> {
  if (!expo_push_token.startsWith('ExponentPushToken[')) {
    throw new ApiError(400, 'Invalid push token format');
  }
  await authenticatedFetch(jwt, '/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ expo_push_token }),
  });
}
