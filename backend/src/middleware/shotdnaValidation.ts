import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

// ShotDNA Metrics validation schema using Zod
const ShotDNAMetricsSchema = z.object({
  // Required core metrics
  release_ms: z.number().min(100).max(2000),
  elbow_angle_deg: z.number().min(0).max(180),
  wrist_flick_deg_s: z.number().min(0).max(1000),
  arc_proxy_deg: z.number().min(0).max(90),
  consistency_score: z.number().min(0).max(1),
  tips: z.array(z.string().min(10).max(200)).min(1).max(5),
  model_version: z.string().regex(/^[a-z0-9.-]+$/),

  // Optional scores
  form_score: z.number().min(0).max(1).optional(),
  timing_score: z.number().min(0).max(1).optional(),
  overall_score: z.number().min(0).max(1).optional(),

  // Optional improvements array
  improvements: z.array(z.enum([
    'elbow_angle',
    'release_timing',
    'wrist_flick',
    'shooting_arc',
    'follow_through',
    'balance',
    'rhythm'
  ])).optional(),

  // Optional keypoints data
  keypoints: z.array(z.object({
    frame: z.number().int().min(0),
    timestamp: z.number().min(0),
    joints: z.record(z.string(), z.object({
      x: z.number(),
      y: z.number(),
      confidence: z.number().min(0).max(1)
    }))
  })).optional(),

  // Optional trajectory data
  trajectory: z.object({
    points: z.array(z.object({
      x: z.number(),
      y: z.number(),
      timestamp: z.number()
    })),
    peak_height: z.number().min(0).optional(),
    release_angle: z.number().min(0).max(90).optional(),
    entry_angle: z.number().min(0).max(90).optional()
  }).optional(),

  // Optional analysis metadata
  analysis_metadata: z.object({
    processing_time_ms: z.number().min(0).optional(),
    video_fps: z.number().min(1).max(120).optional(),
    video_duration_ms: z.number().min(0).optional(),
    detection_confidence: z.number().min(0).max(1).optional(),
    shot_type: z.enum(['free_throw', 'mid_range', 'three_pointer', 'layup', 'unknown']).optional(),
    result: z.enum(['make', 'miss', 'unknown']).optional()
  }).optional()
});

export type ShotDNAMetrics = z.infer<typeof ShotDNAMetricsSchema>;

// Validation middleware for ShotDNA metrics
export const validateShotDNAMetrics = async (
  request: FastifyRequest<{ Body: ShotDNAMetrics }>,
  reply: FastifyReply
) => {
  try {
    // Validate the request body against the schema
    const validatedData = ShotDNAMetricsSchema.parse(request.body);
    
    // Replace the request body with validated data
    request.body = validatedData;
    
    request.log.info({
      requestId: request.headers['x-request-id'],
      metricsValidated: true,
      modelVersion: validatedData.model_version,
    }, 'ShotDNA metrics validated successfully');
    
  } catch (error) {
    const requestId = request.headers['x-request-id'] as string;
    
    if (error instanceof z.ZodError) {
      const errorDetails = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.received
      }));
      
      request.log.error({
        requestId,
        validationErrors: errorDetails,
      }, 'ShotDNA metrics validation failed');
      
      return reply.status(400).send({
        error: {
          message: 'Invalid ShotDNA metrics format',
          statusCode: 400,
          requestId,
          details: errorDetails,
        },
      });
    }
    
    request.log.error({
      requestId,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    }, 'ShotDNA metrics validation error');
    
    return reply.status(500).send({
      error: {
        message: 'Internal validation error',
        statusCode: 500,
        requestId,
      },
    });
  }
};

// Helper function to validate individual metrics
export const validateIndividualMetric = (
  metric: string,
  value: any
): { valid: boolean; error?: string } => {
  try {
    switch (metric) {
      case 'release_ms':
        if (typeof value !== 'number' || value < 100 || value > 2000) {
          return { valid: false, error: 'Release time must be between 100-2000ms' };
        }
        break;
        
      case 'elbow_angle_deg':
        if (typeof value !== 'number' || value < 0 || value > 180) {
          return { valid: false, error: 'Elbow angle must be between 0-180 degrees' };
        }
        break;
        
      case 'wrist_flick_deg_s':
        if (typeof value !== 'number' || value < 0 || value > 1000) {
          return { valid: false, error: 'Wrist flick must be between 0-1000 deg/s' };
        }
        break;
        
      case 'arc_proxy_deg':
        if (typeof value !== 'number' || value < 0 || value > 90) {
          return { valid: false, error: 'Arc angle must be between 0-90 degrees' };
        }
        break;
        
      case 'consistency_score':
        if (typeof value !== 'number' || value < 0 || value > 1) {
          return { valid: false, error: 'Consistency score must be between 0.0-1.0' };
        }
        break;
        
      case 'tips':
        if (!Array.isArray(value) || value.length < 1 || value.length > 5) {
          return { valid: false, error: 'Tips must be an array with 1-5 items' };
        }
        for (const tip of value) {
          if (typeof tip !== 'string' || tip.length < 10 || tip.length > 200) {
            return { valid: false, error: 'Each tip must be 10-200 characters' };
          }
        }
        break;
        
      case 'model_version':
        if (typeof value !== 'string' || !/^[a-z0-9.-]+$/.test(value)) {
          return { valid: false, error: 'Model version must match pattern: ^[a-z0-9.-]+$' };
        }
        break;
        
      default:
        return { valid: false, error: `Unknown metric: ${metric}` };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Validation error for ${metric}: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
};

// Generate sample ShotDNA metrics for testing
export const generateSampleShotDNA = (): ShotDNAMetrics => {
  return {
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
  };
};
