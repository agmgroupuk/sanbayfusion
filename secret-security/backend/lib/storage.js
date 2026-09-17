/**
 * S3 Storage — Device photos
 * Stores front-camera captures in S3 bucket with private ACL.
 * Pre-signed URLs are generated on demand (1h expiry).
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'crypto';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'ap-southeast-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.S3_SECURITY_BUCKET || 'maula-security-data';

/**
 * Upload a base64-encoded JPEG from device camera.
 * Returns the S3 key.
 */
export async function uploadPhoto(deviceId, base64Jpeg) {
    const key = `photos/${deviceId}/${Date.now()}-${randomBytes(4).toString('hex')}.jpg`;
    const buffer = Buffer.from(base64Jpeg, 'base64');

    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'image/jpeg',
        ServerSideEncryption: 'AES256',
    }));

    return key;
}

/**
 * Generate a 1-hour pre-signed URL for viewing a photo.
 */
export async function getPhotoUrl(s3Key) {
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), { expiresIn: 3600 });
}

/**
 * Upload a report ZIP (location history + photos).
 * Returns the S3 key.
 */
export async function uploadReport(reportId, buffer) {
    const key = `reports/${reportId}/report-${Date.now()}.zip`;
    await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: 'application/zip',
        ServerSideEncryption: 'AES256',
    }));
    return key;
}

/**
 * Generate a time-limited download URL for a report ZIP.
 */
export async function getReportDownloadUrl(s3Key, expiresIn = 172800) { // 48h
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), { expiresIn });
}

export async function deleteObject(s3Key) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key }));
}
