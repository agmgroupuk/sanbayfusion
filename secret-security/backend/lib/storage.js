/**
 * Local storage adapter for device photos and generated reports.
 * The storage root can be mounted as a Railway volume or replaced by a
 * provider-neutral object store during the deployment phase.
 */

import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';

const STORAGE_ROOT = path.resolve(process.env.SECURITY_STORAGE_PATH || './data/storage');

async function saveObject(key, buffer) {
    const filePath = path.join(STORAGE_ROOT, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, buffer);
    return key;
}

export async function readObject(key) {
    return readFile(path.join(STORAGE_ROOT, key));
}

export async function uploadPhoto(deviceId, base64Jpeg) {
    const key = `photos/${deviceId}/${Date.now()}-${randomBytes(4).toString('hex')}.jpg`;
    return saveObject(key, Buffer.from(base64Jpeg, 'base64'));
}

export async function getPhotoUrl(key) {
    return `/api/storage/${encodeURIComponent(key)}`;
}

export async function uploadReport(reportId, buffer) {
    const key = `reports/${reportId}/report-${Date.now()}.zip`;
    return saveObject(key, buffer);
}

export async function getReportDownloadUrl(key) {
    return `/api/storage/${encodeURIComponent(key)}`;
}

export async function deleteObject(key) {
    await unlink(path.join(STORAGE_ROOT, key));
}
