import { useEffect, useRef, useState } from 'react';

const INACTIVITY_WARNING_MS = 30 * 1000; // 30 segundos
const LOGOUT_GRACE_PERIOD_MS = 4 * 1000; // 4 segundos más después del aviso
const COUNTDOWN_INTERVAL_MS = 1000; // 1 segundo

type SessionTimeoutCallbacks = {
  onWarning: () => void;
  onLogout: () => void;
  onResetTimer: () => void;
  onCountdown?: (seconds: number) => void;
};

type SessionTimeoutOptions = {
  enabled?: boolean;
};

export function useSessionTimeout(callbacks: SessionTimeoutCallbacks, options?: SessionTimeoutOptions) {
  const timeoutRef = useRef<any>(null);
  const logoutTimeoutRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);
  const isWarningShownRef = useRef(false);
  const [countdown, setCountdown] = useState(0);
  const isEnabled = options?.enabled ?? true;

  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
      logoutTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };

  const resetTimer = () => {
    // Limpiar timeouts previos
    clearTimers();

    setCountdown(0);
    isWarningShownRef.current = false;

    if (!isEnabled) {
      return;
    }

    // Configurar nuevo timeout de inactividad
    timeoutRef.current = setTimeout(() => {
      if (!isWarningShownRef.current) {
        isWarningShownRef.current = true;
        setCountdown(4);
        callbacks.onWarning();

        // Iniciar contador regresivo
        let seconds = 4;
        countdownIntervalRef.current = setInterval(() => {
          seconds -= 1;
          setCountdown(seconds);
          callbacks.onCountdown?.(seconds);

          if (seconds <= 0) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            callbacks.onLogout();
          }
        }, COUNTDOWN_INTERVAL_MS);

        // Backup: Si no responde en 4 segundos, hacer logout
        logoutTimeoutRef.current = setTimeout(() => {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          callbacks.onLogout();
        }, LOGOUT_GRACE_PERIOD_MS);
      }
    }, INACTIVITY_WARNING_MS);

    callbacks.onResetTimer();
  };

  const dismissWarning = () => {
    if (!isEnabled) {
      clearTimers();
      setCountdown(0);
      isWarningShownRef.current = false;
      return;
    }

    // Usuario respondió "Sí", cancelar el logout countdown
    clearTimers();

    setCountdown(0);

    // Reiniciar el timer completo
    resetTimer();
  };

  useEffect(() => {
    if (!isEnabled) {
      clearTimers();
      setCountdown(0);
      isWarningShownRef.current = false;
      return;
    }

    resetTimer();

    return () => {
      clearTimers();
    };
  }, [isEnabled]);

  return { resetTimer, dismissWarning, countdown };
}
