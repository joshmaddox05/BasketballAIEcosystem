import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { admin } from '../services/firebase';
import { generateSignedUploadUrl, generateSignedDownloadUrl } from '../services/storage';

// Validation schemas
const SignedUrlRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().regex(/^video\/(mp4|quicktime|x-msvideo)$/),
  size: z.number().positive().max(500 * 1024 * 1024), // 500MB max
  duration: z.number().positive().optional(),
  fps: z.number().positive().optional(),
  angle: z.enum(['front', 'side', '3quarter']).optional(),
});

const VideoConfirmUploadSchema = z.object({
  videoId: z.string().uuid(),
  duration: z.number().positive().optional(),
  fps: z.number().positive().optional(),
  resolution: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  metadata: z.object({
    shootingAngle: z.enum(['front', 'side', '3quarter']).optional(),
    court: z.string().optional(),
    lighting: z.enum(['indoor', 'outdoor', 'low_light']).optional(),
  }).optional(),
});

type SignedUrlRequest = z.infer<typeof SignedUrlRequestSchema>;
type VideoConfirmUploadRequest = z.infer<typeof VideoConfirmUploadSchema>;

/**
 * POST /videos/signed-url
 * Generate a signed URL for video upload
 */
export const requestSignedUrl = async (
  request: FastifyRequest<{ Body: SignedUrlRequest }>,
  reply: FastifyReply
) => {
  const requestId = request.headers['x-request-id'] as string;
  
  try {
    // Validate request body
    const body = SignedUrlRequestSchema.parse(request.body);
    
    // Ensure user is authenticated
    if (!request.user) {
      return reply.status(401).send({
        error: {
          message: 'Authentication required',
          statusCode: 401,
          requestId,
        },
      });
    }

    const userId = request.user.uid;

    // Generate signed URL
    const { uploadUrl, fileKey, expiresAt } = await generateSignedUploadUrl({
      userId,
      fileName: body.fileName,
      contentType: body.contentType,
      size: body.size,
    });

    // Create video metadata document in Firestore
    const videoId = fileKey.split('/').pop()?.split('.')[0] || '';
    const db = admin.firestore();
    const videoRef = db.collection('videos').doc(videoId);

    await videoRef.set({
      id: videoId,
      userId,
      fileName: fileKey,
      originalName: body.fileName,
      mimeType: body.contentType,
      size: body.size,
      duration: body.duration || 0,
      fps: body.fps || 30,
      storageUrl: fileKey,
      status: 'uploading',
      uploadedAt: admin.firestore.Timestamp.now(),
      metadata: {
        shootingAngle: body.angle || null,
      },
    });

    request.log.info({
      videoId,
      userId,
      fileName: body.fileName,
      size: body.size,
      requestId,
    }, 'Signed URL generated for video upload');

    return reply.status(200).send({
      data: {
        videoId,
        uploadUrl,
        fileKey,
        expiresAt,
      },
      requestId,
    });

  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId,
    }, 'Failed to generate signed URL');

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: {
          message: 'Invalid request data',
          details: error.errors,
          statusCode: 400,
          requestId,
        },
      });
    }

    return reply.status(500).send({
      error: {
        message: error instanceof Error ? error.message : 'Failed to generate signed URL',
        statusCode: 500,
        requestId,
      },
    });
  }
};

/**
 * POST /videos/:videoId/confirm
 * Confirm video upload and update metadata
 */
export const confirmVideoUpload = async (
  request: FastifyRequest<{
    Params: { videoId: string };
    Body: Partial<VideoConfirmUploadRequest>;
  }>,
  reply: FastifyReply
) => {
  const requestId = request.headers['x-request-id'] as string;
  const { videoId } = request.params;

  try {
    if (!request.user) {
      return reply.status(401).send({
        error: {
          message: 'Authentication required',
          statusCode: 401,
          requestId,
        },
      });
    }

    const userId = request.user.uid;
    const db = admin.firestore();
    const videoRef = db.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      return reply.status(404).send({
        error: {
          message: 'Video not found',
          statusCode: 404,
          requestId,
        },
      });
    }

    const videoData = videoDoc.data();
    
    // Verify ownership
    if (videoData?.userId !== userId) {
      return reply.status(403).send({
        error: {
          message: 'Access denied',
          statusCode: 403,
          requestId,
        },
      });
    }

    // Update video metadata
    const updateData: any = {
      status: 'ready',
      processedAt: admin.firestore.Timestamp.now(),
    };

    if (request.body.duration) updateData.duration = request.body.duration;
    if (request.body.fps) updateData.fps = request.body.fps;
    if (request.body.resolution) updateData.resolution = request.body.resolution;
    if (request.body.metadata) {
      updateData.metadata = {
        ...videoData?.metadata,
        ...request.body.metadata,
      };
    }

    await videoRef.update(updateData);

    request.log.info({
      videoId,
      userId,
      requestId,
    }, 'Video upload confirmed');

    return reply.status(200).send({
      data: {
        videoId,
        status: 'ready',
      },
      requestId,
    });

  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      videoId,
      requestId,
    }, 'Failed to confirm video upload');

    return reply.status(500).send({
      error: {
        message: 'Failed to confirm video upload',
        statusCode: 500,
        requestId,
      },
    });
  }
};

/**
 * GET /videos/:videoId
 * Get video details with signed download URL
 */
export const getVideoDetails = async (
  request: FastifyRequest<{ Params: { videoId: string } }>,
  reply: FastifyReply
) => {
  const requestId = request.headers['x-request-id'] as string;
  const { videoId } = request.params;

  try {
    if (!request.user) {
      return reply.status(401).send({
        error: {
          message: 'Authentication required',
          statusCode: 401,
          requestId,
        },
      });
    }

    const userId = request.user.uid;
    const db = admin.firestore();
    const videoRef = db.collection('videos').doc(videoId);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      return reply.status(404).send({
        error: {
          message: 'Video not found',
          statusCode: 404,
          requestId,
        },
      });
    }

    const videoData = videoDoc.data();
    
    // Verify ownership
    if (videoData?.userId !== userId) {
      return reply.status(403).send({
        error: {
          message: 'Access denied',
          statusCode: 403,
          requestId,
        },
      });
    }

    // Generate signed download URL if video is ready
    let downloadUrl = null;
    if (videoData?.status === 'ready' && videoData?.storageUrl) {
      downloadUrl = await generateSignedDownloadUrl(videoData.storageUrl);
    }

    return reply.status(200).send({
      data: {
        ...videoData,
        downloadUrl,
      },
      requestId,
    });

  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      videoId,
      requestId,
    }, 'Failed to get video details');

    return reply.status(500).send({
      error: {
        message: 'Failed to get video details',
        statusCode: 500,
        requestId,
      },
    });
  }
};

/**
 * GET /videos
 * List user's videos
 */
export const listUserVideos = async (
  request: FastifyRequest<{
    Querystring: {
      limit?: string;
      offset?: string;
      status?: string;
    };
  }>,
  reply: FastifyReply
) => {
  const requestId = request.headers['x-request-id'] as string;

  try {
    if (!request.user) {
      return reply.status(401).send({
        error: {
          message: 'Authentication required',
          statusCode: 401,
          requestId,
        },
      });
    }

    const userId = request.user.uid;
    const limit = parseInt(request.query.limit || '10');
    const offset = parseInt(request.query.offset || '0');
    const status = request.query.status;

    const db = admin.firestore();
    let query = db.collection('videos')
      .where('userId', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const videos = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return reply.status(200).send({
      data: {
        videos,
        total: videos.length,
        limit,
        offset,
      },
      requestId,
    });

  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
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
