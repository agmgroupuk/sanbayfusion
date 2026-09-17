import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'ai.maula.security',
    appName: 'Maula Security',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
    },
    plugins: {
        BackgroundGeolocation: {
            // Persist locations in memory; we send them via fetch
            persist: false,
            // Activity recognition for power management
            activityType: 'AutomotiveNavigation',
            pausesLocationUpdatesAutomatically: false,
        },
        Camera: {
            // Camera usage description (shown on iOS)
            presentationStyle: 'fullscreen',
        },
    },
    android: {
        // Runs in a foreground service with minimal notification
        // The notification is required on Android 8+ for foreground services
        // We keep the notification minimal and suppress the app icon
        allowMixedContent: false,
        captureInput: true,
        webContentsDebuggingEnabled: false,
    },
};

export default config;
