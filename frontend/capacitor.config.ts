import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stayhardy.app',
  appName: 'StayHardy',
  webDir: 'dist',
  android: {
    // Match modern WebView expectations; avoids mixed-content quirks for https APIs.
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
  },
  plugins: {
    App: {
      appendUserAgent: 'StayHardy',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  server: {
    // Helps third-party cookies / storage behavior on Android WebView in some setups.
    androidScheme: 'https',
  },
};

export default config;
