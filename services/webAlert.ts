import { Alert, AlertButton, Platform } from 'react-native';

// En el navegador, Alert.alert de React Native no muestra nada. Aquí se reemplaza por los
// diálogos del navegador para que avisos y confirmaciones funcionen igual que en el celular.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }

    const cancel = buttons.find((b) => b.style === 'cancel');
    const actions = buttons.filter((b) => b !== cancel);
    // Con dos opciones sin "cancelar", Aceptar = la primera y Cancelar = la segunda.
    const accept = actions[0];
    const decline = cancel ?? actions[1];
    const hint = decline?.text ? `\n\n(Aceptar: ${accept.text} · Cancelar: ${decline.text})` : '';

    if (window.confirm(text + hint)) {
      accept.onPress?.();
    } else {
      decline?.onPress?.();
    }
  };
}
