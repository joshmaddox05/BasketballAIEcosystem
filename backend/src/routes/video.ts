import { FastifyRequest, FastifyReply } from 'fastify';
import { generateSignedUploadUrl, generateSignedDownloadUrl, getVideoMetadata, listUserVideos, deleteVideo } from '../services/s3';
import { SignedUploadRequest, SignedUploadResponse } from '../services/s3';

// Request/Response interfaces
export interface VideoUploadRequest {
  fileName: string;
  mimeType: string;
  duration?: number;
  fps?: number;
  angle?: 'front' | 'side' | '3quarter';
}

export interface VideoUploadResponse {
  putUrl: string;
  key: string;
  videoId: string;
  expiresIn: number;
  requestId: string;
}

export interface VideoListResponse {
  videos: Array<{
    key: string;
    size: number;
    lastModified: string;
    videoId: string;
  }>;
  requestId: string;
}

export interface VideoDownloadResponse {
  downloadUrl: string;
  expiresIn: number;
  requestId: string;
}

// POST /videos/signed-url - Generate pre-signed URL for video upload
export const generateVideoUploadUrl = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<VideoUploadResponse> => {
  const { fileName, mimeType, duration, fps, angle } = request.body as VideoUploadRequest;
  const userId = request.user!.uid;
  const requestId = request.headers['x-request-id'] as string;

  // Validate required fields
  if (!fileName || !mimeType) {
    return reply.status(400).send({
      error: {
        message: 'fileName and mimeType are required',
        statusCode: 400,
        requestId,
      },
    });
  }

  // Validate mime type
  const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/3gpp'];
  if (!allowedMimeTypes.includes(mimeType)) {
    return reply.status(400).send({
      error: {
        message: `Unsupported mime type. Allowed types: ${allowedMimeTypes.join(', ')}`,
        statusCode: 400,
        requestId,
      },
    });
  }

  try {
    const uploadRequest: SignedUploadRequest = {
      fileName,
      mimeType,
      userId,
      duration,
      fps,
      angle,
    };

    const result = await generateSignedUploadUrl(uploadRequest);

    // Log the upload request for monitoring
    request.log.info({
      userId,
      videoId: result.videoId,
      fileName,
      mimeType,
      requestId,
    }, 'Video upload URL generated');

    return {
      putUrl: result.putUrl,
      key: result.key,
      videoId: result.videoId,
      expiresIn: result.expiresIn,
      requestId,
    };
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      fileName,
      requestId,
    }, 'Failed to generate video upload URL');

    return reply.status(500).send({
      error: {
        message: 'Failed to generate upload URL',
        statusCode: 500,
        requestId,
      },
    });
  }
};

// GET /videos - List user's videos
export const listVideos = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<VideoListResponse> => {
  const userId = request.user!.uid;
  const requestId = request.headers['x-request-id'] as string;
  const limit = parseInt((request.query as { limit?: string }).limit || '50', 10);

  try {
    const videos = await listUserVideos(userId, limit);

    // Transform the response to include videoId extracted from key
    const transformedVideos = videos.map(video => {
      const keyParts = video.key?.split('/') || [];
      const videoId = keyParts[2] || 'unknown'; // videos/{userId}/{videoId}/...
      
      return {
        key: video.key || '',
        size: video.size,
        lastModified: video.lastModified?.toISOString() || new Date().toISOString(),
        videoId,
      };
    });

    return {
      videos: transformedVideos,
      requestId,
    };
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      requestId,
    }, 'Failed to list videos');

    return reply.status(500).send({
      error: {
        message: 'Failed to list videos',
        statusCode: 500,
        requestId,
      },
    });
  }
};

// GET /videos/:key/download - Generate download URL for a video
export const generateVideoDownloadUrl = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<VideoDownloadResponse> => {
  const { key } = request.params as { key: string };
  const userId = request.user!.uid;
  const requestId = request.headers['x-request-id'] as string;

  // Validate that the key belongs to the user
  if (!key.startsWith(`videos/${userId}/`)) {
    return reply.status(403).send({
      error: {
        message: 'Access denied: Video does not belong to user',
        statusCode: 403,
        requestId,
      },
    });
  }

  try {
    const downloadUrl = await generateSignedDownloadUrl(key, 3600); // 1 hour expiry

    request.log.info({
      userId,
      key,
      requestId,
    }, 'Video download URL generated');

    return {
      downloadUrl,
      expiresIn: 3600,
      requestId,
    };
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      key,
      requestId,
    }, 'Failed to generate video download URL');

    return reply.status(500).send({
      error: {
        message: 'Failed to generate download URL',
        statusCode: 500,
        requestId,
      },
    });
  }
};

// GET /videos/:key/metadata - Get video metadata
export const getVideoInfo = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { key } = request.params as { key: string };
  const userId = request.user!.uid;
  const requestId = request.headers['x-request-id'] as string;

  // Validate that the key belongs to the user
  if (!key.startsWith(`videos/${userId}/`)) {
    return reply.status(403).send({
      error: {
        message: 'Access denied: Video does not belong to user',
        statusCode: 403,
        requestId,
      },
    });
  }

  try {
    const metadata = await getVideoMetadata(key);

    return {
      key,
      size: metadata.size,
      mimeType: metadata.mimeType,
      lastModified: metadata.lastModified?.toISOString(),
      metadata: metadata.metadata,
      requestId,
    };
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      key,
      requestId,
    }, 'Failed to get video metadata');

    return reply.status(500).send({
      error: {
        message: 'Failed to get video metadata',
        statusCode: 500,
        requestId,
      },
    });
  }
};

// DELETE /videos/:key - Delete a video
export const deleteVideoFile = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const { key } = request.params as { key: string };
  const userId = request.user!.uid;
  const requestId = request.headers['x-request-id'] as string;

  // Validate that the key belongs to the user
  if (!key.startsWith(`videos/${userId}/`)) {
    return reply.status(403).send({
      error: {
        message: 'Access denied: Video does not belong to user',
        statusCode: 403,
        requestId,
      },
    });
  }

  try {
    await deleteVideo(key);

    request.log.info({
      userId,
      key,
      requestId,
    }, 'Video deleted successfully');

    return {
      message: 'Video deleted successfully',
      key,
      requestId,
    };
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      key,
      requestId,
    }, 'Failed to delete video');

    return reply.status(500).send({
      error: {
        message: 'Failed to delete video',
        statusCode: 500,
        requestId,
      },
    });
  }
};
