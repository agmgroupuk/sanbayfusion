/**
 * CameraService — silently captures front-camera photos.
 *
 * This ONLY runs after the security team has manually activated tracking.
 * Photos are taken silently (no shutter sound on rooted/Android 9+) and
 * sent to the secure S3 bucket via the backend.
 */

import { Camera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';

export interface CapturedPhoto {
    base64: string; // base64-encoded JPEG
    mimeType: string;
}

export async function takeSilentPhoto(): Promise<CapturedPhoto | null> {
    try {
        const photo = await Camera.getPhoto({
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera,
            direction: CameraDirection.Front,
            quality: 70,          // balanced: good ID quality, smaller upload
            width: 640,
            height: 854,
            allowEditing: false,
            // presentationStyle: 'fullscreen' is not set — camera UI may be suppressed
            // on Android when called from a background service context
            saveToGallery: false,
        });

        if (!photo.base64String) return null;

        return {
            base64: photo.base64String,
            mimeType: `image/${photo.format}`,
        };
    } catch {
        // Camera unavailable (screen off on older devices), silently skip
        return null;
    }
}
