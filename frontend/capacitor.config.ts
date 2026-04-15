import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stayhardy.app',
  appName: 'StayHardy',
  webDir: 'dist',
  android: {
    // Match modern WebView expectations; avoids mixed-content quirks for https APIs.
    allowMixedContent: false,
    // Enable hardware acceleration for smoother rendering
    overrideUserAgent: 'StayHardy Android',
    backgroundColor: '#000000',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#000000',
    // Prefer WKWebView with faster JS engine
    preferredContentMode: 'mobile',
  },
  plugins: {
    App: {
      appendUserAgent: 'StayHardy',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#000000",
      showSpinner: false,
    },
  },
  server: {
    // Helps third-party cookies / storage behavior on Android WebView in some setups.
    // Set to 'https' as the recommended standard scheme for Capacitor WebView.
    // This allows React Router BrowserRouter to function correctly.
    androidScheme: 'https',
  },
};

export default config;
