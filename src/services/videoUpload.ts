import * as FileSystem from 'expo-file-system';
import { apiClient } from './apiClient';

export interface VideoUploadResponse {
  putUrl: string;
  key: string;
  videoId: string;
  expiresIn: number;
  requestId: string;
}

export interface VideoUploadOptions {
  fileName: string;
  mimeType: string;
  duration?: number;
  fps?: number;
  angle?: 'front' | 'side' | '3quarter';
  onProgress?: (progress: number) => void;
  onSuccess?: (response: VideoUploadResponse) => void;
  onError?: (error: Error) => void;
}

export interface RetryOptions {
  maxRetries: number;
  retryDelay: number; // milliseconds
  backoffMultiplier: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffMultiplier: 2,
};

export class VideoUploadService {
  private static instance: VideoUploadService;
  private activeUploads: Map<string, AbortController> = new Map();

  static getInstance(): VideoUploadService {
    if (!VideoUploadService.instance) {
      VideoUploadService.instance = new VideoUploadService();
    }
    return VideoUploadService.instance;
  }

  /**
   * Upload a video file with retry logic and progress tracking
   */
  async uploadVideo(
    uri: string,
    options: VideoUploadOptions,
    retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS
  ): Promise<VideoUploadResponse> {
    const uploadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();
    this.activeUploads.set(uploadId, abortController);

    try {
      return await this.uploadWithRetry(uri, options, retryOptions, uploadId);
    } finally {
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(uploadId: string): void {
    const abortController = this.activeUploads.get(uploadId);
    if (abortController) {
      abortController.abort();
      this.activeUploads.delete(uploadId);
    }
  }

  /**
   * Get all active uploads
   */
  getActiveUploads(): string[] {
    return Array.from(this.activeUploads.keys());
  }

  private async uploadWithRetry(
    uri: string,
    options: VideoUploadOptions,
    retryOptions: RetryOptions,
    uploadId: string
  ): Promise<VideoUploadResponse> {
    let lastError: Error | null = null;
    let delay = retryOptions.retryDelay;

    for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
      try {
        // Check if upload was cancelled
        if (this.activeUploads.get(uploadId)?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const result = await this.performUpload(uri, options, uploadId);
        options.onSuccess?.(result);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        options.onError?.(lastError);

        // Don't retry on certain errors
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === retryOptions.maxRetries) {
          throw lastError;
        }

        // Wait before retry
        await this.delay(delay);
        delay *= retryOptions.backoffMultiplier;
      }
    }

    throw lastError || new Error('Upload failed after all retries');
  }

  private async performUpload(
    uri: string,
    options: VideoUploadOptions,
    uploadId: string
  ): Promise<VideoUploadResponse> {
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('Video file not found');
    }

    // Request signed URL from backend
    const uploadResponse = await apiClient.post<VideoUploadResponse>('/api/videos/signed-url', {
      fileName: options.fileName,
      mimeType: options.mimeType,
      duration: options.duration,
      fps: options.fps,
      angle: options.angle,
    });

    const { putUrl, key, videoId } = uploadResponse;

    // Upload video to S3
    const uploadResult = await FileSystem.uploadAsync(putUrl, uri, {
      httpMethod: 'PUT',
      headers: {
        'Content-Type': options.mimeType,
      },
      uploadProgressCallback: (uploadProgress) => {
        const progress = uploadProgress.totalBytesSent / uploadProgress.totalBytesExpectedToSend;
        options.onProgress?.(progress);
      },
    });

    if (uploadResult.status !== 200) {
      throw new Error(`Upload failed with status: ${uploadResult.status}`);
    }

    return uploadResponse;
  }

  private isNonRetryableError(error: Error): boolean {
    const nonRetryableErrors = [
      'Video file not found',
      'User not authenticated',
      'Upload cancelled',
      'Invalid or expired token',
    ];

    return nonRetryableErrors.some(msg => error.message.includes(msg));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const videoUploadService = VideoUploadService.getInstance();
