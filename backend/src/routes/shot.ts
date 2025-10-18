import { FastifyRequest, FastifyReply } from 'fastify';
import { ShotDNAMetrics } from '../middleware/shotdnaValidation';

// Request/Response interfaces
export interface ShotMetricsRequest {
  videoId: string;
  metrics: ShotDNAMetrics;
}

export interface ShotMetricsResponse {
  shotId: string;
  videoId: string;
  metrics: ShotDNAMetrics;
  processedAt: string;
  requestId: string;
}

export interface ShotListResponse {
  shots: Array<{
    shotId: string;
    videoId: string;
    status: string;
    metrics?: ShotDNAMetrics;
    createdAt: string;
    analyzedAt?: string;
  }>;
  requestId: string;
}

// POST /shots/:videoId/metrics - Submit shot analysis metrics
export const submitShotMetrics = async (
  request: FastifyRequest<{ Params: { videoId: string }; Body: ShotDNAMetrics }>,
  reply: FastifyReply
): Promise<ShotMetricsResponse> => {
  const { videoId } = request.params;
  const metrics = request.body;
  const userId = request.user!.uid;
  const requestId = request.headers['x-request-id'] as string;

  try {
    // Generate shot ID
    const shotId = `shot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In a real implementation, this would save to database
    // For now, we'll just log and return the data
    request.log.info({
      userId,
      videoId,
      shotId,
      modelVersion: metrics.model_version,
      consistencyScore: metrics.consistency_score,
      requestId,
    }, 'Shot metrics submitted successfully');

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));

    const response: ShotMetricsResponse = {
      shotId,
      videoId,
      metrics,
      processedAt: new Date().toISOString(),
      requestId,
    };

    return response;
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      videoId,
      requestId,
    }, 'Failed to submit shot metrics');

    return reply.status(500).send({
      error: {
        message: 'Failed to submit shot metrics',
        statusCode: 500,
        requestId,
      },
    });
  }
};

// GET /shots - List user's shot analyses
export const listShots = async (
  request: FastifyRequest<{ Querystring: { limit?: string; status?: string } }>,
  reply: FastifyReply
): Promise<ShotListResponse> => {
  const userId = request.user!.uid;
  const requestId = request.headers['x-request-id'] as string;
  const limit = parseInt((request.query as { limit?: string }).limit || '50', 10);
  const status = (request.query as { status?: string }).status;

  try {
    // In a real implementation, this would query the database
    // For now, we'll return mock data
    const mockShots = [
      {
        shotId: 'shot_1234567890_abc123',
        videoId: 'video_1234567890_def456',
        status: 'completed',
        metrics: {
          release_ms: 540,
          elbow_angle_deg: 97.2,
          wrist_flick_deg_s: 480.5,
          arc_proxy_deg: 44.0,
          consistency_score: 0.76,
          form_score: 0.85,
          timing_score: 0.72,
          overall_score: 0.78,
          tips: [
            "Raise elbow to 95–100° range",
            "Earlier release by ~60–100 ms",
            "Hold follow-through for 300 ms"
          ],
          improvements: ["elbow_angle", "release_timing"],
          model_version: "tflite-v0.1.0"
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        analyzedAt: new Date(Date.now() - 86400000 + 5000).toISOString(), // 5 seconds later
      },
      {
        shotId: 'shot_1234567891_xyz789',
        videoId: 'video_1234567891_ghi789',
        status: 'processing',
        createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      }
    ];

    // Filter by status if provided
    const filteredShots = status 
      ? mockShots.filter(shot => shot.status === status)
      : mockShots;

    // Limit results
    const limitedShots = filteredShots.slice(0, limit);

    return {
      shots: limitedShots,
      requestId,
    };
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      requestId,
    }, 'Failed to list shots');

    return reply.status(500).send({
      error: {
        message: 'Failed to list shots',
        statusCode: 500,
        requestId,
      },
    });
  }
};

// GET /shots/:shotId - Get specific shot analysis
export const getShotAnalysis = async (
  request: FastifyRequest<{ Params: { shotId: string } }>,
  reply: FastifyReply
) => {
  const { shotId } = request.params;
  const userId = request.user!.uid;
  const requestId = request.headers['x-request-id'] as string;

  try {
    // In a real implementation, this would query the database
    // For now, we'll return mock data
    const mockShot = {
      shotId,
      videoId: 'video_1234567890_def456',
      status: 'completed',
      metrics: {
        release_ms: 540,
        elbow_angle_deg: 97.2,
        wrist_flick_deg_s: 480.5,
        arc_proxy_deg: 44.0,
        consistency_score: 0.76,
        form_score: 0.85,
        timing_score: 0.72,
        overall_score: 0.78,
        tips: [
          "Raise elbow to 95–100° range",
          "Earlier release by ~60–100 ms",
          "Hold follow-through for 300 ms"
        ],
        improvements: ["elbow_angle", "release_timing"],
        model_version: "tflite-v0.1.0",
        analysis_metadata: {
          processing_time_ms: 1250,
          video_fps: 30,
          video_duration_ms: 2000,
          detection_confidence: 0.92,
          shot_type: "three_pointer",
          result: "make"
        }
      },
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      analyzedAt: new Date(Date.now() - 86400000 + 5000).toISOString(),
    };

    return {
      ...mockShot,
      requestId,
    };
  } catch (error) {
    request.log.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      shotId,
      requestId,
    }, 'Failed to get shot analysis');

    return reply.status(500).send({
      error: {
        message: 'Failed to get shot analysis',
        statusCode: 500,
        requestId,
      },
    });
  }
};
