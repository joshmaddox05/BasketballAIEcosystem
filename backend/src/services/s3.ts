import AWS from 'aws-sdk';
import { randomUUID } from 'crypto';

// Initialize AWS S3
const s3 = new AWS.S3({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || 'basketball-ai-uploads';

export interface SignedUploadRequest {
  fileName: string;
  mimeType: string;
  userId: string;
  duration?: number;
  fps?: number;
  angle?: 'front' | 'side' | '3quarter';
}

export interface SignedUploadResponse {
  putUrl: string;
  key: string;
  videoId: string;
  expiresIn: number;
}

export interface VideoMetadata {
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number;
  fps?: number;
  angle?: 'front' | 'side' | '3quarter';
  storageUrl: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  uploadedAt: Date;
}

/**
 * Generate a pre-signed URL for video upload
 */
export const generateSignedUploadUrl = async (
  request: SignedUploadRequest
): Promise<SignedUploadResponse> => {
  const videoId = randomUUID();
  const timestamp = Date.now();
  const key = `videos/${request.userId}/${videoId}/${timestamp}-${request.fileName}`;
  
  // Generate pre-signed URL for PUT operation
  const putUrl = s3.getSignedUrl('putObject', {
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: request.mimeType,
    Expires: 3600, // 1 hour
    Metadata: {
      userId: request.userId,
      videoId: videoId,
      originalName: request.fileName,
      duration: request.duration?.toString() || '',
      fps: request.fps?.toString() || '',
      angle: request.angle || '',
    },
  });

  return {
    putUrl,
    key,
    videoId,
    expiresIn: 3600,
  };
};

/**
 * Get a pre-signed URL for video download/viewing
 */
export const generateSignedDownloadUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  return s3.getSignedUrl('getObject', {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn,
  });
};

/**
 * Delete a video from S3
 */
export const deleteVideo = async (key: string): Promise<void> => {
  await s3.deleteObject({
    Bucket: BUCKET_NAME,
    Key: key,
  }).promise();
};

/**
 * Get video metadata from S3
 */
export const getVideoMetadata = async (key: string) => {
  const response = await s3.headObject({
    Bucket: BUCKET_NAME,
    Key: key,
  }).promise();

  return {
    size: response.ContentLength || 0,
    mimeType: response.ContentType || 'video/mp4',
    lastModified: response.LastModified,
    metadata: response.Metadata || {},
  };
};

/**
 * List videos for a user
 */
export const listUserVideos = async (userId: string, limit: number = 50) => {
  const response = await s3.listObjectsV2({
    Bucket: BUCKET_NAME,
    Prefix: `videos/${userId}/`,
    MaxKeys: limit,
  }).promise();

  return response.Contents?.map(obj => ({
    key: obj.Key,
    size: obj.Size || 0,
    lastModified: obj.LastModified,
  })) || [];
};

export { s3, BUCKET_NAME };
