import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient from '@/services/apiClient';
import type { AuthSession, AuthUser } from '@/types/auth';

const STORAGE_KEY = 'recoleccta.auth.session.v1';
const INACTIVITY_TIMEOUT_MS = 1000 * 60 * 60 * 12;

type StoredSession = AuthSession & {
  lastActiveAt: number;
};

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<AuthUser, 'displayName' | 'photoURL'>>) => Promise<void>;
  setSession: (session: AuthSession | null) => Promise<void>;
  restoreSession: () => Promise<void>;
}

function buildStoredSession(session: AuthSession): StoredSession {
  return {
    ...session,
    lastActiveAt: Date.now(),
  };
}

function hasSessionExpired(lastActiveAt?: number): boolean {
  if (!lastActiveAt) {
    return false;
  }
  return Date.now() - lastActiveAt > INACTIVITY_TIMEOUT_MS;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,

  login: async (session: AuthSession) => {
    const stored = buildStoredSession(session);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(stored));
    set({ user: session.user, token: session.token });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    set({ user: null, token: null });
  },

  setSession: async (session: AuthSession | null) => {
    if (!session) {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      set({ user: null, token: null });
      return;
    }
    const stored = buildStoredSession(session);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(stored));
    set({ user: session.user, token: session.token });
  },

  updateProfile: async (updates) => {
    const { user, token } = get();
    if (!user || !token) return;

    try {
      await apiClient.put("/auth/profile", updates);
    } catch (e) {
      console.warn("Failed to sync profile update to backend", e);
    }

    const updatedUser: AuthUser = {
      ...user,
      ...updates,
    };

    const session: AuthSession = { user: updatedUser, token };
    const stored = buildStoredSession(session);
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(stored));
    set({ user: updatedUser });
  },


  restoreSession: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (!raw) {
        set({ loading: false });
        return;
      }

      const parsed = JSON.parse(raw) as StoredSession;
      if (!parsed?.user || !parsed?.token) {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
        set({ user: null, token: null, loading: false });
        return;
      }

      if (hasSessionExpired(parsed.lastActiveAt)) {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
        set({ user: null, token: null, loading: false });
        return;
      }

      // Update last active time
      const touched = buildStoredSession(parsed);
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(touched));
      set({ user: parsed.user, token: parsed.token });
    } catch {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
      set({ user: null, token: null });
    } finally {
      set({ loading: false });
    }
  },
}));
