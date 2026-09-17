/**
 * Builds a stable device fingerprint from hardware identifiers.
 * Uses ANDROID_ID as primary, combined with model/OS for uniqueness.
 */

export async function buildDeviceId(): Promise<string> {
    const cached = localStorage.getItem('maula-device-id');
    if (cached) return cached;

    try {
        const { Device } = await import('@capacitor/device');
        const id = await Device.getId();
        const info = await Device.getInfo();
        // Combine hardware UUID with model to reduce collision risk
        const raw = `${id.identifier}-${info.model}-${info.operatingSystem}`;
        const h = await sha256(raw);
        localStorage.setItem('maula-device-id', h);
        return h;
    } catch {
        // Fallback to a random UUID persisted in localStorage
        const fallback = crypto.randomUUID();
        localStorage.setItem('maula-device-id', fallback);
        return fallback;
    }
}

async function sha256(message: string): Promise<string> {
    const data = new TextEncoder().encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}
