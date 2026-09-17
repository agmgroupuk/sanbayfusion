/**
 * imageToCodeService — Image-to-code conversion via Azure Vision
 * Wraps /api/canvas/image-to-code endpoint
 * Upload a UI mockup screenshot → get generated code
 */

const API_ENDPOINT = '/api/canvas/image-to-code';

export interface ImageToCodeResult {
    success: boolean;
    code?: string;
    error?: string;
}

export type ImageToCodeLanguage = 'html' | 'react' | 'vue' | 'angular' | 'svelte' | 'nextjs';

export const imageToCodeService = {
    /**
     * Convert a UI screenshot to code
     * @param image - Base64 encoded image (without data URI prefix)
     * @param mimeType - Image MIME type (e.g. 'image/png')
     * @param language - Output language
     */
    async convert(image: string, mimeType: string, language: ImageToCodeLanguage = 'react'): Promise<ImageToCodeResult> {
        const res = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ image, mimeType, language }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to convert image to code');
        }

        return data;
    },

    /**
     * Convert from a File object (convenience wrapper)
     * @param file - File object (image)
     * @param language - Output language
     */
    async convertFile(file: File, language: ImageToCodeLanguage = 'react'): Promise<ImageToCodeResult> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const dataUrl = reader.result as string;
                    const base64 = dataUrl.split(',')[1];
                    const result = await this.convert(base64, file.type, language);
                    resolve(result);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read image file'));
            reader.readAsDataURL(file);
        });
    },
};

export default imageToCodeService;
