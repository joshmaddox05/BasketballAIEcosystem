import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  getMetadata,
  StorageReference,
  UploadTaskSnapshot
} from 'firebase/storage';
import { auth } from './firebase';

const storage = getStorage();

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
}

export interface UploadResult {
  url: string;
  path: string;
  metadata?: any;
}

export const storageService = {
  /**
   * Upload a video file with progress tracking
   */
  async uploadVideo(
    videoFile: Blob | File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to upload videos');
    }

    const timestamp = Date.now();
    const fileName = `shots/${user.uid}/${timestamp}.mp4`;
    const videoRef = ref(storage, fileName);
    
    if (onProgress) {
      // Use resumable upload with progress tracking
      const uploadTask = uploadBytesResumable(videoRef, videoFile, {
        contentType: 'video/mp4',
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString()
        }
      });
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot: UploadTaskSnapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progress,
              state: snapshot.state as any
            });
          },
          (error) => {
            console.error('Video upload failed:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata = await getMetadata(uploadTask.snapshot.ref);
              resolve({ 
                url: downloadURL, 
                path: fileName,
                metadata 
              });
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    } else {
      // Simple upload without progress
      const snapshot = await uploadBytes(videoRef, videoFile, {
        contentType: 'video/mp4',
        customMetadata: {
          uploadedBy: user.uid,
          uploadedAt: new Date().toISOString()
        }
      });
      const downloadURL = await getDownloadURL(snapshot.ref);
      const metadata = await getMetadata(snapshot.ref);
      return { 
        url: downloadURL, 
        path: fileName,
        metadata 
      };
    }
  },

  /**
   * Upload a profile image
   */
  async uploadProfileImage(imageFile: Blob | File): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to upload images');
    }

    const fileName = `profiles/${user.uid}/avatar.jpg`;
    const imageRef = ref(storage, fileName);
    
    const snapshot = await uploadBytes(imageRef, imageFile, {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString()
      }
    });
    
    return await getDownloadURL(snapshot.ref);
  },

  /**
   * Upload a thumbnail image for a video
   */
  async uploadThumbnail(thumbnailFile: Blob, videoPath: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to upload thumbnails');
    }

    // Extract the video filename without extension and add thumbnail suffix
    const pathParts = videoPath.split('/');
    const videoFileName = pathParts[pathParts.length - 1].replace('.mp4', '');
    const thumbnailPath = `thumbnails/${user.uid}/${videoFileName}_thumb.jpg`;
    
    const thumbnailRef = ref(storage, thumbnailPath);
    
    const snapshot = await uploadBytes(thumbnailRef, thumbnailFile, {
      contentType: 'image/jpeg',
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        videoPath
      }
    });
    
    return await getDownloadURL(snapshot.ref);
  },

  /**
   * Upload training drill media
   */
  async uploadDrillMedia(
    mediaFile: Blob | File,
    drillId: string,
    mediaType: 'video' | 'image'
  ): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to upload drill media');
    }

    const extension = mediaType === 'video' ? 'mp4' : 'jpg';
    const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    const fileName = `drills/${drillId}/${mediaType}.${extension}`;
    const mediaRef = ref(storage, fileName);
    
    const snapshot = await uploadBytes(mediaRef, mediaFile, {
      contentType,
      customMetadata: {
        uploadedBy: user.uid,
        uploadedAt: new Date().toISOString(),
        drillId,
        mediaType
      }
    });
    
    return await getDownloadURL(snapshot.ref);
  },

  /**
   * Delete a file from storage
   */
  async deleteFile(path: string): Promise<void> {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
  },

  /**
   * Get file metadata
   */
  async getFileMetadata(path: string) {
    const fileRef = ref(storage, path);
    return await getMetadata(fileRef);
  },

  /**
   * Generate a signed URL for temporary access
   */
  async getSignedUrl(path: string): Promise<string> {
    const fileRef = ref(storage, path);
    return await getDownloadURL(fileRef);
  },

  /**
   * List files in a directory
   */
  async listFiles(path: string) {
    // Note: Firebase Storage doesn't have a direct list operation in the client SDK
    // This would typically be done via a Cloud Function for security
    console.warn('listFiles should be implemented via Cloud Functions for security');
    throw new Error('Use Cloud Functions to list files');
  },

  /**
   * Get storage usage for a user
   */
  async getUserStorageUsage(userId?: string): Promise<{ totalBytes: number; fileCount: number }> {
    // This would typically be calculated via Cloud Functions
    // For now, return a placeholder
    console.warn('getUserStorageUsage should be implemented via Cloud Functions');
    return { totalBytes: 0, fileCount: 0 };
  }
};

// Helper functions for file validation
export const fileValidation = {
  isValidVideoFile(file: File): boolean {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    return allowedTypes.includes(file.type) && file.size <= maxSize;
  },

  isValidImageFile(file: File): boolean {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    return allowedTypes.includes(file.type) && file.size <= maxSize;
  },

  getOptimalVideoSettings() {
    return {
      maxDuration: 30, // seconds
      maxResolution: { width: 1920, height: 1080 },
      preferredFormat: 'mp4',
      maxBitrate: 5000 // kbps
    };
  }
};
