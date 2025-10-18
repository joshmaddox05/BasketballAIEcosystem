import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import 'dotenv/config';
import { requestIdMiddleware, errorHandler } from './middleware';
import { requireAuth } from './middleware/auth';
import { getHealthStatus } from './routes/health';
import { 
  requestSignedUrl, 
  confirmVideoUpload, 
  getVideoDetails, 
  listUserVideos 
} from './routes/videos';
import { initializeFirebase } from './services/firebase';
import { initializeStorage } from './services/storage';

const server = Fastify({
  logger: true,
  requestIdLogLabel: 'requestId',
  requestIdHeader: 'x-request-id',
});

// Initialize Firebase Admin SDK and Storage
try {
  initializeFirebase();
  initializeStorage();
  server.log.info('Firebase Admin SDK and Storage initialized');
} catch (error) {
  server.log.warn('Firebase initialization failed (may be in test mode)');
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

// ========================================
// VIDEO ROUTES (T-101)
// ========================================

// POST /videos/signed-url - Request signed URL for video upload
server.post<{
  Body: {
    fileName: string;
    contentType: string;
    size: number;
    duration?: number;
    fps?: number;
    angle?: 'front' | 'side' | '3quarter';
  };
}>('/videos/signed-url', {
  preHandler: requireAuth,
  schema: {
    description: 'Generate a signed URL for direct video upload to Firebase Storage',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    body: {
      type: 'object',
      required: ['fileName', 'contentType', 'size'],
      properties: {
        fileName: { type: 'string', minLength: 1, maxLength: 255 },
        contentType: { 
          type: 'string', 
          enum: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
          description: 'Video MIME type'
        },
        size: { 
          type: 'number', 
          minimum: 1, 
          maximum: 524288000,
          description: 'File size in bytes (max 500MB)'
        },
        duration: { type: 'number', minimum: 0, description: 'Video duration in seconds' },
        fps: { type: 'number', minimum: 0, description: 'Frames per second' },
        angle: { 
          type: 'string', 
          enum: ['front', 'side', '3quarter'],
          description: 'Shooting angle'
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              videoId: { type: 'string' },
              uploadUrl: { type: 'string' },
              fileKey: { type: 'string' },
              expiresAt: { type: 'string', format: 'date-time' },
            },
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, requestSignedUrl);

// POST /videos/:videoId/confirm - Confirm video upload completion
server.post<{
  Params: { videoId: string };
  Body: any;
}>('/videos/:videoId/confirm', {
  preHandler: requireAuth,
  schema: {
    description: 'Confirm video upload and update metadata',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        videoId: { type: 'string' },
      },
    },
    body: {
      type: 'object',
      properties: {
        duration: { type: 'number' },
        fps: { type: 'number' },
        resolution: {
          type: 'object',
          properties: {
            width: { type: 'number' },
            height: { type: 'number' },
          },
        },
        metadata: {
          type: 'object',
          properties: {
            shootingAngle: { type: 'string', enum: ['front', 'side', '3quarter'] },
            court: { type: 'string' },
            lighting: { type: 'string', enum: ['indoor', 'outdoor', 'low_light'] },
          },
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              videoId: { type: 'string' },
              status: { type: 'string' },
            },
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, confirmVideoUpload);

// GET /videos/:videoId - Get video details
server.get<{
  Params: { videoId: string };
}>('/videos/:videoId', {
  preHandler: requireAuth,
  schema: {
    description: 'Get video details with signed download URL',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    params: {
      type: 'object',
      properties: {
        videoId: { type: 'string' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            additionalProperties: true,
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, getVideoDetails);

// GET /videos - List user's videos
server.get<{
  Querystring: {
    limit?: string;
    offset?: string;
    status?: string;
  };
}>('/videos', {
  preHandler: requireAuth,
  schema: {
    description: 'List videos for authenticated user',
    tags: ['Videos'],
    security: [{ bearerAuth: [] }],
    querystring: {
      type: 'object',
      properties: {
        limit: { type: 'string', default: '10' },
        offset: { type: 'string', default: '0' },
        status: { 
          type: 'string', 
          enum: ['uploading', 'processing', 'ready', 'failed'],
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              videos: { type: 'array', items: { type: 'object' } },
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' },
            },
          },
          requestId: { type: 'string', format: 'uuid' },
        },
      },
    },
  },
}, listUserVideos);

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

start();
