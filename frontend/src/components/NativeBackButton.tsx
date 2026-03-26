import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function NativeBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let remove: (() => void) | undefined;

    const setup = async () => {
      const handle = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      });
      remove = () => {
        void handle.remove();
      };
    };

    void setup();

    return () => {
      remove?.();
    };
  }, []);

  return null;
}
