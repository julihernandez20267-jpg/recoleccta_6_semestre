import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/context/AuthContext';

export type GuardianRouteStatus = 'pending' | 'in-progress' | 'completed';

export type GuardianRoute = {
  id: string;
  name: string;
  zone: string;
  status: GuardianRouteStatus;
  etaMinutes: number | null;
  totalPoints: number;
  completedPoints: number;
  coordinates: Array<{ latitude: number; longitude: number }>;
};

type GuardianRoutesContextValue = {
  routes: GuardianRoute[];
  activeRoute: GuardianRoute | null;
  hasAssignedRoutes: boolean;
  assignRoutes: (nextRoutes: GuardianRoute[]) => Promise<void>;
  completeActiveRoute: () => Promise<void>;
  clearRoutes: () => Promise<void>;
};

const GuardianRoutesContext = createContext<GuardianRoutesContextValue | undefined>(undefined);

function buildStorageKey(uid?: number) {
  return `recoleccta.guardian.routes.v1.${uid ?? 'none'}`;
}

export function GuardianRoutesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [routes, setRoutes] = useState<GuardianRoute[]>([]);

  const storageKey = buildStorageKey(user?.uid);

  const persist = useCallback(
    async (nextRoutes: GuardianRoute[]) => {
      if (!user || user.role !== 'guardian') {
        return;
      }
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextRoutes));
    },
    [storageKey, user],
  );

  const assignRoutes = useCallback(
    async (nextRoutes: GuardianRoute[]) => {
      setRoutes(nextRoutes);
      await persist(nextRoutes);
    },
    [persist],
  );

  const clearRoutes = useCallback(async () => {
    setRoutes([]);
    if (user?.role === 'guardian') {
      await AsyncStorage.removeItem(storageKey);
    }
  }, [storageKey, user]);

  const completeActiveRoute = useCallback(async () => {
    setRoutes((prev) => {
      const inProgressIndex = prev.findIndex((item) => item.status === 'in-progress');
      if (inProgressIndex < 0) {
        return prev;
      }

      const nextPendingIndex = prev.findIndex((item, index) => item.status === 'pending' && index !== inProgressIndex);

      const next = prev.map((item, index) => {
        if (index === inProgressIndex) {
          return {
            ...item,
            status: 'completed' as const,
            completedPoints: item.totalPoints,
            etaMinutes: 0,
          };
        }

        if (index === nextPendingIndex) {
          return {
            ...item,
            status: 'in-progress' as const,
          };
        }

        return item;
      });

      void persist(next);
      return next;
    });
  }, [persist]);

  useEffect(() => {
    const restore = async () => {
      if (!user || user.role !== 'guardian') {
        setRoutes([]);
        return;
      }

      const raw = await AsyncStorage.getItem(storageKey);
      if (!raw) {
        setRoutes([]);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as GuardianRoute[];
        if (Array.isArray(parsed)) {
          setRoutes(parsed);
        } else {
          setRoutes([]);
        }
      } catch {
        setRoutes([]);
      }
    };

    void restore();
  }, [storageKey, user]);

  const value = useMemo<GuardianRoutesContextValue>(() => {
    const activeRoute = routes.find((item) => item.status === 'in-progress') ?? null;
    const hasAssignedRoutes = routes.length > 0;

    return {
      routes,
      activeRoute,
      hasAssignedRoutes,
      assignRoutes,
      completeActiveRoute,
      clearRoutes,
    };
  }, [assignRoutes, clearRoutes, completeActiveRoute, routes]);

  return <GuardianRoutesContext.Provider value={value}>{children}</GuardianRoutesContext.Provider>;
}

export function useGuardianRoutes() {
  const context = useContext(GuardianRoutesContext);
  if (!context) {
    throw new Error('useGuardianRoutes must be used inside GuardianRoutesProvider');
  }
  return context;
}
