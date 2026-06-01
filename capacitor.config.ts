import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ashbi.budgetapp',
  appName: 'Antigravity Budget',
  webDir: 'out',
  server: {
    url: 'https://budget.ashbi.ca',
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    scheme: 'AntigravityBudget',
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#09090b',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#09090b',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
    },
    App: {
      backgroundColor: '#09090b',
    },
  },
};

export default config;
