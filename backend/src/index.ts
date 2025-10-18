import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import 'dotenv/config';
import { requestIdMiddleware, errorHandler } from './middleware';
import { requireAuth } from './middleware/auth';
import { validateShotDNAMetrics } from './middleware/shotdnaValidation';
import { getHealthStatus } from './routes/health';
import { getUserProfile, updateUserRole } from './routes/user';
import { 
  generateVideoUploadUrl, 
  listVideos, 
  generateVideoDownloadUrl, 
  getVideoInfo, 
  deleteVideoFile 
} from './routes/video';
import { 
  submitShotMetrics, 
  listShots, 
  getShotAnalysis 
} from './routes/shot';
import { initializeFirebase } from './services/firebase';

const server = Fastify({
  logger: true,
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id',
});

// Initialize Firebase Admin SDK
try {
  initializeFirebase();
  server.log.info('Firebase Admin SDK initialized');
} catch (error) {
  server.log.warn('Firebase Admin SDK initialization failed (may be in test mode)');
}

// Register middleware
server.addHook('onRequest', requestIdMiddleware);
server.setErrorHandler(errorHandler);

// Register plugins
server.register(cors, {
  origin: true,
});

server.register(helmet);

server.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Basketball AI Ecosystem API',
      description: 'API for basketball training app with AI jump-shot analysis, training blueprints, and community features',
      version: '1.0.0',
      contact: {
        name: 'Basketball AI Team',
        email: 'support@basketballai.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api-staging.basketballai.com',
        description: 'Staging server',
      },
      {
        url: 'https://api.basketballai.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase JWT token',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
});

server.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
  uiHooks: {
    onRequest: function (request, reply, next) {
      next();
    },
    preHandler: function (request, reply, next) {
      next();
    },
  },
});

