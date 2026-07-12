import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.oraprojekt.app',
  appName: 'OraProjekt',
  // For hybrid approach: the mobile app loads the deployed web app via WebView.
  // The web app (with API routes) is deployed separately to a server.
  // Change this URL to your production deployment.
  webDir: 'out',
  server: {
    url: process.env.CAPACITOR_URL || 'https://oraprojekt.com',
    cleartext: false,
    androidScheme: 'https',
    iosScheme: 'https',
  },
  backgroundColor: '#10b981',
  ios: {
    contentInset: 'always',
    backgroundColor: '#ffffff',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#10b981',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
