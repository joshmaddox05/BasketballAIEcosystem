import { FastifyRequest, FastifyReply } from 'fastify';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Request schemas
const SignedUrlRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^video\/(mp4|mov|avi|quicktime)$/),
  fileSize: z.number().min(1).max(500 * 1024 * 1024), // 500MB max
  duration: z.number().optional(),
  fps: z.number().optional(),
  angle: z.enum(['front', 'side', 'overhead']).optional(),
});

const VideoMetadataSchema = z.object({
  videoId: z.string().uuid(),
  userId: z.string(),
  filename: z.string(),
  contentType: z.string(),
  fileSize: z.number(),
  duration: z.number().optional(),
  fps: z.number().optional(),
  angle: z.enum(['front', 'side', 'overhead']).optional(),
  uploadedAt: z.string().datetime(),
});

// Response types
export interface SignedUrlResponse {
  uploadUrl: string;
  videoId: string;
  key: string;
  expiresAt: string;
  requestId: string;
}

export interface VideoMetadata {
  videoId: string;
  userId: string;
  filename: string;
  contentType: string;
  fileSize: number;
  duration?: number;
  fps?: number;
  angle?: 'front' | 'side' | 'overhead';
  uploadedAt: string;
  status: 'uploading' | 'uploaded' | 'processing' | 'processed' | 'failed';
  downloadUrl?: string;
}

/**
 * Generate signed URL for video upload
 * POST /videos/signed-url
 */
export const generateSignedUrl = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.headers['x-request-id'] as string;
  
  try {
    // Validate request body
    const body = SignedUrlRequestSchema.parse(request.body);
    const { filename, contentType, fileSize, duration, fps, angle } = body;
    
    // Get user ID from JWT token (set by auth middleware)
    const userId = (request as any).user?.uid;
    if (!userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Valid Firebase JWT token required',
        requestId,
      });
    }

    // Generate unique video ID and storage key
    const videoId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = filename.split('.').pop() || 'mp4';
    const key = `videos/${userId}/${timestamp}-${videoId}.${fileExtension}`;

    // Get Firebase Storage bucket
    const storage = getStorage();
    const bucket = storage.bucket();
    const file = bucket.file(key);

    // Generate signed URL for upload (expires in 1 hour)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType,
      extensionHeaders: {
        'x-goog-content-length-range': `0,${fileSize}`,
      },
    });

    // Store video metadata in Firestore
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    
    const videoMetadata: VideoMetadata = {
      videoId,
      userId,
      filename,
      contentType,
      fileSize,
      duration,
      fps,
      angle,
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
    };

    await db.collection('videos').doc(videoId).set(videoMetadata);

    const response: SignedUrlResponse = {
      uploadUrl,
      videoId,
      key,
      expiresAt: expiresAt.toISOString(),
      requestId,
    };

    request.log.info({ videoId, userId, filename, fileSize }, 'Generated signed URL for video upload');
    
    reply.status(200).send(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
        requestId,
      });
    }

    request.log.error({ error, requestId }, 'Failed to generate signed URL');
    
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to generate signed URL',
      requestId,
    });
  }
};

/**
 * Confirm video upload completion
 * POST /videos/:videoId/confirm
 */
export const confirmVideoUpload = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.headers['x-request-id'] as string;
  
  try {
    const { videoId } = request.params as { videoId: string };
    
    // Get user ID from JWT token
    const userId = (request as any).user?.uid;
    if (!userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Valid Firebase JWT token required',
        requestId,
      });
    }

    // Get video metadata from Firestore
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const videoDoc = await db.collection('videos').doc(videoId).get();

    if (!videoDoc.exists) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Video not found',
        requestId,
      });
    }

    const videoData = videoDoc.data() as VideoMetadata;

    // Verify ownership
    if (videoData.userId !== userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access denied',
        requestId,
      });
    }

    // Check if file exists in storage
    const storage = getStorage();
    const bucket = storage.bucket();
    const key = `videos/${userId}/${videoId}`;
    
    // Find the file (we need to search since we don't know the exact filename)
    const [files] = await bucket.getFiles({
      prefix: `videos/${userId}/`,
    });
    
    const videoFile = files.find(file => file.name.includes(videoId));
    
    if (!videoFile) {
      return reply.status(400).send({
        error: 'Upload Incomplete',
        message: 'Video file not found in storage',
        requestId,
      });
    }

    // Generate download URL (expires in 7 days)
    const [downloadUrl] = await videoFile.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Update video status to uploaded
    await db.collection('videos').doc(videoId).update({
      status: 'uploaded',
      downloadUrl,
      confirmedAt: new Date().toISOString(),
    });

    request.log.info({ videoId, userId }, 'Video upload confirmed');

    reply.status(200).send({
      message: 'Video upload confirmed',
      videoId,
      status: 'uploaded',
      downloadUrl,
      requestId,
    });
  } catch (error) {
    request.log.error({ error, requestId }, 'Failed to confirm video upload');
    
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to confirm video upload',
      requestId,
    });
  }
};

/**
 * Get video metadata
 * GET /videos/:videoId
 */
export const getVideoMetadata = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.headers['x-request-id'] as string;
  
  try {
    const { videoId } = request.params as { videoId: string };
    
    // Get user ID from JWT token
    const userId = (request as any).user?.uid;
    if (!userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Valid Firebase JWT token required',
        requestId,
      });
    }

    // Get video metadata from Firestore
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    const videoDoc = await db.collection('videos').doc(videoId).get();

    if (!videoDoc.exists) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Video not found',
        requestId,
      });
    }

    const videoData = videoDoc.data() as VideoMetadata;

    // Verify ownership
    if (videoData.userId !== userId) {
      return reply.status(403).send({
        error: 'Forbidden',
        message: 'Access denied',
        requestId,
      });
    }

    reply.status(200).send({
      ...videoData,
      requestId,
    });
  } catch (error) {
    request.log.error({ error, requestId }, 'Failed to get video metadata');
    
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to get video metadata',
      requestId,
    });
  }
};

/**
 * List user's videos
 * GET /videos
 */
export const listUserVideos = async (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.headers['x-request-id'] as string;
  
  try {
    // Get user ID from JWT token
    const userId = (request as any).user?.uid;
    if (!userId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Valid Firebase JWT token required',
        requestId,
      });
    }

    // Parse query parameters
    const query = request.query as {
      limit?: string;
      offset?: string;
      status?: string;
    };
    
    const limit = Math.min(parseInt(query.limit || '20'), 100);
    const offset = parseInt(query.offset || '0');
    const statusFilter = query.status;

    // Get videos from Firestore
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore();
    
    let videosQuery = db.collection('videos')
      .where('userId', '==', userId)
      .orderBy('uploadedAt', 'desc')
      .limit(limit)
      .offset(offset);

    if (statusFilter) {
      videosQuery = videosQuery.where('status', '==', statusFilter);
    }

    const videosSnapshot = await videosQuery.get();
    const videos = videosSnapshot.docs.map(doc => ({
      ...doc.data(),
      videoId: doc.id,
    }));

    reply.status(200).send({
      videos,
      total: videos.length,
      limit,
      offset,
      requestId,
    });
  } catch (error) {
    request.log.error({ error, requestId }, 'Failed to list user videos');
    
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to list user videos',
      requestId,
    });
  }
};