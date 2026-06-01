'use client';

import { useEffect } from 'react';

export function CapacitorInit() {
  useEffect(() => {
    async function init() {
      try {
        const { Capacitor } = await import('@capacitor/core');
        const isNative = Capacitor.isNativePlatform();

        if (!isNative) return;

        // Status bar
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#09090b' });
        await StatusBar.show();

        // Splash screen - hide after app is ready
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();

        // Keyboard
        const { Keyboard } = await import('@capacitor/keyboard');
        Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('keyboard-open');
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-open');
        });

        // App listeners
        const { App } = await import('@capacitor/app');
        App.addListener('backButton', ({ canGoBack }) => {
          if (!canGoBack) {
            App.exitApp();
          }
        });
      } catch (e) {
        // Not running on a native platform — plugins won't be available
        console.debug('Capacitor native init skipped:', e);
      }
    }

    init();
  }, []);

  return null;
}
