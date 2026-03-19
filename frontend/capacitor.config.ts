import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stayhardy.app',
  appName: 'StayHardy',
  webDir: 'dist',
  server: {
    url: 'https://www.stayhardy.com',
    cleartext: false,
    allowNavigation: ['www.stayhardy.com']
  }
};

export default config;
