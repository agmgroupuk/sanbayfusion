import { Capacitor } from '@capacitor/core';

/** True when running inside the Capacitor native shell (Android / iOS) */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** The current platform: 'android' | 'ios' | 'web' */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}

/** True on mobile-width screens OR inside native app */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return isNativeApp() || window.innerWidth < 768;
}