// Health check endpoint
server.get('/healthz', {
  schema: {
    description: 'Health check endpoint for monitoring and load balancers',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok'] },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          uptime: { type: 'number' },
          environment: { type: 'string' },
          memory: {
            type: 'object',
            properties: {
              used: { type: 'number' },
              total: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
      503: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['error'] },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
          uptime: { type: 'number' },
          environment: { type: 'string' },
          memory: {
            type: 'object',
            properties: {
              used: { type: 'number' },
              total: { type: 'number' },
              percentage: { type: 'number' },
            },
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, getHealthStatus);

// Root endpoint
server.get('/', {
  schema: {
    description: 'API information and available endpoints',
    tags: ['Info'],
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          version: { type: 'string' },
          docs: { type: 'string' },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, async (request) => {
  const requestId = request.headers['x-request-id'] as string;
  return { 
    message: 'Basketball AI Ecosystem API',
    version: '1.0.0',
    docs: '/docs',
    requestId,
  };
});

// User routes
server.get('/user/profile', {
  preHandler: [requireAuth],
  schema: {
    description: 'Get user profile information',
    tags: ['User'],
    security: [{ bearerAuth: [] }],
    response: {
      200: {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              uid: { type: 'string' },
              email: { type: 'string' },
              role: { type: 'string' },
              emailVerified: { type: 'boolean' },
              createdAt: { type: 'string' },
            },
          },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, getUserProfile);

server.post('/user/role', {
  preHandler: [requireAuth],
  schema: {
    description: 'Update user role (admin only)',
    tags: ['User'],
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['uid', 'role'],
      properties: {
        uid: { type: 'string' },
        role: { type: 'string', enum: ['free', 'premium', 'admin'] },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          uid: { type: 'string' },
          role: { type: 'string' },
          updatedBy: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, updateUserRole);

// Video routes
server.post('/videos/signed-url', {
  preHandler: [requireAuth],
  schema: {
    description: 'Generate pre-signed URL for video upload',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['fileName', 'mimeType'],
      properties: {
        fileName: { type: 'string' },
        mimeType: { type: 'string' },
        duration: { type: 'number' },
        fps: { type: 'number' },
        angle: { type: 'string', enum: ['front', 'side', '3quarter'] },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          putUrl: { type: 'string' },
          key: { type: 'string' },
          videoId: { type: 'string' },
          expiresIn: { type: 'number' },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, generateVideoUploadUrl);

server.get('/videos', {
  preHandler: [requireAuth],
  schema: {
    description: 'List user videos',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          videos: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string' },
                size: { type: 'number' },
                lastModified: { type: 'string' },
                videoId: { type: 'string' },
              },
            },
          },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, listVideos);

server.get('/videos/:key/download', {
  preHandler: [requireAuth],
  schema: {
    description: 'Generate download URL for a video',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          downloadUrl: { type: 'string' },
          expiresIn: { type: 'number' },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, generateVideoDownloadUrl);

server.get('/videos/:key/metadata', {
  preHandler: [requireAuth],
  schema: {
    description: 'Get video metadata',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          size: { type: 'number' },
          mimeType: { type: 'string' },
          lastModified: { type: 'string' },
          metadata: { type: 'object' },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, getVideoInfo);

server.delete('/videos/:key', {
  preHandler: [requireAuth],
  schema: {
    description: 'Delete a video',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          key: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, deleteVideoFile);

// Shot analysis routes
server.post('/shots/:videoId/metrics', {
  preHandler: [requireAuth, validateShotDNAMetrics],
  schema: {
    description: 'Submit shot analysis metrics for a video',
    tags: ['Shots'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        videoId: { type: 'string' },
      },
    },
    body: {
      type: 'object',
      required: ['release_ms', 'elbow_angle_deg', 'wrist_flick_deg_s', 'arc_proxy_deg', 'consistency_score', 'tips', 'model_version'],
      properties: {
        release_ms: { type: 'number', minimum: 100, maximum: 2000 },
        elbow_angle_deg: { type: 'number', minimum: 0, maximum: 180 },
        wrist_flick_deg_s: { type: 'number', minimum: 0, maximum: 1000 },
        arc_proxy_deg: { type: 'number', minimum: 0, maximum: 90 },
        consistency_score: { type: 'number', minimum: 0, maximum: 1 },
        form_score: { type: 'number', minimum: 0, maximum: 1 },
        timing_score: { type: 'number', minimum: 0, maximum: 1 },
        overall_score: { type: 'number', minimum: 0, maximum: 1 },
        tips: {
          type: 'array',
          items: { type: 'string', minLength: 10, maxLength: 200 },
          minItems: 1,
          maxItems: 5,
        },
        improvements: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['elbow_angle', 'release_timing', 'wrist_flick', 'shooting_arc', 'follow_through', 'balance', 'rhythm']
          },
        },
        model_version: { type: 'string', pattern: '^[a-z0-9.-]+$' },
        analysis_metadata: {
          type: 'object',
          properties: {
            processing_time_ms: { type: 'number', minimum: 0 },
            video_fps: { type: 'number', minimum: 1, maximum: 120 },
            video_duration_ms: { type: 'number', minimum: 0 },
            detection_confidence: { type: 'number', minimum: 0, maximum: 1 },
            shot_type: { type: 'string', enum: ['free_throw', 'mid_range', 'three_pointer', 'layup', 'unknown'] },
            result: { type: 'string', enum: ['make', 'miss', 'unknown'] },
          },
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          shotId: { type: 'string' },
          videoId: { type: 'string' },
          metrics: { type: 'object' },
          processedAt: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, submitShotMetrics);

server.get('/shots', {
  preHandler: [requireAuth],
  schema: {
    description: 'List user shot analyses',
    tags: ['Shots'],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'string' },
        status: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          shots: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                shotId: { type: 'string' },
                videoId: { type: 'string' },
                status: { type: 'string' },
                metrics: { type: 'object' },
                createdAt: { type: 'string' },
                analyzedAt: { type: 'string' },
              },
            },
          },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, listShots);

server.get('/shots/:shotId', {
  preHandler: [requireAuth],
  schema: {
    description: 'Get specific shot analysis',
    tags: ['Shots'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        shotId: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          shotId: { type: 'string' },
          videoId: { type: 'string' },
          status: { type: 'string' },
          metrics: { type: 'object' },
          createdAt: { type: 'string' },
          analyzedAt: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
    },
  },
}, getShotAnalysis);

// Export server for testing
export { server };

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await server.listen({ port, host });
    server.log.info(`🚀 Server ready at http://${host}:${port}`);
    server.log.info(`📚 API docs available at http://${host}:${port}/docs`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  start();
}
