import React, { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import type { AuthSession, AuthUser } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (session: AuthSession) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<AuthUser, 'displayName' | 'photoURL'>>) => Promise<void>;
  setSession: (session: AuthSession | null) => Promise<void>;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return <>{children}</>;
}

export function useAuth(): AuthContextValue {
  const store = useAuthStore();

  return {
    user: store.user,
    token: store.token,
    loading: store.loading,
    login: store.login,
    logout: store.logout,
    updateProfile: store.updateProfile,
    setSession: store.setSession,
  };
}
