import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ashbi.budgetapp',
  appName: 'BudgetApp',
  webDir: 'dist',
  server: {
    url: 'https://budget.ashbi.ca',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#09090b',
    },
  },
};

export default config;
