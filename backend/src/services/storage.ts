import { Storage } from '@google-cloud/storage';
import { admin } from './firebase';
import { v4 as uuidv4 } from 'uuid';

// Initialize Cloud Storage
let storageClient: Storage;

export const initializeStorage = () => {
  if (!storageClient) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    
    if (process.env.NODE_ENV === 'test') {
      // Mock storage for tests
      return null;
    }

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID environment variable is required');
    }

    storageClient = new Storage({
      projectId,
    });
  }

  return storageClient;
};

export interface SignedUrlOptions {
  userId: string;
  fileName: string;
  contentType: string;
  size: number;
}

export interface SignedUrlResult {
  uploadUrl: string;
  fileKey: string;
  expiresAt: string;
}

/**
 * Generate a signed URL for direct video upload to Firebase Storage
 * 
 * @param options - Upload configuration
 * @returns Signed upload URL and file metadata
 */
export const generateSignedUploadUrl = async (
  options: SignedUrlOptions
): Promise<SignedUrlResult> => {
  const { userId, fileName, contentType, size } = options;

  // Validate file type
  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
  if (!allowedTypes.includes(contentType)) {
    throw new Error(`Invalid file type: ${contentType}. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Validate file size (max 500MB)
  const maxSize = 500 * 1024 * 1024; // 500MB in bytes
  if (size > maxSize) {
    throw new Error(`File size exceeds maximum allowed size of 500MB`);
  }

  // Generate unique file key
  const timestamp = Date.now();
  const fileId = uuidv4();
  const extension = fileName.split('.').pop() || 'mp4';
  const fileKey = `videos/${userId}/${timestamp}-${fileId}.${extension}`;

  // Get storage bucket
  const bucket = admin.storage().bucket();
  const file = bucket.file(fileKey);

  // Generate signed URL (expires in 1 hour)
  const expiresInMinutes = 60;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: expiresAt,
    contentType,
    extensionHeaders: {
      'x-goog-meta-user-id': userId,
      'x-goog-meta-original-name': fileName,
    },
  });

  return {
    uploadUrl: signedUrl,
    fileKey,
    expiresAt: expiresAt.toISOString(),
  };
};

/**
 * Get a signed URL for reading a video file
 * 
 * @param fileKey - Storage path to the file
 * @param expiresInMinutes - URL expiration time (default: 60 minutes)
 * @returns Signed download URL
 */
export const generateSignedDownloadUrl = async (
  fileKey: string,
  expiresInMinutes: number = 60
): Promise<string> => {
  const bucket = admin.storage().bucket();
  const file = bucket.file(fileKey);

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const [signedUrl] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: expiresAt,
  });

  return signedUrl;
};

/**
 * Delete a video file from storage
 * 
 * @param fileKey - Storage path to the file
 */
export const deleteVideoFile = async (fileKey: string): Promise<void> => {
  const bucket = admin.storage().bucket();
  const file = bucket.file(fileKey);

  await file.delete();
};

/**
 * Check if a file exists in storage
 * 
 * @param fileKey - Storage path to the file
 * @returns True if file exists
 */
export const fileExists = async (fileKey: string): Promise<boolean> => {
  try {
    const bucket = admin.storage().bucket();
    const file = bucket.file(fileKey);
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    return false;
  }
};

/**
 * Get file metadata from storage
 * 
 * @param fileKey - Storage path to the file
 * @returns File metadata
 */
export const getFileMetadata = async (fileKey: string) => {
  const bucket = admin.storage().bucket();
  const file = bucket.file(fileKey);
  const [metadata] = await file.getMetadata();
  
  return {
    size: parseInt(metadata.size || '0'),
    contentType: metadata.contentType,
    created: metadata.timeCreated,
    updated: metadata.updated,
  };
};
