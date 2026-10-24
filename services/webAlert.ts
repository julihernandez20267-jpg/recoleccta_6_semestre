import { Alert, AlertButton, Platform } from 'react-native';

// En el navegador, Alert.alert de React Native no muestra nada, y algunos navegadores bloquean
// window.confirm. Por eso en web los avisos se envían a WebAlertHost, que los dibuja dentro de la app.

export type WebAlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type Listener = (request: WebAlertRequest) => void;

let listener: Listener | null = null;
let nextId = 1;

export function subscribeWebAlerts(fn: Listener) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

if (Platform.OS === 'web') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const request: WebAlertRequest = {
      id: nextId++,
      title,
      message,
      buttons: buttons && buttons.length > 0 ? buttons : [{ text: 'Aceptar' }],
    };
    if (listener) {
      listener(request);
    } else if (typeof window !== 'undefined') {
      window.alert([title, message].filter(Boolean).join('\n\n'));
    }
  };
}
